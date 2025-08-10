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

# 1. Bucket for storing Terraform's remote state file
resource "aws_s3_bucket" "terraform_state" {
  bucket = "release-advisor-terra-state" # USE THE SAME NAME AS IN backend.tf

  # Prevent accidental deletion
  lifecycle {
    prevent_destroy = true
  }
}

# 2. SSH Key Pair for accessing the EC2 instance
resource "tls_private_key" "pk" {
  algorithm = "RSA"
  rsa_bits  = 4096
}

resource "aws_key_pair" "kp" {
  key_name   = "release-advisor-key"
  public_key = tls_private_key.pk.public_key_openssh # <-- This is the correct format
}

# Save the private key locally to be added to GitHub Secrets
resource "local_file" "ssh_key" {
  content  = tls_private_key.pk.private_key_pem
  filename = "${path.module}/release-advisor-key.pem"
}

# 3. Security Group (Firewall) for the EC2 instance
resource "aws_security_group" "release_advisor_sg" {
  name        = "release-advisor-sg"
  description = "Allow traffic for the Release Advisor app"

  # Allow SSH access
  ingress {
    from_port   = 22
    to_port     = 22
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"] # WARNING: Open to the world. For a real app, restrict this to your IP.
  }

  # Allow access to our application ports
  ingress {
    from_port   = 3000
    to_port     = 3001
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }
  ingress {
    from_port   = 3002
    to_port     = 3002
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }
  ingress {
    from_port   = 8000
    to_port     = 8000
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }
  ingress {
    from_port   = 9090
    to_port     = 9091
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  # Allow all outbound traffic
  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }
}

# 4. The EC2 Instance itself
resource "aws_instance" "app_server" {
  ami             = "ami-020cba7c55df1f615" # Ubuntu 22.04 LTS for us-east-1
  instance_type   = "t3.medium"             # Has enough memory for our stack
  key_name        = aws_key_pair.kp.key_name
  security_groups = [aws_security_group.release_advisor_sg.name]

  # Startup script to install Docker and Docker Compose
  user_data = <<-EOF
              #!/bin/bash
              sudo apt-get update
              sudo apt-get install -y ca-certificates curl
              sudo install -m 0755 -d /etc/apt/keyrings
              sudo curl -fsSL https://download.docker.com/linux/ubuntu/gpg -o /etc/apt/keyrings/docker.asc
              sudo chmod a+r /etc/apt/keyrings/docker.asc
              echo \
                "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.asc] https://download.docker.com/linux/ubuntu \
                $(. /etc/os-release && echo "$VERSION_CODENAME") stable" | \
                sudo tee /etc/apt/sources.list.d/docker.list > /dev/null
              sudo apt-get update
              sudo apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
              sudo usermod -aG docker ubuntu
              EOF

  tags = {
    Name = "Release-Advisor-Server"
  }
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
            "token.actions.githubusercontent.com:aud" = "sts.amazonaws.com"
          },
          StringLike = {
            "token.actions.githubusercontent.com:sub" = "repo:franruedaesq/release-readiness-advisor:*"
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
