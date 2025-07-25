import uuid
import os
from datetime import datetime
from typing import Dict, List, Optional

import openai
import PyPDF2

from app.core.config import settings
from app.db.session import (
    content_collection,
    generated_content_collection,
    transcriptions_collection,
)
from app.services import content_service

# Configure OpenAI API
openai.api_key = settings.OPENAI_API_KEY


def get_generated_content(content_id: str) -> List[dict]:
    """
    Get all generated content for a specific content.
    """
    return list(generated_content_collection.find({"content_id": content_id}))


def get_specific_generated_content(content_id: str, generation_type: str) -> Optional[dict]:
    """
    Get specific generated content for a content.
    """
    return generated_content_collection.find_one(
        {"content_id": content_id, "type": generation_type}
    )


async def start_generation(
    content_id: str, user_id: str, generation_type: str
) -> None:
    """
    Generate AI content based on a transcription or document.
    This is meant to be run as a background task.
    """
    # Get content
    content = content_service.get(id=content_id, user_id=user_id)
    if not content:
        print(f"Content not found: {content_id}")
        return

    # Create generation record
    generation_id = str(uuid.uuid4())
    generation = {
        "id": generation_id,
        "content_id": content_id,
        "type": generation_type,
        "status": "processing",
        "created_at": datetime.utcnow(),
    }

    # Save initial record
    generated_content_collection.insert_one(generation)

    try:
        # Get content text
        content_text = ""
        if content["content_type"] in ["audio", "video"]:
            # Get transcription
            transcription = transcriptions_collection.find_one({"content_id": content_id})
            if transcription and transcription.get("text"):
                content_text = transcription["text"]
            else:
                raise ValueError("No transcription available")
        elif content["content_type"] in ["pdf", "document", "text"]:
            # Extract text from PDF
            file_path = content["file_path"]
            if file_path.lower().endswith('.pdf'):
                try:
                    with open(file_path, 'rb') as file:
                        reader = PyPDF2.PdfReader(file)
                        content_text = ""
                        for page_num in range(len(reader.pages)):
                            page = reader.pages[page_num]
                            content_text += page.extract_text() + "\n\n"
                    
                    if not content_text.strip():
                        content_text = "The PDF appears to be empty or contains no extractable text."
                except Exception as e:
                    print(f"Error extracting text from PDF: {e}")
                    content_text = f"Error extracting PDF content: {str(e)}"
            else:
                # For other document types, we would need different extractors
                content_text = "This document type is not fully supported yet. This is sample text for demonstration."
        else:
            raise ValueError(f"Unsupported content type: {content['content_type']}")

        # Generate based on type
        if generation_type == "summary":
            result = await generate_summary(content_text)
            update_data = {"summary": result}
        elif generation_type == "flashcards":
            result = await generate_flashcards(content_text)
            update_data = {"flashcards": result}
        elif generation_type == "quiz":
            result = await generate_quiz(content_text)
            update_data = {"quiz": result}
        elif generation_type == "mindmap":
            result = await generate_mindmap(content_text)
            update_data = {"mindmap": result}
        else:
            raise ValueError(f"Invalid generation type: {generation_type}")

        # Update record
        generated_content_collection.update_one(
            {"id": generation_id},
            {
                "$set": {
                    "status": "completed",
                    **update_data,
                    "updated_at": datetime.utcnow(),
                }
            },
        )
        
        # Update content processed flag
        content_collection.update_one(
            {"id": content_id},
            {"$set": {"processed": True}}
        )

    except Exception as e:
        # Update record with error
        generated_content_collection.update_one(
            {"id": generation_id},
            {
                "$set": {
                    "status": "failed",
                    "error": str(e),
                    "updated_at": datetime.utcnow(),
                }
            },
        )
        print(f"Generation error: {e}")


async def generate_summary(text: str) -> str:
    """
    Generate a summary from text using OpenAI API.
    """
    # Check if text is too large (>7000 tokens estimated)
    if len(text) > 28000:  # Rough estimate: 4 chars per token
        print(f"Text is too large ({len(text)} chars), chunking...")
        # Split into chunks of approximately 7000 tokens
        max_chunk_size = 28000
        chunks = [text[i:i+max_chunk_size] for i in range(0, len(text), max_chunk_size)]
        
        # Generate summary for each chunk
        chunk_summaries = []
        for i, chunk in enumerate(chunks):
            try:
                chunk_prompt = f"This is part {i+1} of {len(chunks)} of a document. Summarize this section concisely:"
                response = openai.ChatCompletion.create(
                    model="gpt-4",
                    messages=[
                        {"role": "system", "content": "You are a helpful educational assistant."},
                        {"role": "user", "content": f"{chunk_prompt}\n\n{chunk}"},
                    ],
                    max_tokens=500,
                    temperature=0.5,
                )
                chunk_summaries.append(response.choices[0].message.content)
            except Exception as e:
                print(f"Error summarizing chunk {i+1}: {e}")
                chunk_summaries.append(f"[Error summarizing part {i+1}]")
        
        # Combine the summaries
        combined_text = "\n\n".join(chunk_summaries)
        
        # Generate final summary from the combined chunk summaries
        try:
            response = openai.ChatCompletion.create(
                model="gpt-4",
                messages=[
                    {"role": "system", "content": "You are a helpful educational assistant."},
                    {"role": "user", "content": f"Below are summaries of different parts of a document. Create a coherent overall summary that captures the main points from all sections:\n\n{combined_text}"},
                ],
                max_tokens=1000,
                temperature=0.5,
            )
            return response.choices[0].message.content
        except Exception as e:
            print(f"Error creating final summary: {e}")
            return combined_text
    else:
        # Original logic for smaller texts
        response = openai.ChatCompletion.create(
            model="gpt-4",
            messages=[
                {"role": "system", "content": "You are a helpful educational assistant."},
                {
                    "role": "user",
                    "content": f"Summarize the following document in a clear, concise way that captures the main points:\n\n{text}",
                },
            ],
            max_tokens=1000,
            temperature=0.5,
        )
        return response.choices[0].message.content


async def generate_flashcards(text: str) -> List[Dict[str, str]]:
    """
    Generate flashcards from text using OpenAI API.
    """
    # Check if text is too large (>7000 tokens estimated)
    if len(text) > 28000:  # Rough estimate: 4 chars per token
        print(f"Text is too large ({len(text)} chars), chunking for flashcards...")
        # Split into chunks of approximately 7000 tokens
        max_chunk_size = 28000
        chunks = [text[i:i+max_chunk_size] for i in range(0, len(text), max_chunk_size)]
        
        # Generate flashcards for each chunk (fewer cards per chunk)
        all_flashcards = []
        cards_per_chunk = max(2, int(10 / len(chunks)))
        
        for i, chunk in enumerate(chunks):
            try:
                response = openai.ChatCompletion.create(
                    model="gpt-4",
                    messages=[
                        {"role": "system", "content": "You are a helpful educational assistant."},
                        {
                            "role": "user",
                            "content": f"This is part {i+1} of {len(chunks)} of a document. Create {cards_per_chunk} flashcards with question and answer pairs that cover the most important concepts. Format as a JSON array of objects with 'question' and 'answer' fields.\n\n{chunk}",
                        },
                    ],
                    max_tokens=1000,
                    temperature=0.5,
                )
                
                # Extract JSON from response
                content = response.choices[0].message.content
                start = content.find("[")
                end = content.rfind("]") + 1
                
                if start >= 0 and end > start:
                    json_str = content[start:end]
                    import json
                    chunk_cards = json.loads(json_str)
                    all_flashcards.extend(chunk_cards)
            except Exception as e:
                print(f"Error generating flashcards for chunk {i+1}: {e}")
                all_flashcards.append({"question": f"[Error processing part {i+1}]", "answer": "Please try again or split the document."})
        
        return all_flashcards[:10]  # Return at most 10 cards
    else:
        # Original logic for smaller texts
        response = openai.ChatCompletion.create(
            model="gpt-4",
            messages=[
                {"role": "system", "content": "You are a helpful educational assistant."},
                {
                    "role": "user",
                    "content": f"Based on the following document, create 10 flashcards with question and answer pairs that cover the most important concepts. Format as a JSON array of objects with 'question' and 'answer' fields.\n\n{text}",
                },
            ],
            max_tokens=1500,
            temperature=0.5,
        )
        
        # Parse JSON from response
        import json
        try:
            # Extract just the JSON part from the response
            content = response.choices[0].message.content
            # Find JSON array start and end
            start = content.find("[")
            end = content.rfind("]") + 1
            
            if start >= 0 and end > start:
                json_str = content[start:end]
                result = json.loads(json_str)
                return result
            else:
                # Fallback if JSON parsing fails
                return [{"question": "What is this?", "answer": "A sample flashcard"}]
        except Exception as e:
            print(f"Error parsing flashcards: {e}")
            return [{"question": "What is this?", "answer": "A sample flashcard"}]


async def generate_quiz(text: str) -> List[Dict]:
    """
    Generate a quiz from text using OpenAI API.
    """
    # Check if text is too large (>7000 tokens estimated)
    if len(text) > 28000:  # Rough estimate: 4 chars per token
        print(f"Text is too large ({len(text)} chars), chunking for quiz...")
        # Split into chunks of approximately 7000 tokens
        max_chunk_size = 28000
        chunks = [text[i:i+max_chunk_size] for i in range(0, len(text), max_chunk_size)]
        
        # Generate quiz questions for each chunk (fewer questions per chunk)
        all_questions = []
        questions_per_chunk = max(1, int(5 / len(chunks)))
        
        for i, chunk in enumerate(chunks):
            try:
                response = openai.ChatCompletion.create(
                    model="gpt-4",
                    messages=[
                        {"role": "system", "content": "You are a helpful educational assistant."},
                        {
                            "role": "user",
                            "content": f"This is part {i+1} of {len(chunks)} of a document. Create {questions_per_chunk} multiple-choice quiz questions with 4 options each. Format as a JSON array of objects with 'question', 'options' (array of 4 strings), 'correct_option' (integer 0-3), and 'explanation' fields.\n\n{chunk}",
                        },
                    ],
                    max_tokens=1000,
                    temperature=0.5,
                )
                
                # Extract JSON from response
                content = response.choices[0].message.content
                start = content.find("[")
                end = content.rfind("]") + 1
                
                if start >= 0 and end > start:
                    json_str = content[start:end]
                    import json
                    chunk_questions = json.loads(json_str)
                    all_questions.extend(chunk_questions)
            except Exception as e:
                print(f"Error generating quiz for chunk {i+1}: {e}")
                all_questions.append({
                    "question": f"[Error processing part {i+1}]", 
                    "options": ["Error", "Could not process", "Document too large", "Try again"],
                    "correct_option": 0,
                    "explanation": "There was an error processing this section of the document."
                })
        
        return all_questions[:5]  # Return at most 5 questions
    else:
        # Original logic for smaller texts
        response = openai.ChatCompletion.create(
            model="gpt-4",
            messages=[
                {"role": "system", "content": "You are a helpful educational assistant."},
                {
                    "role": "user",
                    "content": f"Based on the following document, create 5 multiple-choice quiz questions with 4 options each. Format as a JSON array of objects with 'question', 'options' (array of 4 strings), 'correct_option' (integer 0-3), and 'explanation' fields.\n\n{text}",
                },
            ],
            max_tokens=1500,
            temperature=0.5,
        )
        
        # Parse JSON from response
        import json
        try:
            # Extract just the JSON part from the response
            content = response.choices[0].message.content
            # Find JSON array start and end
            start = content.find("[")
            end = content.rfind("]") + 1
            
            if start >= 0 and end > start:
                json_str = content[start:end]
                result = json.loads(json_str)
                return result
            else:
                # Fallback if JSON parsing fails
                return [{
                    "question": "What is this?", 
                    "options": ["A quiz", "A test", "An exam", "A survey"],
                    "correct_option": 0,
                    "explanation": "This is a sample quiz question."
                }]
        except Exception as e:
            print(f"Error parsing quiz: {e}")
            return [{
                "question": "What is this?", 
                "options": ["A quiz", "A test", "An exam", "A survey"],
                "correct_option": 0,
                "explanation": "This is a sample quiz question."
            }]


async def generate_mindmap(text: str) -> Dict:
    """
    Generate a mind map from text using OpenAI API.
    """
    # Check if text is too large (>7000 tokens estimated)
    if len(text) > 28000:  # Rough estimate: 4 chars per token
        print(f"Text is too large ({len(text)} chars), generating simplified mindmap...")
        # For mindmap, use first 10000 characters and last 10000 characters
        shortened_text = text[:10000] + "\n\n[...]\n\n" + text[-10000:]
        
        try:
            response = openai.ChatCompletion.create(
                model="gpt-4",
                messages=[
                    {"role": "system", "content": "You are a helpful educational assistant."},
                    {
                        "role": "user",
                        "content": f"This is a partial view of a very large document (beginning and end sections only). Create a simple hierarchical mind map showing the main concepts visible. Format as a JSON object where each node has an 'id', 'label', and 'children' array of other node IDs. The root node should have id 'root'.\n\n{shortened_text}",
                    },
                ],
                max_tokens=1500,
                temperature=0.5,
            )
            
            # Extract JSON from response
            content = response.choices[0].message.content
            start = content.find("{")
            end = content.rfind("}") + 1
            
            if start >= 0 and end > start:
                json_str = content[start:end]
                import json
                return json.loads(json_str)
            else:
                return {
                    "root": {"id": "root", "label": "Document Overview (Partial)", "children": ["1", "2"]},
                    "1": {"id": "1", "label": "Beginning Section", "children": []},
                    "2": {"id": "2", "label": "Ending Section", "children": []}
                }
        except Exception as e:
            print(f"Error generating mindmap for large document: {e}")
            return {
                "root": {"id": "root", "label": "Error Processing Document", "children": ["1"]},
                "1": {"id": "1", "label": "Document too large to process", "children": []}
            }
    else:
        # Original logic for smaller texts
        response = openai.ChatCompletion.create(
            model="gpt-4",
            messages=[
                {"role": "system", "content": "You are a helpful educational assistant."},
                {
                    "role": "user",
                    "content": f"Based on the following document, create a hierarchical mind map showing the main concepts and their relationships. Format as a JSON object where each node has an 'id', 'label', and 'children' array of other node IDs. The root node should have id 'root'.\n\n{text}",
                },
            ],
            max_tokens=1500,
            temperature=0.5,
        )
        
        # Parse JSON from response
        import json
        try:
            # Extract just the JSON part from the response
            content = response.choices[0].message.content
            # Find JSON object start and end
            start = content.find("{")
            end = content.rfind("}") + 1
            
            if start >= 0 and end > start:
                json_str = content[start:end]
                result = json.loads(json_str)
                return result
            else:
                # Fallback if JSON parsing fails
                return {
                    "root": {"id": "root", "label": "Main Topic", "children": ["1", "2"]},
                    "1": {"id": "1", "label": "Subtopic 1", "children": []},
                    "2": {"id": "2", "label": "Subtopic 2", "children": []}
                }
        except Exception as e:
            print(f"Error parsing mindmap: {e}")
            return {
                "root": {"id": "root", "label": "Main Topic", "children": ["1", "2"]},
                "1": {"id": "1", "label": "Subtopic 1", "children": []},
                "2": {"id": "2", "label": "Subtopic 2", "children": []}
            } 