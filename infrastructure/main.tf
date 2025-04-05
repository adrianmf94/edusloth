provider "aws" {
  region = var.aws_region
  profile = var.aws_profile

  # Optional but recommended for multi-account setup
  assume_role {
    role_arn = var.aws_assume_role_arn
  }
}

module "s3_buckets" {
  source = "./modules/s3"

  environment = var.environment
  project_name = var.project_name
}

# Remote backend configuration for state management
terraform {
  backend "s3" {
    # These values will be passed via -backend-config in the terraform init command
    # bucket = "edusloth-terraform-state"
    # key    = "terraform.tfstate"
    # region = "eu-central-1"
    # dynamodb_table = "edusloth-terraform-locks"
  }

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 4.0"
    }
  }
}
