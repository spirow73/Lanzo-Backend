const express = require('express');
const router = express.Router();
const { exec } = require('child_process');
const path = require('path');

router.post('/execute', (req, res) => {
  // Ruta del directorio de Terraform
  let terraformPath = path.join(process.cwd(), 'terraform', 'test');
  terraformPath = terraformPath.replace(/\\/g, '/'); // Normalizar para Docker

  // Ejecutar Terraform init, apply y destroy en tres comandos separados
  const dockerInitCommand = `docker run --rm -v "${terraformPath}":/workspace -w /workspace hashicorp/terraform:light init`;
  const dockerApplyCommand = `docker run --rm -v "${terraformPath}":/workspace -w /workspace hashicorp/terraform:light apply -auto-approve`;
  const dockerDestroyCommand = `docker run --rm -v "${terraformPath}":/workspace -w /workspace hashicorp/terraform:light destroy -auto-approve`;

  exec(dockerInitCommand, (error, stdout, stderr) => {
    if (error) {
      console.error(`Error ejecutando terraform init: ${error.message}`);
      return res.status(500).json({ error: error.message });
    }
    if (stderr) {
      console.error(`stderr: ${stderr}`);
    }
    console.log(`stdout: ${stdout}`);
    
    // Ejecutar terraform apply solo si init fue exitoso
    exec(dockerApplyCommand, (error, stdout, stderr) => {
      if (error) {
        console.error(`Error ejecutando terraform apply: ${error.message}`);
        return res.status(500).json({ error: error.message });
      }
      if (stderr) {
        console.error(`stderr: ${stderr}`);
      }
      console.log(`stdout: ${stdout}`);
      
      // Ejecutar terraform destroy después de apply
      exec(dockerDestroyCommand, (error, stdout, stderr) => {
        if (error) {
          console.error(`Error ejecutando terraform destroy: ${error.message}`);
          return res.status(500).json({ error: error.message });
        }
        if (stderr) {
          console.error(`stderr: ${stderr}`);
        }
        console.log(`stdout: ${stdout}`);
        return res.status(200).json({ stdout });
      });
    });
  });
});

module.exports = router;