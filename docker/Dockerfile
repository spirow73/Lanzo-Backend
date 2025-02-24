# Usar Node.js con Alpine
FROM node:18-alpine

# Establecer directorio de trabajo dentro del contenedor
WORKDIR /usr/src/app

# Copiar package.json y package-lock.json desde la raíz del proyecto (no solo `docker/`)
COPY ../package*.json ./

# Instalar dependencias de producción
RUN npm install --only=production

# Copiar el resto del código desde la raíz del proyecto
COPY ../ ./

# Exponer el puerto
EXPOSE 4000

# Comando para producción
CMD ["node", "src/app.js"]
