variable "environment" {
  description = "Environment name (dev, staging, prod)"
  type        = string
  default     = "dev"
}

variable "project_name" {
  description = "Project name used for resource naming"
  type        = string
  default     = "edusloth"
}

variable "aws_region" {
  description = "AWS region to deploy resources"
  type        = string
  default     = "eu-central-1"
}

variable "aws_profile" {
  description = "AWS CLI profile to use"
  type        = string
  default     = "default"
}

variable "aws_assume_role_arn" {
  description = "Role ARN to assume for cross-account access"
  type        = string
  default     = ""
}
