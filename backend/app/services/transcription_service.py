import os
import uuid
from datetime import datetime
import subprocess
from typing import Dict, List, Optional

import whisper
from pydub import AudioSegment

from app.core.config import settings
from app.db.session import content_collection, transcriptions_collection
from app.services import content_service

# Initialize Whisper model (smaller model for faster processing in dev)
model = whisper.load_model("base")


def get_by_content(content_id: str) -> Optional[dict]:
    """
    Get transcription by content ID.
    """
    return transcriptions_collection.find_one({"content_id": content_id})


def create_transcription(content_id: str, user_id: str) -> None:
    """
    Process an audio file and create a transcription.
    This is meant to be run as a background task.
    """
    # Get content info
    content = content_service.get(id=content_id, user_id=user_id)
    if not content:
        print(f"Content not found: {content_id}")
        return
    
    # Create transcription record
    transcription_id = str(uuid.uuid4())
    transcription = {
        "id": transcription_id,
        "content_id": content_id,
        "status": "processing",
        "created_at": datetime.utcnow(),
    }
    
    # Save initial record
    transcriptions_collection.insert_one(transcription)
    
    try:
        # Get the file path
        file_path = content["file_path"]
        
        # Convert to wav if needed (Whisper works best with WAV)
        audio_path = file_path
        if not file_path.lower().endswith('.wav'):
            # Convert to WAV using pydub
            audio = AudioSegment.from_file(file_path)
            wav_path = f"{os.path.splitext(file_path)[0]}.wav"
            audio.export(wav_path, format="wav")
            audio_path = wav_path
        
        # Process with Whisper
        result = model.transcribe(audio_path)
        
        # Format segments
        segments = []
        for segment in result["segments"]:
            segments.append({
                "start": segment["start"],
                "end": segment["end"],
                "text": segment["text"]
            })
        
        # Update transcription record
        transcriptions_collection.update_one(
            {"id": transcription_id},
            {
                "$set": {
                    "status": "completed",
                    "text": result["text"],
                    "segments": segments,
                    "updated_at": datetime.utcnow()
                }
            }
        )
        
        # Update content record
        content_collection.update_one(
            {"id": content_id},
            {"$set": {"processed": True}}
        )
        
        # Clean up temporary WAV file if created
        if audio_path != file_path and os.path.exists(audio_path):
            os.remove(audio_path)
            
    except Exception as e:
        # Update transcription record with error
        transcriptions_collection.update_one(
            {"id": transcription_id},
            {
                "$set": {
                    "status": "failed",
                    "error": str(e),
                    "updated_at": datetime.utcnow()
                }
            }
        )
        print(f"Transcription error: {e}")
        
        
def delete_transcription(content_id: str) -> bool:
    """
    Delete a transcription.
    """
    result = transcriptions_collection.delete_one({"content_id": content_id})
    return result.deleted_count > 0 