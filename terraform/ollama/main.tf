# services/ollama/main.tf

# Configuración del proveedor Docker
provider "docker" {}

# Descarga (si es que existe) o utiliza la imagen de Ollama
resource "docker_image" "ollama_image" {
  name = "ollama:latest" 
}

# Crea y ejecuta el contenedor de Ollama
resource "docker_container" "ollama_container" {
  image = docker_image.ollama_image.latest
  name  = "ollama_container"

  # Configura los puertos según lo necesites
  ports {
    internal = 8080
    external = 8080
  }
}
