// services/dockerService.js

const express = require('express');
const router = express.Router();
const Docker = require('dockerode');
const servicesConfig = require('./dockerServicesConfig');

// Cliente Docker por defecto, en caso de que no se pase una IP
const defaultDocker = new Docker();

// Función para obtener el cliente Docker según la IP
function getDockerClient(ip) {
  if (ip) {
    return new Docker({
      host: ip,
      port: 2375
    });
  }
  return defaultDocker;
}

/**
 * Asegura que la red existe, creándola si es necesario, y conecta el contenedor a ella.
 * @param {object} container - Contenedor Docker.
 * @param {string} networkName - Nombre de la red.
 * @param {object} docker - Cliente Docker.
 */
async function attachContainerToNetwork(container, networkName, docker) {
  let network;
  try {
    network = docker.getNetwork(networkName);
    await network.inspect(); // Si no existe, lanzará error
  } catch (err) {
    // Crear la red si no existe
    network = await docker.createNetwork({ Name: networkName });
  }
  // Conecta el contenedor a la red
  await network.connect({ Container: container.id });
}

/**
 * Crea y levanta un contenedor basado en la configuración del servicio.
 * Si el servicio es compuesto (ej. "wordpressstack"), se crearán todos los contenedores listados en la propiedad "services".
 * @param {string} service - Nombre del servicio.
 * @param {string} [ip] - Dirección IP del servidor Docker.
 * @returns {Promise<object|object[]>} - Instancia del contenedor creado o un arreglo de contenedores.
 */
async function runContainer(service, ip) {
  const config = servicesConfig[service];
  if (!config) {
    throw new Error('Servicio no soportado');
  }

  // Si el servicio es compuesto, se ejecutan todos los subservicios
  if (config.services && Array.isArray(config.services)) {
    const containers = [];
    for (const subService of config.services) {
      const container = await runContainer(subService, ip);
      containers.push(container);
    }
    return containers;
  }

  const docker = getDockerClient(ip);
  const containerName = config.containerName;

  // 🧹 Eliminar contenedor existente (si existe)
  try {
    const existing = docker.getContainer(containerName);
    const data = await existing.inspect(); // Lanza error si no existe
    if (data) {
      try {
        await existing.stop();
      } catch (_) {}
      await existing.remove({ force: true });
    }
  } catch (err) {
    // No se encontró el contenedor, se continúa
  }

  // Configurar las opciones base para la creación del contenedor
  const containerOptions = {
    Image: config.image,
    name: config.containerName,
    ExposedPorts: {},
    Env: config.env || [],
    HostConfig: {
      PortBindings: {},
      Binds: config.binds || [],
      // Si se han definido volúmenes, configuramos tanto Volumes como Mounts
      Volumes: config.volumes?.reduce((acc, v) => {
        acc[v.container_path] = {};
        return acc;
      }, {}) || undefined,
      Mounts: config.volumes?.map(v => ({
        Target: v.container_path,
        Source: v.host_path,
        Type: "volume"
      })) || undefined,
      // Configurar restart policy si está definida
      RestartPolicy: config.restart ? { Name: config.restart } : undefined,
      Runtime: config.runtime || undefined
      // NOTA: No seteamos NetworkMode aquí para poder conectar manualmente después
    }
  };

  // Configurar el mapeo de puertos (si se han definido)
  for (const containerPort in config.portBindings || {}) {
    containerOptions.ExposedPorts[containerPort] = {};
    containerOptions.HostConfig.PortBindings[containerPort] = config.portBindings[containerPort];
  }

  // Si hay dependencias, iniciarlas primero
  if (config.depends_on && Array.isArray(config.depends_on)) {
    for (const dependency of config.depends_on) {
      await runContainer(dependency, ip);
    }
  }

  // Crear y arrancar el contenedor
  const container = await docker.createContainer(containerOptions);
  await container.start();

  // Si se definió una red en la configuración, conecta el contenedor a ella
  if (config.network) {
    await attachContainerToNetwork(container, config.network, docker);
  }

  // Ejecutar comando post-start si está definido (por ejemplo, para ejecutar "ollama pull llama3")
  if (config.postStartCmd) {
    await new Promise(resolve => setTimeout(resolve, 3000));
    const exec = await container.exec({
      Cmd: config.postStartCmd,
      AttachStdout: true,
      AttachStderr: true
    });
    exec.start((err, stream) => {
      if (err) throw err;
      stream.on('data', chunk => {
        console.log(`[${service}] ${chunk.toString()}`);
      });
    });
  }

  return container;
}

/**
 * Detiene y elimina el contenedor del servicio.
 * Si el servicio es compuesto, se detienen y eliminan todos los contenedores asociados.
 * @param {string} service - Nombre del servicio.
 * @param {string} [ip] - Dirección IP del servidor Docker.
 * @returns {Promise<void>}
 */
async function stopContainer(service, ip) {
  const config = servicesConfig[service];
  if (!config) throw new Error('Servicio no soportado');
  
  // Si es servicio compuesto, detener cada subservicio
  if (config.services && Array.isArray(config.services)) {
    for (const subService of config.services) {
      await stopContainer(subService, ip);
    }
    return;
  }
  
  const docker = getDockerClient(ip);
  const container = docker.getContainer(config.containerName);
  try {
    await container.stop();
  } catch (error) {
    // Ignorar error si ya está parado
  }
  await container.remove();
}

/**
 * Obtiene la configuración de puertos mapeados del contenedor Docker para el servicio.
 * Si es un servicio compuesto, retorna un objeto con cada subservicio y sus puertos.
 * @param {string} service - Nombre del servicio.
 * @param {string} [ip] - Dirección IP del servidor Docker.
 * @returns {Promise<object>} - Información de puertos.
 */
async function getPortMapping(service, ip) {
  const config = servicesConfig[service];
  if (!config) throw new Error('Servicio no soportado');
  
  // Si es un servicio compuesto: obtener mapeo de cada subservicio
  if (config.services && Array.isArray(config.services)) {
    const mappings = {};
    for (const subService of config.services) {
      mappings[subService] = await getPortMapping(subService, ip);
    }
    return mappings;
  }
  
  const docker = getDockerClient(ip);
  const container = docker.getContainer(config.containerName);
  const data = await container.inspect();
  return data.NetworkSettings.Ports;
}

// Rutas de la API:

// Levantar contenedor(es)
router.post('/:service', async (req, res) => {
  const service = req.params.service;
  const { ip } = req.body;
  try {
    const containers = await runContainer(service, ip);
    res.status(200).json({ message: `Contenedor(es) para ${service} levantado(s) exitosamente`, containers });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Detener y eliminar contenedor(es)
router.delete('/:service', async (req, res) => {
  const service = req.params.service;
  const { ip } = req.body;
  try {
    await stopContainer(service, ip);
    res.status(200).json({ message: `Contenedor(es) para ${service} detenido(s) y eliminado(s) exitosamente` });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Obtener puertos mapeados
router.get('/:service/port', async (req, res) => {
  const service = req.params.service;
  const ip = req.query.ip;
  try {
    const ports = await getPortMapping(service, ip);
    res.status(200).json({ message: `Puertos mapeados para ${service}`, ports });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
