require('dotenv').config();
const express = require('express');
const app = express();
const port = process.env.PORT || 3000;

// Middleware para parsear JSON
app.use(express.json());

// Importar y usar la ruta para Terraform
const terraformRoute = require('./services/terraformService');
app.use('/terraform', terraformRoute);

// Importar y usar la ruta para Docker
const dockerRoute = require('./services/dockerService');
app.use('/docker', dockerRoute);

app.listen(port, () => {
  console.log(`Servidor corriendo en el puerto ${port}`);
});
