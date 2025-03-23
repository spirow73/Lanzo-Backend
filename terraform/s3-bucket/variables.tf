variable "bucket_name" {
    type        = string
    description = "Nombre del bucket de S3."
    default     = "my-bucket-name"  // O asigna valores por defecto si lo requieres
}

variable "tags" {
  type        = map(string)
  description = "Un mapa de tags para los recursos."
  default     = {}  // O asigna valores por defecto si lo requieres
}

output "arn" {
  description = "ARN of the bucket"
  value       = aws_s3_bucket.s3_bucket.arn
}

output "name" {
  description = "Name (id) of the bucket"
  value       = aws_s3_bucket.s3_bucket.id
}

output "domain" {
  description = "Domain name of the bucket"
  value       = aws_s3_bucket_website_configuration.s3_bucket.website_domain
}

output "website_endpoint" {
  value = aws_s3_bucket_website_configuration.s3_bucket.website_endpoint
}