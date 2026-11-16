# Etapa 1: Build de la aplicación React con Node 22
FROM node:22-alpine AS build

WORKDIR /app

# Copiar manifests e instalar dependencias limpiamente
COPY package*.json ./
RUN npm ci

# Copiar el código fuente
COPY . .

# Argumento opcional para inyectar la URL del backend durante el build
ARG VITE_API_URL
ENV VITE_API_URL=$VITE_API_URL

# Compilar los estáticos a dist/
RUN npm run build

# Etapa 2: Servir los estáticos con Nginx Alpine liviano
FROM nginx:alpine

# Copiar los archivos compilados al directorio de Nginx
COPY --from=build /app/dist /usr/share/nginx/html

# Copiar la configuración con soporte para SPA (React Router)
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
