locals {
  # Standard naming convention for buckets
  prefix = "${var.project_name}-${var.environment}"
}

# Bucket for document uploads (PDFs, docs, etc)
resource "aws_s3_bucket" "document_upload" {
  bucket = "${local.prefix}-documents"

  tags = {
    Name        = "${local.prefix}-documents"
    Environment = var.environment
    Project     = var.project_name
  }
}

# Bucket for audio recordings
resource "aws_s3_bucket" "audio_upload" {
  bucket = "${local.prefix}-audio"

  tags = {
    Name        = "${local.prefix}-audio"
    Environment = var.environment
    Project     = var.project_name
  }
}

# Bucket for transcribed content
resource "aws_s3_bucket" "transcription" {
  bucket = "${local.prefix}-transcriptions"

  tags = {
    Name        = "${local.prefix}-transcriptions"
    Environment = var.environment
    Project     = var.project_name
  }
}

# Bucket for AI-generated content (summaries, flashcards, etc)
resource "aws_s3_bucket" "ai_generation" {
  bucket = "${local.prefix}-ai-content"

  tags = {
    Name        = "${local.prefix}-ai-content"
    Environment = var.environment
    Project     = var.project_name
  }
}

# Security configurations for all buckets
resource "aws_s3_bucket_public_access_block" "document_upload" {
  bucket = aws_s3_bucket.document_upload.id

  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

resource "aws_s3_bucket_public_access_block" "audio_upload" {
  bucket = aws_s3_bucket.audio_upload.id

  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

resource "aws_s3_bucket_public_access_block" "transcription" {
  bucket = aws_s3_bucket.transcription.id

  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

resource "aws_s3_bucket_public_access_block" "ai_generation" {
  bucket = aws_s3_bucket.ai_generation.id

  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

# Server-side encryption for all buckets
resource "aws_s3_bucket_server_side_encryption_configuration" "document_upload" {
  bucket = aws_s3_bucket.document_upload.id

  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm = "AES256"
    }
  }
}

resource "aws_s3_bucket_server_side_encryption_configuration" "audio_upload" {
  bucket = aws_s3_bucket.audio_upload.id

  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm = "AES256"
    }
  }
}

resource "aws_s3_bucket_server_side_encryption_configuration" "transcription" {
  bucket = aws_s3_bucket.transcription.id

  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm = "AES256"
    }
  }
}

resource "aws_s3_bucket_server_side_encryption_configuration" "ai_generation" {
  bucket = aws_s3_bucket.ai_generation.id

  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm = "AES256"
    }
  }
}

# Lifecycle configuration for cost optimization
resource "aws_s3_bucket_lifecycle_configuration" "document_upload" {
  bucket = aws_s3_bucket.document_upload.id

  rule {
    id     = "archive-old-documents"
    status = "Enabled"

    transition {
      days          = 90
      storage_class = "STANDARD_IA"
    }
  }
}

resource "aws_s3_bucket_lifecycle_configuration" "audio_upload" {
  bucket = aws_s3_bucket.audio_upload.id

  rule {
    id     = "archive-old-audio"
    status = "Enabled"

    transition {
      days          = 90
      storage_class = "STANDARD_IA"
    }
  }
}

resource "aws_s3_bucket_lifecycle_configuration" "transcription" {
  bucket = aws_s3_bucket.transcription.id

  rule {
    id     = "archive-old-transcriptions"
    status = "Enabled"

    transition {
      days          = 90
      storage_class = "STANDARD_IA"
    }
  }
}

resource "aws_s3_bucket_lifecycle_configuration" "ai_generation" {
  bucket = aws_s3_bucket.ai_generation.id

  rule {
    id     = "archive-old-ai-content"
    status = "Enabled"

    transition {
      days          = 90
      storage_class = "STANDARD_IA"
    }
  }
} 