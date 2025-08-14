output "s3_bucket_name" {
  description = "The name of the S3 bucket for artifacts"
  value       = aws_s3_bucket.artifacts.bucket
}

output "ecr_repository_url" {
  description = "The URL of the ECR repository for the backend image"
  value       = aws_ecr_repository.advisor_backend.repository_url
}

output "iam_role_arn" {
  description = "The ARN of the IAM role for GitHub Actions"
  value       = aws_iam_role.github_actions_role.arn
}

output "ec2_public_ip" {
  description = "The public IP address of the EC2 instance"
  value       = aws_instance.app_server.public_ip
}


