output "document_upload_bucket" {
  description = "S3 bucket for document uploads"
  value       = aws_s3_bucket.document_upload.bucket
}

output "audio_upload_bucket" {
  description = "S3 bucket for audio recordings"
  value       = aws_s3_bucket.audio_upload.bucket
}

output "transcription_bucket" {
  description = "S3 bucket for transcribed content"
  value       = aws_s3_bucket.transcription.bucket
}

output "ai_generation_bucket" {
  description = "S3 bucket for AI-generated content"
  value       = aws_s3_bucket.ai_generation.bucket
}

output "document_upload_bucket_arn" {
  description = "ARN of S3 bucket for document uploads"
  value       = aws_s3_bucket.document_upload.arn
}

output "audio_upload_bucket_arn" {
  description = "ARN of S3 bucket for audio recordings"
  value       = aws_s3_bucket.audio_upload.arn
}

output "transcription_bucket_arn" {
  description = "ARN of S3 bucket for transcribed content"
  value       = aws_s3_bucket.transcription.arn
}

output "ai_generation_bucket_arn" {
  description = "ARN of S3 bucket for AI-generated content"
  value       = aws_s3_bucket.ai_generation.arn
} 