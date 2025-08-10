terraform {
  backend "s3" {
    # Replace with a unique bucket name
    bucket = "release-advisor-terra-state"
    key    = "global/terraform.tfstate"
    region = "us-east-1" # Must match your provider region
  }
}
