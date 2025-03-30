# S3 Storage Module

This module creates and configures all the necessary S3 buckets for the EduSloth application.

## Resources Created

1. **Document Upload Bucket** (`{project_name}-{environment}-documents`)
   - Stores study materials uploaded by users (PDFs, docs, etc.)
   - Used by the content management feature

2. **Audio Upload Bucket** (`{project_name}-{environment}-audio`)
   - Stores audio recordings from lectures and study sessions
   - Used by the audio recording feature

3. **Transcription Bucket** (`{project_name}-{environment}-transcriptions`)
   - Stores transcribed text from audio recordings
   - Used by the transcription service

4. **AI Generation Bucket** (`{project_name}-{environment}-ai-content`)
   - Stores AI-generated content like summaries, flashcards, and mind maps
   - Used by the AI generation services

## Security Features

All buckets are configured with:
- Public access blocking
- Server-side encryption (AES-256)
- Resource tagging for proper identification and cost allocation

## Cost Optimization

All buckets include lifecycle policies to:
- Transition objects to STANDARD_IA storage class after 90 days
- Reduce storage costs for infrequently accessed data

## Usage

```hcl
module "s3_buckets" {
  source = "./modules/s3"
  
  environment = var.environment
  project_name = var.project_name
}
```

## Outputs

| Name | Description |
|------|-------------|
| document_upload_bucket | Name of document uploads bucket |
| audio_upload_bucket | Name of audio recordings bucket |
| transcription_bucket | Name of transcriptions bucket |
| ai_generation_bucket | Name of AI-generated content bucket |
| document_upload_bucket_arn | ARN of document uploads bucket |
| audio_upload_bucket_arn | ARN of audio recordings bucket |
| transcription_bucket_arn | ARN of transcriptions bucket |
| ai_generation_bucket_arn | ARN of AI-generated content bucket | 