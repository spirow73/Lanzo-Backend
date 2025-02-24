// src/routes/index.js
const express = require('express');
const router = express.Router();

// Ejemplo: endpoint para iniciar un despliegue
router.post('/deploy', async (req, res) => {
  // Aquí se llamará al servicio que genera el archivo Terraform y lanza el contenedor
  res.json({ message: 'Deploy endpoint triggered' });
});

module.exports = router;