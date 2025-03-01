require('dotenv').config();
const express = require('express');
const app = express();
const port = process.env.PORT || 3000;

// Middleware para parsear JSON
app.use(express.json());

// Importar y usar la ruta para Terraform
const terraformRoute = require('./services/terraformService');
app.use('/terraform', terraformRoute);

app.listen(port, () => {
  console.log(`Servidor corriendo en el puerto ${port}`);
});
