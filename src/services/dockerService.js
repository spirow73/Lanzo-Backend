// services/dockerService.js
const express = require('express');
const router = express.Router();
const Docker = require('dockerode');
const docker = new Docker();

// Configuración de cada servicio usando dockerode.
const servicesConfig = {
  wordpress: {
    image: 'wordpress:latest',
    containerName: 'wordpress',
    portBindings: {
      "80/tcp": [{ HostPort: "8080" }]
    }
  },
  canvas: {
    image: 'canvas:latest',
    containerName: 'canvas',
    portBindings: {
      "3000/tcp": [{ HostPort: "3000" }]
    }
  },
  ollama: {
    image: 'ollama/ollama',
    containerName: 'ollama',
    portBindings: {
      "11434/tcp": [{ HostPort: "11434" }]
    },
    // Mapeo de volúmenes para persistencia
    binds: ['ollama:/root/.ollama'],
    // Uso del runtime de NVIDIA si es necesario
    runtime: 'nvidia'
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
  // Servicio Localstack para levantar S3, EC2 y otros servicios comunes.
  localstack: {
    image: 'localstack/localstack',
    containerName: 'localstack',
    portBindings: {
      "4566/tcp": [{ HostPort: "4566" }],
      "4571/tcp": [{ HostPort: "4571" }],
    },
    env: [
      "SERVICES=s3,ec2",         // Puedes agregar otros servicios separados por comas (e.g., dynamodb,sqs)
      "GATEWAY_LISTEN=4566",
    ],
    volumes: [
      {
        host_path: "/var/run/docker.sock",
        container_path: "/var/run/docker.sock"
      }
    ]
  }  
  // Se puede extender la configuración para otros servicios según se requiera.
};

/**
 * Crea y levanta un contenedor basado en la configuración del servicio.
 * @param {string} service - Nombre del servicio.
 * @returns {Promise<object>} - Instancia del contenedor creado.
 */
async function runContainer(service) {
  const config = servicesConfig[service];
  if (!config) {
    throw new Error('Servicio no soportado');
  }

  // Configurar opciones base para la creación del contenedor
  const containerOptions = {
    Image: config.image,
    name: config.containerName,
    ExposedPorts: {},
    HostConfig: {
      PortBindings: {},
      Binds: config.binds || []
    },
    Env: config.env || []
  };

  // Configurar el mapeo de puertos
  for (const containerPort in config.portBindings) {
    containerOptions.ExposedPorts[containerPort] = {};
    containerOptions.HostConfig.PortBindings[containerPort] = config.portBindings[containerPort];
  }

  // Si el servicio requiere GPU, se añade el runtime correspondiente
  if (config.runtime) {
    containerOptions.HostConfig.Runtime = config.runtime;
  }

  // Crear y arrancar el contenedor
  const container = await docker.createContainer(containerOptions);
  await container.start();
  return container;
}

/**
 * Detiene y elimina el contenedor del servicio.
 * @param {string} service - Nombre del servicio.
 * @returns {Promise<void>}
 */
async function stopContainer(service) {
  const config = servicesConfig[service];
  if (!config) {
    throw new Error('Servicio no soportado');
  }
  const container = docker.getContainer(config.containerName);
  try {
    // Intentar detener el contenedor; si ya está detenido, se ignora el error.
    await container.stop();
  } catch (error) {
    // Ignorar error si el contenedor ya está parado.
  }
  await container.remove();
}

/**
 * Obtiene la configuración de puertos mapeados del contenedor Docker para el servicio.
 * @param {string} service - Nombre del servicio.
 * @returns {Promise<object>} - Información de puertos.
 */
async function getPortMapping(service) {
  const config = servicesConfig[service];
  if (!config) {
    throw new Error('Servicio no soportado');
  }
  const container = docker.getContainer(config.containerName);
  const data = await container.inspect();
  return data.NetworkSettings.Ports;
}

// Ruta para levantar el contenedor Docker para el servicio indicado
router.post('/:service', async (req, res) => {
  const service = req.params.service;
  try {
    await runContainer(service);
    res.status(200).json({ message: `Contenedor de ${service} montado exitosamente` });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Ruta para detener y eliminar el contenedor Docker para el servicio indicado
router.delete('/:service', async (req, res) => {
  const service = req.params.service;
  try {
    await stopContainer(service);
    res.status(200).json({ message: `Contenedor de ${service} detenido y eliminado exitosamente` });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Ruta para obtener el puerto mapeado del contenedor Docker para el servicio indicado
router.get('/:service/port', async (req, res) => {
  const service = req.params.service;
  try {
    const ports = await getPortMapping(service);
    res.status(200).json({ message: `Puertos mapeados para ${service}`, ports });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
