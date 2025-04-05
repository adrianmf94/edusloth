#!/bin/bash

# This script sets up the S3 bucket and DynamoDB table needed for Terraform state management
# It should be run once per AWS account before running terraform init

# Parse command line arguments
ENVIRONMENT="dev"
REGION="eu-central-1"
PROFILE="default"

while getopts "e:r:p:" opt; do
  case $opt in
    e) ENVIRONMENT="$OPTARG" ;;
    r) REGION="$OPTARG" ;;
    p) PROFILE="$OPTARG" ;;
    *) echo "Usage: $0 [-e environment] [-r region] [-p profile]" && exit 1 ;;
  esac
done

# Set bucket and table names
STATE_BUCKET="edusloth-terraform-state-$ENVIRONMENT"
LOCK_TABLE="edusloth-terraform-locks-$ENVIRONMENT"

echo "Setting up Terraform state management for environment: $ENVIRONMENT"
echo "Using AWS region: $REGION and profile: $PROFILE"

# Create S3 bucket for Terraform state
aws s3api create-bucket \
  --bucket $STATE_BUCKET \
  --region $REGION \
  --profile $PROFILE \
  --create-bucket-configuration LocationConstraint=$REGION

# Enable bucket versioning
aws s3api put-bucket-versioning \
  --bucket $STATE_BUCKET \
  --versioning-configuration Status=Enabled \
  --profile $PROFILE

# Enable bucket encryption
aws s3api put-bucket-encryption \
  --bucket $STATE_BUCKET \
  --server-side-encryption-configuration '{
    "Rules": [
      {
        "ApplyServerSideEncryptionByDefault": {
          "SSEAlgorithm": "AES256"
        }
      }
    ]
  }' \
  --profile $PROFILE

# Block public access
aws s3api put-public-access-block \
  --bucket $STATE_BUCKET \
  --public-access-block-configuration '{
    "BlockPublicAcls": true,
    "IgnorePublicAcls": true,
    "BlockPublicPolicy": true,
    "RestrictPublicBuckets": true
  }' \
  --profile $PROFILE

# Create DynamoDB table for state locking
aws dynamodb create-table \
  --table-name $LOCK_TABLE \
  --attribute-definitions AttributeName=LockID,AttributeType=S \
  --key-schema AttributeName=LockID,KeyType=HASH \
  --billing-mode PAY_PER_REQUEST \
  --region $REGION \
  --profile $PROFILE

echo "Setup complete!"
echo ""
echo "Use the following values in your terraform init command:"
echo "terraform init \\"
echo "  -backend-config=\"bucket=$STATE_BUCKET\" \\"
echo "  -backend-config=\"region=$REGION\" \\"
echo "  -backend-config=\"dynamodb_table=$LOCK_TABLE\" \\"
echo "  -backend-config=\"profile=$PROFILE\" \\"
echo "  -backend-config=\"key=terraform.tfstate\""
