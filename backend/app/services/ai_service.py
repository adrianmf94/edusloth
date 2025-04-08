import uuid
import os
import tempfile
from datetime import datetime
from typing import Dict, List, Optional, Any
import json

import PyPDF2
import boto3
from google import genai
from google.genai import types as genai_types

from app.core.config import settings
from app.db.session import (
    content_collection,
    generated_content_collection,
    transcriptions_collection,
)
from app.services import content_service

# Create the Gemini client
gemini_client = genai.Client(api_key=settings.GOOGLE_API_KEY)

# Create S3 client
s3_client = boto3.client(
    "s3",
    aws_access_key_id=settings.AWS_ACCESS_KEY_ID,
    aws_secret_access_key=settings.AWS_SECRET_ACCESS_KEY,
    region_name=settings.AWS_REGION,
)


def get_generated_content(content_id: str) -> List[dict]:
    """
    Get all generated content for a specific content.
    """
    return list(generated_content_collection.find({"content_id": content_id}))


def get_specific_generated_content(
    content_id: str, generation_type: str
) -> Optional[dict]:
    """
    Get specific generated content for a content.
    """
    result = generated_content_collection.find_one(
        {"content_id": content_id, "type": generation_type}
    )
    return dict(result) if result else None


async def start_generation(content_id: str, user_id: str, generation_type: str) -> None:
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
        # Initialize content_text for non-PDF content
        content_text = ""

        # Check content type
        if content["content_type"] in ["audio", "video"]:
            # Get transcription from audio/video
            transcription = transcriptions_collection.find_one(
                {"content_id": content_id}
            )
            if transcription and transcription.get("text"):
                content_text = transcription["text"]
            else:
                raise ValueError("No transcription available")

        elif content["content_type"] in ["pdf", "document", "text"]:
            # Get file path
            file_path = content.get("file_path")

            if not file_path:
                raise ValueError("No file path found in content record")

            print(f"Processing file: {file_path}")

            # For PDFs, we'll use Gemini's native PDF processing
            if content["content_type"] == "pdf" or file_path.lower().endswith(".pdf"):
                # The processing will be done in the generate_* functions
                # Just download the file from S3 if needed and keep the file path
                if file_path.startswith("s3://"):
                    print(f"Retrieving file from S3: {file_path}")
                    try:
                        # Extract bucket and key from the S3 path
                        s3_path = file_path.replace("s3://", "")
                        bucket_name, s3_key = s3_path.split("/", 1)

                        # Validate S3 credentials
                        if (
                            not settings.AWS_ACCESS_KEY_ID
                            or not settings.AWS_SECRET_ACCESS_KEY
                        ):
                            raise ValueError(
                                "AWS credentials are not properly configured"
                            )

                        # Check if the object exists in S3
                        try:
                            s3_client.head_object(Bucket=bucket_name, Key=s3_key)
                        except Exception as head_err:
                            raise ValueError(
                                f"S3 object does not exist or is not accessible: {str(head_err)}"
                            )

                        # Create a temporary file to download the PDF
                        with tempfile.NamedTemporaryFile(
                            delete=False, suffix=".pdf"
                        ) as temp_file:
                            temp_path = temp_file.name

                        # Download file from S3
                        print(
                            f"Downloading from S3 bucket {bucket_name}, key: {s3_key} to {temp_path}"
                        )
                        s3_client.download_file(bucket_name, s3_key, temp_path)

                        # Verify the download was successful by checking file size
                        file_size = os.path.getsize(temp_path)
                        if file_size == 0:
                            raise ValueError("Downloaded file is empty (0 bytes)")
                        print(f"Successfully downloaded PDF of size: {file_size} bytes")

                        # Use the temporary file path for further processing
                        file_path = temp_path
                    except Exception as s3_err:
                        error_msg = f"Error retrieving file from S3: {str(s3_err)}"
                        print(error_msg)
                        raise ValueError(error_msg)
                elif not os.path.exists(file_path):
                    raise ValueError(f"Local file not found: {file_path}")

                # For PDFs, we'll just keep the file path and pass it to the generation functions
                # No need to extract text here - we'll pass the PDF directly to Gemini
                content_text = file_path  # Store the file path as content_text for PDFs
            else:
                # For non-PDF documents, use text extraction
                if file_path.startswith("s3://"):
                    print(f"Retrieving file from S3: {file_path}")
                    try:
                        # Extract bucket and key from the S3 path
                        s3_path = file_path.replace("s3://", "")
                        bucket_name, s3_key = s3_path.split("/", 1)

                        # Validate S3 credentials
                        if (
                            not settings.AWS_ACCESS_KEY_ID
                            or not settings.AWS_SECRET_ACCESS_KEY
                        ):
                            raise ValueError(
                                "AWS credentials are not properly configured"
                            )

                        # Create a temporary file to download
                        with tempfile.NamedTemporaryFile(
                            delete=False, suffix=os.path.splitext(file_path)[1]
                        ) as temp_file:
                            temp_path = temp_file.name

                        # Download file from S3
                        print(
                            f"Downloading from S3 bucket {bucket_name}, key: {s3_key} to {temp_path}"
                        )
                        s3_client.download_file(bucket_name, s3_key, temp_path)

                        # Use the temporary file path for further processing
                        file_path = temp_path
                    except Exception as s3_err:
                        error_msg = f"Error retrieving file from S3: {str(s3_err)}"
                        print(error_msg)
                        raise ValueError(error_msg)

                # For text files
                try:
                    print(f"Attempting to read text from: {file_path}")
                    with open(
                        file_path, "r", encoding="utf-8", errors="replace"
                    ) as file:
                        content_text = file.read()
                        print(
                            f"Successfully read {len(content_text)} characters from file"
                        )
                except Exception as txt_err:
                    error_msg = f"Error reading text file: {str(txt_err)}"
                    print(error_msg)
                    content_text = f"This document type is not fully supported yet. Error: {str(txt_err)}"
                finally:
                    # Clean up the temporary file if it was created from S3
                    if file_path.startswith(tempfile.gettempdir()):
                        try:
                            os.unlink(file_path)
                        except Exception as cleanup_err:
                            print(
                                f"Warning: Failed to delete temporary file {file_path}: {cleanup_err}"
                            )
        else:
            raise ValueError(f"Unsupported content type: {content['content_type']}")

        # For text content, check if we have meaningful text
        if not isinstance(content_text, str) or (
            not content_text.startswith(
                tempfile.gettempdir()
            )  # Skip check for PDF file paths
            and (not content_text or len(content_text.strip()) < 10)
        ):
            error_msg = "Could not extract meaningful content from the file."
            print(error_msg)
            raise ValueError(error_msg)

        if isinstance(content_text, str) and not content_text.startswith(
            tempfile.gettempdir()
        ):
            print(f"Extracted content length: {len(content_text)} characters")

        # Define update_data with type hint
        update_data: Dict[str, Any] = {}

        # Generate based on type
        if generation_type == "summary":
            result_summary: str = await generate_summary(
                content_text, content["content_type"]
            )
            update_data = {"summary": result_summary}
        elif generation_type == "flashcards":
            result_flashcards: List[Dict[str, str]] = await generate_flashcards(
                content_text, content["content_type"]
            )
            update_data = {"flashcards": result_flashcards}
        elif generation_type == "quiz":
            result_quiz: List[Dict[str, Any]] = await generate_quiz(
                content_text, content["content_type"]
            )
            update_data = {"quiz": result_quiz}
        elif generation_type == "mindmap":
            result_mindmap: Dict[str, Any] = await generate_mindmap(
                content_text, content["content_type"]
            )
            update_data = {"mindmap": result_mindmap}
        else:
            raise ValueError(f"Invalid generation type: {generation_type}")

        # Clean up any temporary PDF file
        if (
            isinstance(content_text, str)
            and content_text.startswith(tempfile.gettempdir())
            and os.path.exists(content_text)
        ):
            try:
                os.unlink(content_text)
                print(f"Cleaned up temporary file: {content_text}")
            except Exception as cleanup_err:
                print(
                    f"Warning: Failed to delete temporary file {content_text}: {cleanup_err}"
                )

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
        content_collection.update_one({"id": content_id}, {"$set": {"processed": True}})

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


async def generate_summary(text: str, content_type: str) -> str:
    """
    Generate a summary from text or PDF document using Gemini API.
    Leverages the large context window of Gemini to process text
    and uses native PDF processing for PDF documents.
    """
    # Define the model name once to use consistently
    model_name = "gemini-2.0-flash"

    # Check if we're processing a PDF file
    is_pdf = content_type == "pdf" or (
        isinstance(text, str) and text.lower().endswith(".pdf")
    )

    # Debug logging
    if is_pdf:
        print(f"Processing PDF file: {text}")
        if not os.path.exists(text):
            return "Sorry, I couldn't generate a summary because the PDF file could not be found."
        file_size = os.path.getsize(text)
        print(f"PDF file size: {file_size} bytes")
    else:
        print(f"Processing text content of length: {len(text)}")
        if len(text) < 100:
            print(f"Warning: Text is very short. Content: {text}")

        # Check if content is empty or just error messages
        if (
            not text
            or text.strip() == ""
            or (
                len(text) < 100
                and ("Error extracting" in text or "not fully supported" in text)
            )
        ):
            return "Sorry, I couldn't generate a summary because the document appears to be empty or couldn't be processed correctly. Please check the file and try again."

    system_instruction = (
        "You are a helpful educational assistant that creates clear, concise summaries."
    )
    user_prompt = (
        "Summarize this document in a clear, concise way that captures the main points."
    )

    try:
        if is_pdf:
            # Process PDF directly using Gemini's native PDF handling
            try:
                # Read the PDF file as bytes
                with open(text, "rb") as pdf_file:
                    pdf_data = pdf_file.read()

                print(f"Successfully read PDF file with {len(pdf_data)} bytes")

                # Create content parts with PDF data using the proper MIME type
                contents = [
                    genai_types.Part.from_bytes(
                        data=pdf_data, mime_type="application/pdf"
                    ),
                    user_prompt,
                ]

                # Generate content with the PDF
                print("Sending PDF to Gemini for summarization")
                response = gemini_client.models.generate_content(
                    model=model_name,
                    contents=contents,
                    config={"temperature": 0.3, "max_output_tokens": 1024},
                )

                print("Received summary from Gemini")
                return str(response.text)
            except Exception as pdf_err:
                print(f"Error processing PDF with Gemini: {str(pdf_err)}")
                return f"Error processing PDF: {str(pdf_err)}"
        else:
            # Process regular text content
            # Estimate token count (rough approximation: ~4 chars per token)
            estimated_tokens = len(text) // 4
            print(f"Estimated token count: {estimated_tokens}")

            # If document is likely to fit within Gemini's context window
            if estimated_tokens < 900000:  # Using 900k as a safe margin
                print("Using Gemini for direct summarization (single context)")

                try:
                    # Create a structured message with the system instruction and content
                    prompt = f"{system_instruction}\n\n{user_prompt}"

                    # Create a proper Part object for the text content
                    contents = [prompt, genai_types.Part.from_text(text)]

                    # Use the direct generation method
                    print("Sending content to Gemini for summarization")
                    response = gemini_client.models.generate_content(
                        model=model_name,
                        contents=contents,
                        config={"temperature": 0.3, "max_output_tokens": 1024},
                    )

                    print("Received summary from Gemini")
                    return str(response.text)
                except Exception as gen_err:
                    print(f"Error with Gemini generation: {str(gen_err)}")

                    # Try the simple approach if the structured approach fails
                    try:
                        print("Trying simple single message approach with Gemini")
                        simple_prompt = (
                            f"{system_instruction}\n\n{user_prompt}\n\n{text}"
                        )
                        response = gemini_client.models.generate_content(
                            model=model_name,
                            contents=simple_prompt,
                            config={"temperature": 0.3, "max_output_tokens": 1024},
                        )
                        return str(response.text)
                    except Exception as simple_err:
                        print(f"Error with simple approach: {str(simple_err)}")
                        return f"Error generating summary: {str(simple_err)}"
            else:
                # For extremely large documents, we'll fall back to a chunking approach
                print(
                    f"Text is extremely large ({estimated_tokens} estimated tokens), chunking..."
                )

                # Split into 500k token chunks (within Gemini's context window)
                max_chunk_size = 2000000  # ~500k tokens at 4 chars per token
                chunks = [
                    text[i : i + max_chunk_size]
                    for i in range(0, len(text), max_chunk_size)
                ]

                # Generate summary for each chunk
                chunk_summaries = []
                for i, chunk in enumerate(chunks):
                    try:
                        chunk_prompt = f"{system_instruction}\n\nThis is part {i+1} of {len(chunks)} of a document. {user_prompt}"

                        # Create structured content
                        contents = [chunk_prompt, genai_types.Part.from_text(chunk)]

                        # Generate content for this chunk
                        response = gemini_client.models.generate_content(
                            model=model_name,
                            contents=contents,
                            config={"temperature": 0.3, "max_output_tokens": 1024},
                        )

                        chunk_summaries.append(response.text)
                    except Exception as e:
                        print(f"Error summarizing chunk {i+1}: {e}")
                        chunk_summaries.append(f"[Error summarizing part {i+1}]")

                # Combine the summaries
                combined_text = "\n\n".join(chunk_summaries)

                # Generate final summary from the combined chunk summaries
                if len(chunks) > 1:
                    try:
                        final_prompt = f"{system_instruction}\n\nBelow are summaries of different parts of a document. Create a coherent overall summary that captures the main points from all sections:"

                        # Create structured content
                        contents = [
                            final_prompt,
                            genai_types.Part.from_text(combined_text),
                        ]

                        # Generate the final summary
                        response = gemini_client.models.generate_content(
                            model=model_name,
                            contents=contents,
                            config={"temperature": 0.3, "max_output_tokens": 1024},
                        )

                        return str(response.text)
                    except Exception as e:
                        print(f"Error creating final summary: {e}")
                        return combined_text
                else:
                    return combined_text

    except Exception as e:
        print(f"Error using Gemini API: {e}")
        return f"Error generating summary: {str(e)}"


async def generate_flashcards(text: str, content_type: str) -> List[Dict[str, str]]:
    """
    Generate flashcards from text or PDF document using Gemini API.
    """
    # Define the model name once to use consistently
    model_name = "gemini-2.0-flash"

    # Check if we're processing a PDF file
    is_pdf = content_type == "pdf" or (
        isinstance(text, str) and text.lower().endswith(".pdf")
    )

    # Debug logging
    if is_pdf:
        print(f"Processing PDF file for flashcards: {text}")
        if not os.path.exists(text):
            return [{"question": "Error", "answer": "The PDF file could not be found."}]
    else:
        print(f"Processing text content for flashcards, length: {len(text)}")
        if not text or text.strip() == "":
            return [
                {"question": "Error", "answer": "The document appears to be empty."}
            ]

    system_instruction = (
        "You are a helpful educational assistant that creates effective flashcards."
    )
    user_prompt = "Create 10 flashcards with question and answer pairs that cover the most important concepts from this document. Format your response as a JSON array of objects with 'question' and 'answer' fields. Each question should be clear and specific, and each answer should be concise but informative."

    try:
        if is_pdf:
            # Process PDF directly using Gemini's native PDF handling
            try:
                # Read the PDF file as bytes
                with open(text, "rb") as pdf_file:
                    pdf_data = pdf_file.read()

                print(f"Successfully read PDF file with {len(pdf_data)} bytes")

                # Create content parts with PDF data
                prompt_with_system = f"{system_instruction}\n\n{user_prompt}"
                contents = [
                    genai_types.Part.from_bytes(
                        data=pdf_data, mime_type="application/pdf"
                    ),
                    prompt_with_system,
                ]

                # Generate content with the PDF
                print("Sending PDF to Gemini for flashcard generation")
                response = gemini_client.models.generate_content(
                    model=model_name,
                    contents=contents,
                    config={"temperature": 0.5, "max_output_tokens": 2048},
                )

                print("Received response from Gemini")

                # Extract JSON array from response
                content = response.text
                print(
                    f"Response content: {content[:200]}..."
                )  # Print start of response for debugging

                # Try to extract a JSON array
                try:
                    # Look for array pattern [{ ... }]
                    start = content.find("[")
                    end = content.rfind("]") + 1

                    if start >= 0 and end > start:
                        json_str = content[start:end]
                        flashcards_from_pdf: List[Dict[str, str]] = json.loads(json_str)
                        return flashcards_from_pdf
                    else:
                        # If no JSON array found, try to manually create structured data from the text
                        print(
                            "No JSON array found in response, attempting to parse manually"
                        )
                        lines = content.split("\n")
                        flashcards = []
                        current_q = None
                        current_a = ""

                        for line in lines:
                            if line.strip().startswith("Q:") or line.strip().startswith(
                                "Question:"
                            ):
                                # Save previous QA pair if exists
                                if current_q:
                                    flashcards.append(
                                        {
                                            "question": current_q,
                                            "answer": current_a.strip(),
                                        }
                                    )
                                    current_a = ""

                                # Start new question
                                current_q = (
                                    line.strip()
                                    .replace("Q:", "")
                                    .replace("Question:", "")
                                    .strip()
                                )
                            elif line.strip().startswith(
                                "A:"
                            ) or line.strip().startswith("Answer:"):
                                current_a = (
                                    line.strip()
                                    .replace("A:", "")
                                    .replace("Answer:", "")
                                    .strip()
                                )
                            elif current_q and current_a:
                                # Continuing an answer
                                current_a += " " + line.strip()

                        # Add the last QA pair
                        if current_q:
                            flashcards.append(
                                {"question": current_q, "answer": current_a.strip()}
                            )

                        # Return parsed flashcards, or fallback if none found
                        if flashcards:
                            return flashcards
                        else:
                            return [
                                {
                                    "question": "Unable to parse response",
                                    "answer": "The model did not return properly formatted flashcards.",
                                }
                            ]
                except Exception as parse_err:
                    print(f"Error parsing flashcards from Gemini: {str(parse_err)}")
                    return [
                        {
                            "question": "Error",
                            "answer": f"Could not parse flashcards: {str(parse_err)}",
                        }
                    ]

            except Exception as pdf_err:
                print(
                    f"Error processing PDF with Gemini for flashcards: {str(pdf_err)}"
                )
                return [
                    {
                        "question": "Error",
                        "answer": f"Error processing PDF: {str(pdf_err)}",
                    }
                ]

        else:
            # Process regular text with Gemini
            try:
                # Create a structured message
                prompt_with_system = f"{system_instruction}\n\n{user_prompt}"
                contents = [prompt_with_system, genai_types.Part.from_text(text)]

                # Generate content
                print("Sending text to Gemini for flashcard generation")
                response = gemini_client.models.generate_content(
                    model=model_name,
                    contents=contents,
                    config={"temperature": 0.5, "max_output_tokens": 2048},
                )

                print("Received response from Gemini")

                # Extract JSON array from response
                content = response.text

                # Try to extract JSON
                try:
                    start = content.find("[")
                    end = content.rfind("]") + 1

                    if start >= 0 and end > start:
                        json_str = content[start:end]
                        flashcards_from_gemini: List[Dict[str, str]] = json.loads(
                            json_str
                        )
                        return flashcards_from_gemini
                    else:
                        print("No JSON array found in response from Gemini")
                        return [
                            {
                                "question": "Format Error",
                                "answer": "The model didn't return flashcards in JSON format.",
                            }
                        ]
                except Exception as parse_err:
                    print(f"Error parsing flashcards: {str(parse_err)}")
                    return [
                        {
                            "question": "Error",
                            "answer": f"Could not parse flashcards: {str(parse_err)}",
                        }
                    ]
            except Exception as gen_err:
                print(f"Error with Gemini generation for flashcards: {str(gen_err)}")
                # Fall through to OpenAI fallback
    except Exception as e:
        print(f"Error using Gemini API for flashcards: {e}")

    # Fallback to OpenAI if Gemini fails
    print("Falling back to OpenAI API for flashcards...")

    # For PDFs in the fallback case, attempt to extract text first
    if is_pdf:
        try:
            print("Attempting text extraction from PDF for OpenAI flashcard fallback")
            with open(text, "rb") as file:
                reader = PyPDF2.PdfReader(file)
                extracted_text = ""
                for page in reader.pages:
                    extracted_text += page.extract_text() + "\n\n"

            if not extracted_text.strip():
                return [
                    {
                        "question": "Error",
                        "answer": "Could not extract text from PDF for flashcard generation.",
                    }
                ]

            # Use the extracted text for OpenAI
            text = extracted_text
        except Exception as pdf_err:
            print(
                f"Error extracting text from PDF for flashcard fallback: {str(pdf_err)}"
            )
            return [
                {
                    "question": "Error",
                    "answer": f"Error processing document: {str(pdf_err)}",
                }
            ]

    # Check if text is too large (>7000 tokens estimated)
    if len(text) > 28000:  # Rough estimate: 4 chars per token
        print(f"Text is too large ({len(text)} chars), chunking for flashcards...")
        # Split into chunks of approximately 7000 tokens
        max_chunk_size = 28000
        chunks = [
            text[i : i + max_chunk_size] for i in range(0, len(text), max_chunk_size)
        ]

        # Generate flashcards for each chunk (fewer cards per chunk)
        all_flashcards = []
        cards_per_chunk = max(2, int(10 / len(chunks)))

        for i, chunk in enumerate(chunks):
            try:
                response = gemini_client.models.generate_content(
                    model=model_name,
                    contents=[
                        genai_types.Part.from_text(
                            f"This is part {i+1} of {len(chunks)} of a document. Create {cards_per_chunk} flashcards with question and answer pairs that cover the most important concepts. Format as a JSON array of objects with 'question' and 'answer' fields.\n\n{chunk}"
                        ),
                    ],
                    config={"temperature": 0.5, "max_output_tokens": 1000},
                )

                # Extract JSON from response
                content = response.text
                start = content.find("[")
                end = content.rfind("]") + 1

                if start >= 0 and end > start:
                    json_str = content[start:end]
                    chunk_cards: List[Dict[str, str]] = json.loads(json_str)
                    all_flashcards.extend(chunk_cards)
            except Exception as e:
                print(f"Error generating flashcards for chunk {i+1}: {e}")
                fallback_card: Dict[str, str] = {
                    "question": f"[Error processing part {i+1}]",
                    "answer": "Please try again or split the document.",
                }
                all_flashcards.append(fallback_card)

        return all_flashcards[:10]  # Return at most 10 cards
    else:
        # Original logic for smaller texts
        response = gemini_client.models.generate_content(
            model=model_name,
            contents=[
                genai_types.Part.from_text(
                    f"Based on the following document, create 10 flashcards with question and answer pairs that cover the most important concepts. Format as a JSON array of objects with 'question' and 'answer' fields.\n\n{text}"
                ),
            ],
            config={"temperature": 0.5, "max_output_tokens": 1500},
        )

        # Parse JSON from response
        try:
            # Extract just the JSON part from the response
            content = response.text
            # Find JSON array start and end
            start = content.find("[")
            end = content.rfind("]") + 1

            if start >= 0 and end > start:
                json_str = content[start:end]
                result: List[Dict[str, str]] = json.loads(json_str)
                return result
            else:
                # Rename fallback variable (no-redef fix)
                fallback_cards_else: List[Dict[str, str]] = [
                    {"question": "What is this?", "answer": "A sample flashcard"}
                ]
                return fallback_cards_else
        except Exception as e:
            print(f"Error parsing flashcards: {e}")
            # Rename fallback variable (no-redef fix)
            fallback_cards_err: List[Dict[str, str]] = [
                {"question": "What is this?", "answer": "A sample flashcard"}
            ]
            return fallback_cards_err


async def generate_quiz(text: str, content_type: str) -> List[Dict[str, Any]]:
    """
    Generate a quiz from text or PDF document using Gemini API.
    """
    # Define the model name once to use consistently
    model_name = "gemini-2.0-flash"

    # Check if we're processing a PDF file
    is_pdf = content_type == "pdf" or (
        isinstance(text, str) and text.lower().endswith(".pdf")
    )

    # Debug logging
    if is_pdf:
        print(f"Processing PDF file for quiz: {text}")
        if not os.path.exists(text):
            return [
                {
                    "question": "Error",
                    "options": ["A", "B", "C", "D"],
                    "correct_option": 0,
                    "explanation": "The PDF file could not be found.",
                }
            ]
    else:
        print(f"Processing text content for quiz, length: {len(text)}")
        if not text or text.strip() == "":
            return [
                {
                    "question": "Error",
                    "options": ["A", "B", "C", "D"],
                    "correct_option": 0,
                    "explanation": "The document appears to be empty.",
                }
            ]

    system_instruction = (
        "You are a helpful educational assistant that creates effective quizzes."
    )
    user_prompt = "Create 5 multiple-choice quiz questions with 4 options each based on this document. Format your response as a JSON array of objects with 'question', 'options' (array of 4 strings), 'correct_option' (integer 0-3), and 'explanation' fields that explains why the answer is correct."

    try:
        if is_pdf:
            # Process PDF directly using Gemini's native PDF handling
            try:
                # Read the PDF file as bytes
                with open(text, "rb") as pdf_file:
                    pdf_data = pdf_file.read()

                print(f"Successfully read PDF file with {len(pdf_data)} bytes")

                # Create content parts with PDF data
                prompt_with_system = f"{system_instruction}\n\n{user_prompt}"
                contents = [
                    genai_types.Part.from_bytes(
                        data=pdf_data, mime_type="application/pdf"
                    ),
                    prompt_with_system,
                ]

                # Generate content with the PDF
                print("Sending PDF to Gemini for quiz generation")
                response = gemini_client.models.generate_content(
                    model=model_name,
                    contents=contents,
                    config={"temperature": 0.5, "max_output_tokens": 2048},
                )

                print("Received response from Gemini")

                # Extract JSON array from response
                content = response.text
                print(
                    f"Response content: {content[:200]}..."
                )  # Print start of response for debugging

                # Try to extract a JSON array
                try:
                    # Look for array pattern [{ ... }]
                    start = content.find("[")
                    end = content.rfind("]") + 1

                    if start >= 0 and end > start:
                        json_str = content[start:end]
                        quiz_from_pdf: List[Dict[str, Any]] = json.loads(json_str)
                        # Validate structure
                        for question in quiz_from_pdf:
                            if not all(
                                k in question
                                for k in [
                                    "question",
                                    "options",
                                    "correct_option",
                                    "explanation",
                                ]
                            ):
                                raise ValueError(
                                    f"Missing required field in question: {question}"
                                )
                            if (
                                not isinstance(question["options"], list)
                                or len(question["options"]) != 4
                            ):
                                raise ValueError(
                                    f"Options must be a list of 4 items: {question}"
                                )
                        return quiz_from_pdf
                    else:
                        print("No JSON array found in Gemini response")
                        return [
                            {
                                "question": "Format Error",
                                "options": ["A", "B", "C", "D"],
                                "correct_option": 0,
                                "explanation": "The model didn't return quiz questions in proper JSON format.",
                            }
                        ]
                except Exception as parse_err:
                    print(f"Error parsing quiz from Gemini: {str(parse_err)}")
                    return [
                        {
                            "question": "Error",
                            "options": ["A", "B", "C", "D"],
                            "correct_option": 0,
                            "explanation": f"Could not parse quiz: {str(parse_err)}",
                        }
                    ]

            except Exception as pdf_err:
                print(f"Error processing PDF with Gemini for quiz: {str(pdf_err)}")
                return [
                    {
                        "question": "Error",
                        "options": ["A", "B", "C", "D"],
                        "correct_option": 0,
                        "explanation": f"Error processing PDF: {str(pdf_err)}",
                    }
                ]

        else:
            # Process regular text with Gemini
            try:
                # Create a structured message
                prompt_with_system = f"{system_instruction}\n\n{user_prompt}"
                contents = [prompt_with_system, genai_types.Part.from_text(text)]

                # Generate content
                print("Sending text to Gemini for quiz generation")
                response = gemini_client.models.generate_content(
                    model=model_name,
                    contents=contents,
                    config={"temperature": 0.5, "max_output_tokens": 2048},
                )

                print("Received response from Gemini")

                # Extract JSON array from response
                content = response.text

                # Try to extract JSON
                try:
                    start = content.find("[")
                    end = content.rfind("]") + 1

                    if start >= 0 and end > start:
                        json_str = content[start:end]
                        quiz_from_gemini: List[Dict[str, Any]] = json.loads(json_str)
                        # Validate structure
                        for question in quiz_from_gemini:
                            if not all(
                                k in question
                                for k in [
                                    "question",
                                    "options",
                                    "correct_option",
                                    "explanation",
                                ]
                            ):
                                raise ValueError(
                                    f"Missing required field in question: {question}"
                                )
                            if (
                                not isinstance(question["options"], list)
                                or len(question["options"]) != 4
                            ):
                                raise ValueError(
                                    f"Options must be a list of 4 items: {question}"
                                )
                        return quiz_from_gemini
                    else:
                        print("No JSON array found in response from Gemini")
                        return [
                            {
                                "question": "Format Error",
                                "options": ["A", "B", "C", "D"],
                                "correct_option": 0,
                                "explanation": "The model didn't return quiz questions in proper JSON format.",
                            }
                        ]
                except Exception as parse_err:
                    print(f"Error parsing quiz: {str(parse_err)}")
                    return [
                        {
                            "question": "Error",
                            "options": ["A", "B", "C", "D"],
                            "correct_option": 0,
                            "explanation": f"Could not parse quiz: {str(parse_err)}",
                        }
                    ]
            except Exception as gen_err:
                print(f"Error with Gemini generation for quiz: {str(gen_err)}")
                # Fall through to OpenAI fallback
    except Exception as e:
        print(f"Error using Gemini API for quiz: {e}")

    # Fallback to OpenAI if Gemini fails
    print("Falling back to OpenAI API for quiz...")

    # For PDFs in the fallback case, attempt to extract text first
    if is_pdf:
        try:
            print("Attempting text extraction from PDF for OpenAI quiz fallback")
            with open(text, "rb") as file:
                reader = PyPDF2.PdfReader(file)
                extracted_text = ""
                for page in reader.pages:
                    extracted_text += page.extract_text() + "\n\n"

            if not extracted_text.strip():
                return [
                    {
                        "question": "Error",
                        "options": ["A", "B", "C", "D"],
                        "correct_option": 0,
                        "explanation": "Could not extract text from PDF for quiz generation.",
                    }
                ]

            # Use the extracted text for OpenAI
            text = extracted_text
        except Exception as pdf_err:
            print(f"Error extracting text from PDF for quiz fallback: {str(pdf_err)}")
            return [
                {
                    "question": "Error",
                    "options": ["A", "B", "C", "D"],
                    "correct_option": 0,
                    "explanation": f"Error processing document: {str(pdf_err)}",
                }
            ]

    # Check if text is too large (>7000 tokens estimated)
    if len(text) > 28000:  # Rough estimate: 4 chars per token
        print(f"Text is too large ({len(text)} chars), chunking for quiz...")
        # Split into chunks of approximately 7000 tokens
        max_chunk_size = 28000
        chunks = [
            text[i : i + max_chunk_size] for i in range(0, len(text), max_chunk_size)
        ]

        # Generate quiz questions for each chunk (fewer questions per chunk)
        all_questions = []
        questions_per_chunk = max(1, int(5 / len(chunks)))

        for i, chunk in enumerate(chunks):
            try:
                response = gemini_client.models.generate_content(
                    model=model_name,
                    contents=[
                        genai_types.Part.from_text(
                            f"This is part {i+1} of {len(chunks)} of a document. Create {questions_per_chunk} multiple-choice quiz questions with 4 options each. Format as a JSON array of objects with 'question', 'options' (array of 4 strings), 'correct_option' (integer 0-3), and 'explanation' fields.\n\n{chunk}"
                        ),
                    ],
                    config={"temperature": 0.5, "max_output_tokens": 1000},
                )

                # Extract JSON from response
                content = response.text
                start = content.find("[")
                end = content.rfind("]") + 1

                if start >= 0 and end > start:
                    json_str = content[start:end]
                    chunk_questions: List[Dict[str, Any]] = json.loads(json_str)
                    all_questions.extend(chunk_questions)
            except Exception as e:
                print(f"Error generating quiz for chunk {i+1}: {e}")
                # Hint the type of the fallback dict
                fallback_question: Dict[str, Any] = {
                    "question": f"[Error processing part {i+1}]",
                    "options": [
                        "Error",
                        "Could not process",
                        "Document too large",
                        "Try again",
                    ],
                    "correct_option": 0,
                    "explanation": "There was an error processing this section of the document.",
                }
                all_questions.append(fallback_question)

        return all_questions[:5]  # Return at most 5 questions
    else:
        # Original logic for smaller texts
        response = gemini_client.models.generate_content(
            model=model_name,
            contents=[
                genai_types.Part.from_text(
                    f"Based on the following document, create 5 multiple-choice quiz questions with 4 options each. Format as a JSON array of objects with 'question', 'options' (array of 4 strings), 'correct_option' (integer 0-3), and 'explanation' fields.\n\n{text}"
                ),
            ],
            config={"temperature": 0.5, "max_output_tokens": 1500},
        )

        # Parse JSON from response
        try:
            # Extract just the JSON part from the response
            content = response.text
            # Find JSON array start and end
            start = content.find("[")
            end = content.rfind("]") + 1

            if start >= 0 and end > start:
                json_str = content[start:end]
                result: List[Dict[str, Any]] = json.loads(json_str)
                return result
            else:
                # Rename fallback variable (no-redef fix)
                fallback_quiz_else: List[Dict[str, Any]] = [
                    {
                        "question": "What is this?",
                        "options": ["A", "B", "C", "D"],
                        "correct_option": 0,
                        "explanation": "Sample fallback quiz question",
                    }
                ]
                return fallback_quiz_else
        except Exception as e:
            print(f"Error parsing quiz: {e}")
            # Rename fallback variable (no-redef fix)
            fallback_quiz_err: List[Dict[str, Any]] = [
                {
                    "question": "What is this?",
                    "options": ["A", "B", "C", "D"],
                    "correct_option": 0,
                    "explanation": "Sample fallback quiz question",
                }
            ]
            return fallback_quiz_err


async def generate_mindmap(text: str, content_type: str) -> Dict[str, Any]:
    """
    Generate a mindmap structure from text or PDF document using Gemini API.
    """
    # Define the model name once to use consistently
    model_name = "gemini-2.0-flash"

    # Check if we're processing a PDF file
    is_pdf = content_type == "pdf" or (
        isinstance(text, str) and text.lower().endswith(".pdf")
    )

    # Debug logging
    if is_pdf:
        print(f"Processing PDF file for mindmap: {text}")
        if not os.path.exists(text):
            return {
                "name": "Error",
                "children": [{"name": "The PDF file could not be found."}],
            }
    else:
        print(f"Processing text content for mindmap, length: {len(text)}")
        if not text or text.strip() == "":
            return {
                "name": "Error",
                "children": [{"name": "The document appears to be empty."}],
            }

    system_instruction = (
        "You are a helpful educational assistant that creates effective mind maps."
    )
    user_prompt = "Create a hierarchical mind map showing the main concepts and their relationships in this document. Format your response as a JSON object where the root node has a 'name' field and a 'children' array of objects that also have 'name' fields and optional 'children' arrays."

    try:
        if is_pdf:
            # Process PDF directly using Gemini's native PDF handling
            try:
                # Read the PDF file as bytes
                with open(text, "rb") as pdf_file:
                    pdf_data = pdf_file.read()

                print(f"Successfully read PDF file with {len(pdf_data)} bytes")

                # Create content parts with PDF data
                prompt_with_system = f"{system_instruction}\n\n{user_prompt}"
                contents = [
                    genai_types.Part.from_bytes(
                        data=pdf_data, mime_type="application/pdf"
                    ),
                    prompt_with_system,
                ]

                # Generate content with the PDF
                print("Sending PDF to Gemini for mindmap generation")
                response = gemini_client.models.generate_content(
                    model=model_name,
                    contents=contents,
                    config={"temperature": 0.5, "max_output_tokens": 2048},
                )

                print("Received response from Gemini")

                # Extract JSON object from response
                content = response.text
                print(
                    f"Response content: {content[:200]}..."
                )  # Print start of response for debugging

                # Try to extract a JSON object
                try:
                    # Look for object pattern { ... }
                    start = content.find("{")
                    end = content.rfind("}") + 1

                    if start >= 0 and end > start:
                        json_str = content[start:end]
                        mindmap_from_pdf: Dict[str, Any] = json.loads(json_str)

                        # Basic validation
                        if "name" not in mindmap_from_pdf:
                            raise ValueError("Root node is missing 'name' field")

                        return mindmap_from_pdf
                    else:
                        print("No JSON object found in response from Gemini")
                        return {
                            "name": "Format Error",
                            "children": [
                                {
                                    "name": "The model didn't return a mindmap in proper JSON format."
                                }
                            ],
                        }
                except Exception as parse_err:
                    print(f"Error parsing mindmap from Gemini: {str(parse_err)}")
                    return {
                        "name": "Error",
                        "children": [
                            {"name": f"Could not parse mindmap: {str(parse_err)}"}
                        ],
                    }

            except Exception as pdf_err:
                print(f"Error processing PDF with Gemini for mindmap: {str(pdf_err)}")
                return {
                    "name": "Error",
                    "children": [{"name": f"Error processing PDF: {str(pdf_err)}"}],
                }

        else:
            # Process regular text with Gemini
            try:
                # Create a structured message
                prompt_with_system = f"{system_instruction}\n\n{user_prompt}"
                contents = [prompt_with_system, genai_types.Part.from_text(text)]

                # Generate content
                print("Sending text to Gemini for mindmap generation")
                response = gemini_client.models.generate_content(
                    model=model_name,
                    contents=contents,
                    config={"temperature": 0.5, "max_output_tokens": 2048},
                )

                print("Received response from Gemini")

                # Extract JSON object from response
                content = response.text

                # Try to extract JSON
                try:
                    start = content.find("{")
                    end = content.rfind("}") + 1

                    if start >= 0 and end > start:
                        json_str = content[start:end]
                        mindmap_data_from_text: Dict[str, Any] = json.loads(json_str)

                        # Basic validation
                        if "name" not in mindmap_data_from_text:
                            raise ValueError("Root node is missing 'name' field")

                        return mindmap_data_from_text
                    else:
                        print("No JSON object found in response from Gemini")
                        return {
                            "name": "Format Error",
                            "children": [
                                {
                                    "name": "The model didn't return a mindmap in proper JSON format."
                                }
                            ],
                        }
                except Exception as parse_err:
                    print(f"Error parsing mindmap: {str(parse_err)}")
                    return {
                        "name": "Error",
                        "children": [
                            {"name": f"Could not parse mindmap: {str(parse_err)}"}
                        ],
                    }
            except Exception as gen_err:
                print(f"Error with Gemini generation for mindmap: {str(gen_err)}")
                # Fall through to OpenAI fallback
    except Exception as e:
        print(f"Error using Gemini API for mindmap: {e}")

    # Fallback to OpenAI if Gemini fails
    print("Falling back to OpenAI API for mindmap...")

    # For PDFs in the fallback case, attempt to extract text first
    if is_pdf:
        try:
            print("Attempting text extraction from PDF for OpenAI mindmap fallback")
            with open(text, "rb") as file:
                reader = PyPDF2.PdfReader(file)
                extracted_text = ""
                for page in reader.pages:
                    extracted_text += page.extract_text() + "\n\n"

            if not extracted_text.strip():
                return {
                    "name": "Error",
                    "children": [
                        {
                            "name": "Could not extract text from PDF for mindmap generation."
                        }
                    ],
                }

            # Use the extracted text for OpenAI
            text = extracted_text
        except Exception as pdf_err:
            print(
                f"Error extracting text from PDF for mindmap fallback: {str(pdf_err)}"
            )
            return {
                "name": "Error",
                "children": [{"name": f"Error processing document: {str(pdf_err)}"}],
            }

    # Check if text is too large (>7000 tokens estimated)
    if len(text) > 28000:  # Rough estimate: 4 chars per token
        print(f"Text is too large ({len(text)} chars), generating simple mindmap...")
        # For very large text, generate a basic mindmap indicating sections
        max_chunk_size = 28000
        num_chunks = (len(text) + max_chunk_size - 1) // max_chunk_size
        # Fallback type hint
        mindmap_fallback: Dict[str, Any] = {
            "name": "Document Overview",
            "children": [{"name": f"Section {i+1}"} for i in range(num_chunks)],
        }
        return mindmap_fallback
    else:
        # Original logic for smaller texts
        try:
            response = gemini_client.models.generate_content(
                model=model_name,
                contents=[
                    genai_types.Part.from_text(
                        f"Based on the following document, create a hierarchical mind map showing the main concepts and their relationships. Format as a JSON object where each node has a 'name' and 'children' array of other nodes. The root node should have name 'root'.\n\n{text}"
                    ),
                ],
                config={"temperature": 0.5, "max_output_tokens": 1500},
            )
            content = response.text

            # Extract JSON part
            start = content.find("{")
            end = content.rfind("}") + 1

            if start >= 0 and end > start:
                json_str = content[start:end]
                # Hint the expected type
                result: Dict[str, Any] = json.loads(json_str)
                return result
            else:
                print("Could not parse mindmap JSON")
                # Rename fallback variable (no-redef fix)
                fallback_map_else: Dict[str, Any] = {
                    "name": "Error",
                    "children": [{"name": "Could not generate mindmap"}],
                }
                return fallback_map_else
        except Exception as e:
            print(f"Error generating mindmap: {e}")
            # Rename fallback variable (no-redef fix)
            fallback_map_err: Dict[str, Any] = {
                "name": "Error",
                "children": [{"name": f"Error: {str(e)}"}],
            }
            return fallback_map_err


# Helper function (if used elsewhere, otherwise can be local)
def _extract_json(text: str, structure: str = "object") -> Optional[Any]:
    # ... (Implementation remains the same)
    pass
