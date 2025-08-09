# Configure the AWS provider
provider "aws" {
  region = "us-east-1" # You can change this to your preferred region
}

# Use a random pet name to ensure our S3 bucket is globally unique
resource "random_pet" "suffix" {
  length = 2
}

# 1. Define the S3 bucket to store build artifacts
resource "aws_s3_bucket" "artifacts" {
  # Bucket names must be globally unique. We add a random suffix.
  bucket = "release-advisor-artifacts-${random_pet.suffix.id}"

  tags = {
    Project = "ReleaseReadinessAdvisor"
  }
}

# Enable versioning on the S3 bucket as a best practice
resource "aws_s3_bucket_versioning" "artifacts_versioning" {
  bucket = aws_s3_bucket.artifacts.id
  versioning_configuration {
    status = "Enabled"
  }
}

# Block all public access to the S3 bucket
resource "aws_s3_bucket_public_access_block" "artifacts_public_access" {
  bucket                  = aws_s3_bucket.artifacts.id
  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

# 2. Define the ECR repository to hold our backend Docker image
resource "aws_ecr_repository" "advisor_backend" {
  name                 = "release-readiness-advisor/backend"
  image_tag_mutability = "MUTABLE"

  image_scanning_configuration {
    scan_on_push = true
  }

  tags = {
    Project = "ReleaseReadinessAdvisor"
  }
}

# 3. Define the IAM Role and Policy for GitHub Actions

# First, get the OpenID Connect (OIDC) provider for GitHub
data "aws_iam_openid_connect_provider" "github" {
  url = "https://token.actions.githubusercontent.com"
}

# Define the IAM policy granting specific permissions to S3 and ECR
resource "aws_iam_policy" "github_actions_policy" {
  name        = "GitHubActionsAdvisorPolicy"
  description = "Policy for the Release Readiness Advisor GitHub Actions"

  # The actual permissions
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "s3:GetObject",
          "s3:PutObject",
          "s3:ListBucket"
        ]
        Resource = [
          aws_s3_bucket.artifacts.arn,
          "${aws_s3_bucket.artifacts.arn}/*"
        ]
      },
      {
        Effect = "Allow"
        Action = [
          "ecr:GetAuthorizationToken",
          "ecr:BatchCheckLayerAvailability",
          "ecr:InitiateLayerUpload",
          "ecr:UploadLayerPart",
          "ecr:CompleteLayerUpload",
          "ecr:PutImage"
        ]
        Resource = aws_ecr_repository.advisor_backend.arn
      }
    ]
  })
}

# Define the IAM role that GitHub Actions will assume
resource "aws_iam_role" "github_actions_role" {
  name = "GitHubActionsAdvisorRole"
  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Principal = {
          Federated = data.aws_iam_openid_connect_provider.github.arn
        }
        Action = "sts:AssumeRoleWithWebIdentity"
        Condition = {
          StringEquals = {
            # This ensures only workflows from your repository can assume this role
            "token.actions.githubusercontent.com:sub" : "repo:franruedaesq/release-readiness-advisor:*"
          }
        }
      }
    ]
  })
}

# Attach the policy to the role
resource "aws_iam_role_policy_attachment" "attach_policy" {
  role       = aws_iam_role.github_actions_role.name
  policy_arn = aws_iam_policy.github_actions_policy.arn
}
