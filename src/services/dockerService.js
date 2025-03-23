// services/dockerService.js
const express = require('express');
const router = express.Router();
const { exec } = require('child_process');

/**
 * Configuración de los comandos Docker para cada servicio.
 * Cada servicio define:
 * - run: comando para iniciar el contenedor.
 * - stop: comando para detener y eliminar el contenedor.
 * - port: comando para obtener el puerto mapeado.
 */
const servicesConfig = {
    wordpress: {
        run: 'docker run -d --name wordpress -p 8080:80 wordpress:latest',
        stop: 'docker stop wordpress & docker rm wordpress',
        port: 'docker port wordpress 80'
    },
    canvas: {
        run: 'docker run -d --name canvas -p 3000:3000 canvas:latest',
        stop: 'docker stop canvas & docker rm canvas',
        port: 'docker port canvas 3000'
    },
    ollama: {
        run: 'docker run -d --gpus=all -v ollama:/root/.ollama -p 11434:11434 --name ollama ollama/ollama && docker exec ollama ollama pull gemma3:1b',
        stop: 'docker stop ollama & docker rm ollama',
        port: 'docker port ollama 11434'
    },    
    openwebui: {
        run: `docker run -d --name openwebui --gpus=all -p 3000:8080 \
          -e ENABLE_OLLAMA_API=True \
          -e OLLAMA_BASE_URL=http://host.docker.internal:11434 \
          -v ollama:/root/.ollama \
          ghcr.io/open-webui/open-webui:main`,
        stop: 'docker stop openwebui & docker rm openwebui',
        port: 'docker port openwebui 8080'
    },
    ollamaweb: {
        run: `docker network create ollamaweb 2>nul & \
              docker run -d --gpus=all -v ollama:/root/.ollama --network ollamaweb -p 11434:11434 --name ollama ollama/ollama & \
              timeout /t 5 /nobreak >nul & \
              docker exec ollama ollama pull gemma3:1b & \
              docker run -d --name openwebui --gpus=all -p 3000:8080 \
              -e ENABLE_OLLAMA_API=True \
              -e OLLAMA_BASE_URL=http://ollama:11434 \
              -v ollama:/root/.ollama \
              --network ollamaweb \
              ghcr.io/open-webui/open-webui:main`,
        stop: `docker stop openwebui & docker rm openwebui & \
               docker stop ollama & docker rm ollama & \
               docker network rm ollamaweb`,
        port: `echo "Ollama: $(docker port ollama 11434) | OpenWebUI: $(docker port openwebui 8080)"`
    },    
};


/**
 * Ejecuta un comando Docker basado en la configuración del servicio.
 * 
 * @param {string} service - Nombre del servicio.
 * @param {string} type - Tipo de comando: "run", "stop" o "port".
 * @param {function} callback - Función callback que se llama con (error, output).
 */
function executeDockerCommand(service, type, callback) {
  const serviceConf = servicesConfig[service];
  if (!serviceConf || !serviceConf[type]) {
    return callback(new Error('Servicio no soportado o comando no definido'));
  }
  
  exec(serviceConf[type], (error, stdout, stderr) => {
    if (error) {
      return callback(new Error(`Error al ejecutar comando (${type}): ${stderr}`));
    }
    callback(null, stdout.trim());
  });
}

// Ruta para levantar el contenedor Docker para el servicio indicado
router.post('/:service', (req, res) => {
  const service = req.params.service;
  executeDockerCommand(service, 'run', (error, output) => {
    if (error) {
      return res.status(500).json({ error: error.message });
    }
    res.status(200).json({ message: `Contenedor de ${service} montado exitosamente`, output });
  });
});

// Ruta para detener y eliminar el contenedor Docker para el servicio indicado
router.delete('/:service', (req, res) => {
  const service = req.params.service;
  executeDockerCommand(service, 'stop', (error, output) => {
    if (error) {
      return res.status(500).json({ error: error.message });
    }
    res.status(200).json({ message: `Contenedor de ${service} detenido y eliminado exitosamente`, output });
  });
});

// Ruta para obtener el puerto mapeado del contenedor Docker para el servicio indicado
router.get('/:service/port', (req, res) => {
  const service = req.params.service;
  executeDockerCommand(service, 'port', (error, output) => {
    if (error) {
      return res.status(500).json({ error: error.message });
    }
    res.status(200).json({ message: `Puerto asignado para ${service}`, port: output });
  });
});

module.exports = router;
