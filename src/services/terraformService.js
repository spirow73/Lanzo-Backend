// src/services/terraformService.js
const { exec } = require('child_process');

const runTerraform = (configDir) => {
  return new Promise((resolve, reject) => {
    // Ejemplo de comando para ejecutar Terraform en un contenedor Docker
    const command = `
      docker run --rm -v ${configDir}:/workspace -w /workspace hashicorp/terraform:light init &&
      docker run --rm -v ${configDir}:/workspace -w /workspace hashicorp/terraform:light apply -auto-approve
    `;

    exec(command, (error, stdout, stderr) => {
      if (error) {
        return reject(stderr || error.message);
      }
      resolve(stdout);
    });
  });
};

module.exports = { runTerraform };
