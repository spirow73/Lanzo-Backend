const express = require('express');
const router = express.Router();
const { exec } = require('child_process');
const path = require('path');

/**
 * Ejecuta un comando de Terraform en Docker sin exponer detalles.
 * @param {string} servicePath - Ruta donde se encuentran los archivos de Terraform para el servicio.
 * @param {string} commandType - Tipo de comando: 'init', 'apply' o 'destroy'.
 * @param {function} callback - Función callback que se llama con (error) en caso de fallo o sin argumentos si es exitoso.
 */
function runCommand(servicePath, commandType, callback) {
  const normalizedPath = servicePath.replace(/\\/g, '/');
  let dockerCommand = '';

  switch (commandType) {
    case 'init':
      dockerCommand = `docker run --rm -v "${normalizedPath}":/workspace -w /workspace hashicorp/terraform:light init`;
      break;
    case 'apply':
      dockerCommand = `docker run --rm -v "${normalizedPath}":/workspace -w /workspace hashicorp/terraform:light apply -auto-approve`;
      break;
    case 'destroy':
      dockerCommand = `docker run --rm -v "${normalizedPath}":/workspace -w /workspace hashicorp/terraform:light destroy -auto-approve`;
      break;
    default:
      return callback(new Error('Tipo de comando no válido'));
  }

  exec(dockerCommand, (error) => {
    if (error) {
      return callback(new Error(`Error al ejecutar ${commandType}`));
    }
    callback();
  });
}

/**
 * Ejecuta en secuencia los comandos init, apply y destroy para un servicio.
 * @param {string} servicePath - Ruta del servicio.
 * @param {function} callback - Callback con (error) en caso de fallo o sin argumentos si es exitoso.
 */
function executeServiceCommands(servicePath, callback) {
  runCommand(servicePath, 'init', (error) => {
    if (error) return callback(error);
    runCommand(servicePath, 'apply', (error) => {
      if (error) return callback(error);
      runCommand(servicePath, 'destroy', (error) => {
        if (error) return callback(error);
        callback();
      });
    });
  });
}

// Ruta por defecto para pruebas generales
router.post('/execute', (req, res) => {
  const terraformPath = path.join(process.cwd(), 'terraform', 'test');
  executeServiceCommands(terraformPath, (error) => {
    if (error) {
      return res.status(500).json({ error: error.message });
    }
    res.status(200).json({ message: 'Operación completada con éxito' });
  });
});

// Ruta para el servicio "ollama"
router.post('/ollama', (req, res) => {
  const servicePath = path.join(process.cwd(), 'terraform', 'ollama');
  executeServiceCommands(servicePath, (error) => {
    if (error) {
      return res.status(500).json({ error: error.message });
    }
    res.status(200).json({ message: 'Operación completada con éxito' });
  });
});

// Ruta para el servicio "wordpress"
router.post('/wordpress', (req, res) => {
  const servicePath = path.join(process.cwd(), 'terraform', 'wordpress');
  executeServiceCommands(servicePath, (error) => {
    if (error) {
      return res.status(500).json({ error: error.message });
    }
    res.status(200).json({ message: 'Operación completada con éxito' });
  });
});

// Ruta para el servicio "odoo"
router.post('/odoo', (req, res) => {
  const servicePath = path.join(process.cwd(), 'services', 'odoo');
  executeServiceCommands(servicePath, (error) => {
    if (error) {
      return res.status(500).json({ error: error.message });
    }
    res.status(200).json({ message: 'Operación completada con éxito' });
  });
});

module.exports = router;
