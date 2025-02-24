// src/app.js
require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const connectDB = require('../config/database');
const routes = require('./routes'); // Archivo que reunirá todas las rutas

const app = express();
const port = process.env.PORT || 4000;

// Conectar a la base de datos
connectDB();

// Middleware
app.use(bodyParser.json());

// Rutas de la API
app.use('/api', routes);

// Ruta de salud
app.get('/health', (req, res) => {
  res.send('Lanzo Backend is running!');
});

// Iniciar el servidor
app.listen(port, () => {
  console.log(`Server is listening on port ${port}`);
});