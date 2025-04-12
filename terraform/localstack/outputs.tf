output "bucket_website_url" {
  value = aws_s3_bucket.s3_bucket.website_endpoint
  description = "URL del sitio web desplegado"
}
