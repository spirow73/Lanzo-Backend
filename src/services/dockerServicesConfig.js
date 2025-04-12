// services/serviceConfigs.js

const servicesConfig = {
  wordpress: {
    image: 'wordpress:latest',
    containerName: 'wordpress',
    portBindings: {
      "80/tcp": [{ HostPort: "8000" }]
    },
    env: [
      "WORDPRESS_DB_HOST=db-wordpress", // debe poder resolverse en la red definida
      "WORDPRESS_DB_USER=wpuser",
      "WORDPRESS_DB_PASSWORD=wppass",
      "WORDPRESS_DB_NAME=wpdb"
    ],
    // Indicamos que este contenedor debe conectarse a la red "wordpress-net"
    network: "wordpress-net",
    // Si quieres simular depends_on, lo indicamos (se procesará en el código)
    depends_on: ["db-wordpress"]
  },

  "db-wordpress": {
    image: 'mysql:5.7',
    containerName: 'db-wordpress',
    env: [
      "MYSQL_DATABASE=wpdb",
      "MYSQL_USER=wpuser",
      "MYSQL_PASSWORD=wppass",
      "MYSQL_ROOT_PASSWORD=rootpass"
    ],
    volumes: [
      {
        host_path: "db_data_wordpress", // nombre del volumen
        container_path: "/var/lib/mysql"
      }
    ],
    // Conectamos este contenedor a la misma red para que WordPress pueda resolver su nombre
    network: "wordpress-net",
    // Simulamos restart policy (se procesará en el código)
    restart: "always"
  },

  // Servicio compuesto: levanta la DB y WordPress en conjunto
  wordpressstack: {
    services: ["db-wordpress", "wordpress"]
  },
  ollama: {
    image: 'ollama/ollama',
    containerName: 'ollama',
    portBindings: {
      "11434/tcp": [{ HostPort: "11434" }]
    },
    binds: ['ollama:/root/.ollama'],
    runtime: 'nvidia',
    postStartCmd: ['ollama', 'pull', 'llama3.2:1b']
  },
  openwebui: {
    image: 'ghcr.io/open-webui/open-webui:main',
    containerName: 'openwebui',
    portBindings: {
      "8080/tcp": [{ HostPort: "3000" }]
    },
    env: [
      "ENABLE_OLLAMA_API=True",
      "OLLAMA_BASE_URL=http://host.docker.internal:11434"
    ],
    binds: ['ollama:/root/.ollama'],
    runtime: 'nvidia'
  },
  localstack: {
    image: 'localstack/localstack',
    containerName: 'localstack',
    portBindings: {
      "4566/tcp": [{ HostPort: "4566" }],
      "4571/tcp": [{ HostPort: "4571" }]
    },
    env: [
      "SERVICES=s3,ec2",
      "GATEWAY_LISTEN=4566"
    ],
    volumes: [
      {
        host_path: "/var/run/docker.sock",
        container_path: "/var/run/docker.sock"
      }
    ]
  },
  // Servicio compuesto: Se definirán ambos contenedores a la vez
  ollamaweb: {
    services: ["ollama", "openwebui"]
  }
};

module.exports = servicesConfig;
