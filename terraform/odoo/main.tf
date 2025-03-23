# services/odoo/main.tf

provider "aws" {
  region                      = "us-east-1"
  access_key                  = "test"
  secret_key                  = "test"
  skip_credentials_validation = true
  skip_requesting_account_id  = true

  endpoints {
    ec2 = "http://localhost:4566"
  }
}

resource "aws_security_group" "odoo_sg" {
  name        = "odoo_sg"
  description = "Permitir acceso al contenedor de Odoo"

  ingress {
    from_port   = 8069
    to_port     = 8069
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }
}

resource "aws_instance" "odoo_instance" {
  # Dado que LocalStack emula AWS, se utiliza un ID de AMI dummy
  ami           = "ami-12345678"
  instance_type = "t2.micro"

  security_groups = [aws_security_group.odoo_sg.name]

  user_data = <<-EOF
              #!/bin/bash
              apt-get update -y
              apt-get install -y docker.io
              systemctl start docker
              docker run -d -p 8069:8069 --name odoo odoo:latest
              EOF

  tags = {
    Name = "odoo-server"
  }
}
