variable "bucket_name" {
  description = "Nombre del bucket"
  type        = string
}

variable "tags" {
  description = "Etiquetas para el bucket"
  type        = map(string)
  default     = {}
}
