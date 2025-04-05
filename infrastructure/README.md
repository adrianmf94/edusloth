# EduSloth Infrastructure

This directory contains the Terraform configuration to deploy the AWS infrastructure required for the EduSloth application. The infrastructure is organized in modules and designed to be deployed to multiple environments (dev, staging, production).

## Prerequisites

- [AWS CLI](https://aws.amazon.com/cli/) installed and configured
- [Terraform](https://www.terraform.io/downloads.html) v1.0.0+ installed
- Access to AWS accounts for each environment (dev, staging, prod)

## Setup

### 1. Configure AWS CLI Profiles

Set up separate AWS CLI profiles for each environment to manage your different AWS accounts:

```bash
# Configure profile for development environment
aws configure --profile edusloth-dev
# Enter AWS Access Key and Secret for dev account when prompted

# Configure profile for staging environment (if needed now)
aws configure --profile edusloth-staging

# Configure profile for production environment (if needed now)
aws configure --profile edusloth-prod
```

Verify your profiles work:

```bash
aws sts get-caller-identity --profile edusloth-dev
```

### 2. Initialize Terraform State Backend

For each environment, run the included script to create the S3 bucket and DynamoDB table for Terraform state:

```bash
# For development environment
./setup-terraform-state.sh -e dev -r eu-central-1 -p edusloth-dev

# For staging environment (when needed)
# ./setup-terraform-state.sh -e staging -r eu-central-1 -p edusloth-staging

# For production environment (when needed)
# ./setup-terraform-state.sh -e prod -r eu-central-1 -p edusloth-prod
```

This script will output the exact `terraform init` command you'll need for the next step.

### 3. Create Environment-Specific Variable Files

Create a separate `.tfvars` file for each environment:

```bash
# For development
cp terraform.tfvars.example dev.tfvars
```

Edit `dev.tfvars` to set appropriate values:

```hcl
environment = "dev"
project_name = "edusloth"
aws_region = "eu-central-1"
aws_profile = "edusloth-dev"
aws_assume_role_arn = "" # Leave empty if not using role assumption
```

### 4. Initialize Terraform with Backend Configuration

Use the command output from the setup script to initialize Terraform with the correct backend for your environment:

```bash
# For development environment
terraform init \
  -backend-config="bucket=edusloth-terraform-state-dev" \
  -backend-config="region=eu-central-1" \
  -backend-config="dynamodb_table=edusloth-terraform-locks-dev" \
  -backend-config="profile=edusloth-dev" \
  -backend-config="key=terraform.tfstate"
```

### 5. Plan and Apply the Terraform Configuration

First, check what changes will be applied:

```bash
terraform plan -var-file=dev.tfvars
```

Review the plan, then apply the changes:

```bash
terraform apply -var-file=dev.tfvars
```

Type `yes` when prompted to confirm.

## Working with Multiple Environments

When switching between environments, you'll need to reinitialize Terraform with the appropriate backend configuration:

```bash
# Switch to staging
terraform init -reconfigure \
  -backend-config="bucket=edusloth-terraform-state-staging" \
  -backend-config="region=eu-central-1" \
  -backend-config="dynamodb_table=edusloth-terraform-locks-staging" \
  -backend-config="profile=edusloth-staging" \
  -backend-config="key=terraform.tfstate"

# Apply staging configuration
terraform apply -var-file=staging.tfvars
```

## Common Commands

```bash
# View the current state
terraform state list

# Check for configuration drift
terraform plan -var-file=dev.tfvars

# Destroy resources (use with caution!)
terraform destroy -var-file=dev.tfvars

# Format your Terraform files
terraform fmt -recursive
```

## Adding New Resources

1. Create a new module in the `modules/` directory if it's a distinct resource set
2. Add the module to `main.tf` in the root directory
3. Update `variables.tf` and `outputs.tf` as needed
4. Run `terraform plan` to validate your changes

## Current Modules

- `s3`: Creates and configures the S3 buckets needed for file storage
  - Document uploads bucket
  - Audio recordings bucket
  - Transcriptions bucket
  - AI-generated content bucket

## Security Best Practices

- Keep your `.tfvars` files out of version control
- Use environment-specific IAM roles with minimal permissions
- Regularly audit your infrastructure for compliance
- Consider using AWS CloudTrail to monitor API calls

## Cost Management

- Resources are tagged with `Environment` and `Project` for cost allocation
- Lifecycle policies are applied to S3 buckets to reduce storage costs
- Use `terraform plan` before `apply` to review resource changes and estimate costs
- Regularly run `aws ce get-cost-and-usage` to monitor your AWS spending
