# Usar Node.js con Alpine
FROM node:18-alpine

# Establecer directorio de trabajo
WORKDIR /usr/src/app

# Copiar package.json desde la raíz
COPY ../package*.json ./

# Instalar dependencias
RUN npm install

# Instalar nodemon globalmente
RUN npm install -g nodemon

# Copiar el código (pero se sobrescribirá con volúmenes en docker-compose.override.yml)
COPY ../ ./

# Comando para desarrollo
CMD ["npm", "run", "dev"]
