terraform {
  required_providers {
    local = {
      source  = "hashicorp/local"
      version = "2.4.0"
    }
  }
}

provider "local" {}

resource "local_file" "hello" {
  filename = "hola_terraform.txt"
  content  = "Hola, Terraform!"
}