output "document_upload_bucket" {
  description = "S3 bucket for document uploads"
  value       = module.s3_buckets.document_upload_bucket
}

output "audio_upload_bucket" {
  description = "S3 bucket for audio recordings"
  value       = module.s3_buckets.audio_upload_bucket
}

output "transcription_bucket" {
  description = "S3 bucket for transcribed content"
  value       = module.s3_buckets.transcription_bucket
}

output "ai_generation_bucket" {
  description = "S3 bucket for AI-generated content"
  value       = module.s3_buckets.ai_generation_bucket
}
