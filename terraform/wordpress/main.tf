# services/wordpress/main.tf

provider "docker" {}

resource "docker_image" "wordpress_image" {
  name = "wordpress:latest"
}

resource "docker_container" "wordpress_container" {
  image = docker_image.wordpress_image.latest
  name  = "wordpress_container"

  # Mapea el puerto interno (80) al puerto externo que prefieras, por ejemplo 8081
  ports {
    internal = 80
    external = 8081
  }
}
