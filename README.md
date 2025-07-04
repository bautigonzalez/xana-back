# Xana Backend API

Backend API para Xana - Asistente Médico con IA. Encuentra farmacias de turno, centros médicos y recibe orientación médica.

## 🚀 Instalación Local

1. Clona el repositorio:
```bash
git clone <tu-repo-url>
cd xana-back
```

2. Instala las dependencias:
```bash
npm install
```

3. Configura las variables de entorno:
```bash
cp env.example .env
# Edita .env con tus configuraciones
```

4. Inicia el servidor:
```bash
# Desarrollo
npm run dev

# Producción
npm start
```

## 🚂 Despliegue en Railway

### Opción 1: Desde GitHub (Recomendado)
1. Conecta tu repositorio de GitHub a Railway
2. Railway detectará automáticamente que es un proyecto Node.js
3. Configura las variables de entorno en Railway Dashboard
4. ¡Listo! Se desplegará automáticamente

### Opción 2: Desde CLI
1. Instala Railway CLI:
```bash
npm install -g @railway/cli
```

2. Login y despliega:
```bash
railway login
railway init
railway up
```

### Variables de Entorno en Railway
Configura estas variables en Railway Dashboard:
- `NODE_ENV=production`
- `FRONTEND_URL=https://xanasalud.com`
- `PORT=3001` (Railway lo asigna automáticamente)

## ☁️ Preparación para GCP (Futuro)

El proyecto está preparado para migrar a Google Cloud Platform:

- **App Engine**: Solo necesitas un `app.yaml`
- **Cloud Run**: Compatible con contenedores Docker
- **Compute Engine**: Funciona con cualquier VM

### Para migrar a GCP:
1. Crear `app.yaml` para App Engine
2. Configurar `Dockerfile` para Cloud Run
3. Actualizar variables de entorno
4. Configurar Cloud Build

## 📡 Endpoints

- `GET /` - Información general de la API
- `GET /health` - Estado de salud del servidor
- `GET /api` - Información de la API
- `GET /api/pharmacies` - Farmacias (próximamente)
- `GET /api/centers` - Centros médicos (próximamente)

## 🛠️ Tecnologías

- Node.js
- Express.js
- CORS
- Helmet (seguridad)
- Morgan (logging)

## 📝 Scripts

- `npm start` - Inicia el servidor en producción
- `npm run dev` - Inicia el servidor en desarrollo con nodemon

## 🔧 Configuración

El servidor corre por defecto en el puerto 3001. Railway asignará automáticamente un puerto en producción.

## 🌐 CORS

Configurado para permitir requests desde:
- **Desarrollo**: `http://localhost:3000`, `http://localhost:5173`
- **Producción**: `https://xanasalud.com`, `https://www.xanasalud.com`
- **Netlify**: `https://xana-ia.netlify.app`

## 🤝 Contribución

1. Fork el proyecto
2. Crea una rama para tu feature (`git checkout -b feature/AmazingFeature`)
3. Commit tus cambios (`git commit -m 'Add some AmazingFeature'`)
4. Push a la rama (`git push origin feature/AmazingFeature`)
5. Abre un Pull Request

## 📄 Licencia

Este proyecto está bajo la Licencia MIT. 