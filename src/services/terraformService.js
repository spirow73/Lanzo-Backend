// services/terraformService.js
const express = require('express');
const router = express.Router();
const Docker = require('dockerode');
const docker = new Docker();
const path = require('path');
const fs = require('fs');

/**
 * Ejecuta un comando de Terraform en un contenedor usando dockerode.
 *
 * Se utiliza la imagen 'hashicorp/terraform:light' para ejecutar el comando en el directorio
 * donde se encuentran los archivos de Terraform, que se monta en /workspace.
 *
 * @param {string} servicePath - Ruta local con los archivos de Terraform.
 * @param {string} commandType - 'init', 'apply' o 'destroy'.
 * @returns {Promise<string>} - Logs resultantes de la ejecución del comando.
 * @throws {Error} - Si el comando falla.
 */
async function runTerraformCommand(servicePath, commandType) {
  const normalizedPath = servicePath.replace(/\\/g, '/');
  let command = [];
  switch (commandType) {
    case 'init':
      command = ['init'];
      break;
    case 'apply':
      command = ['apply', '-auto-approve'];
      break;
    case 'destroy':
      command = ['destroy', '-auto-approve'];
      break;
    default:
      throw new Error('Tipo de comando no válido');
  }

  // Variables de entorno para conectarse a Localstack o AWS (de prueba)
  const envVars = [
    'AWS_ACCESS_KEY_ID=test',
    'AWS_SECRET_ACCESS_KEY=test',
    'AWS_DEFAULT_REGION=us-east-1'
  ];

  // Opciones para crear el contenedor
  const containerOptions = {
    Image: 'hashicorp/terraform:light',
    Cmd: command,
    Env: envVars,
    HostConfig: {
      // Se monta el directorio de Terraform en /workspace dentro del contenedor
      Binds: [`${normalizedPath}:/workspace`]
    },
    WorkingDir: '/workspace'
  };

  // Crear y arrancar el contenedor
  const container = await docker.createContainer(containerOptions);
  await container.start();

  // Esperamos a que el contenedor finalice
  const result = await container.wait();

  // Obtenemos los logs (stdout y stderr) del contenedor
  const logStream = await container.logs({
    stdout: true,
    stderr: true,
    follow: false
  });

  // Convertir los logs a cadena leyendo el stream de forma adecuada
  const logs = await new Promise((resolve, reject) => {
    let result = '';
    logStream.on('data', chunk => result += chunk.toString('utf8'));
    logStream.on('end', () => resolve(result));
    logStream.on('error', reject);
  });

  // Eliminamos el contenedor (para limpiar recursos)
  await container.remove();

  if (result.StatusCode !== 0) {
    throw new Error(`Error ejecutando ${commandType}: ${logs}`);
  }
  return logs;
}

/**
 * Ejecuta secuencialmente los comandos 'init' y 'apply' para desplegar la infraestructura.
 *
 * @param {string} servicePath - Ruta donde se encuentran los archivos de Terraform.
 * @returns {Promise<object>} - Logs de las ejecuciones 'init' y 'apply'.
 */
async function deployTerraform(servicePath) {
  const initOutput = await runTerraformCommand(servicePath, 'init');
  const applyOutput = await runTerraformCommand(servicePath, 'apply');
  return { init: initOutput, apply: applyOutput };
}

/**
 * Endpoint para desplegar la infraestructura.
 * Se espera que los archivos de Terraform estén en la carpeta 'terraform/<service>'.
 */
router.post('/deploy/:service', async (req, res) => {
  const service = req.params.service;
  const terraformPath = path.join(process.cwd(), 'terraform', service);

  // Validación de existencia del directorio
  if (!fs.existsSync(terraformPath)) {
    return res.status(400).json({ error: 'Ruta de servicio no válida o inexistente' });
  }

  try {
    const outputs = await deployTerraform(terraformPath);
    res.status(200).json({ message: 'Despliegue completado con éxito', outputs });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * Endpoint para destruir la infraestructura.
 * Se utiliza el comando 'destroy' en la misma carpeta 'terraform/<service>'.
 */
router.post('/destroy/:service', async (req, res) => {
  const service = req.params.service;
  const terraformPath = path.join(process.cwd(), 'terraform', service);

  // Validación de existencia del directorio
  if (!fs.existsSync(terraformPath)) {
    return res.status(400).json({ error: 'Ruta de servicio no válida o inexistente' });
  }

  try {
    const destroyOutput = await runTerraformCommand(terraformPath, 'destroy');
    res.status(200).json({ message: 'Recursos destruidos con éxito', output: destroyOutput });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
