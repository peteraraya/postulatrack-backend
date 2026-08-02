<div align="center">
  <h1>🚀 PostulaTrack Backend</h1>
  <p><i>Plataforma inteligente para la agregación, recomendación y gestión del ciclo de vida de ofertas de empleo.</i></p>

  <p>
    <img src="https://img.shields.io/badge/NestJS-E0234E?style=for-the-badge&logo=nestjs&logoColor=white" alt="NestJS" />
    <img src="https://img.shields.io/badge/Prisma-3982CE?style=for-the-badge&logo=Prisma&logoColor=white" alt="Prisma" />
    <img src="https://img.shields.io/badge/PostgreSQL-316192?style=for-the-badge&logo=postgresql&logoColor=white" alt="PostgreSQL" />
    <img src="https://img.shields.io/badge/Docker-2496ED?style=for-the-badge&logo=docker&logoColor=white" alt="Docker" />
  </p>
</div>

---

## 📖 Tabla de Contenidos

- [Sobre el Proyecto](#-sobre-el-proyecto)
- [Características Principales](#-características-principales)
- [Arquitectura y Módulos](#-arquitectura-y-módulos)
- [Requisitos Previos](#-requisitos-previos)
- [Configuración de Entorno](#-configuración-de-entorno)
- [Guía de Inicio Rápido (Docker)](#-guía-de-inicio-rápido-docker-recomendado)
- [Inicialización Manual (Local)](#-inicialización-manual-local)
- [Documentación API (Swagger)](#-documentación-api-swagger)
- [Scripts y Testing](#-scripts-y-testing)

---

## 🎯 Sobre el Proyecto

**PostulaTrack** es un backend robusto diseñado para automatizar y mejorar la experiencia de búsqueda de empleo. A través de scraping programado y motores de coincidencia (match scoring), la plataforma provee a los usuarios recomendaciones de trabajos altamente personalizadas, además de un control exhaustivo sobre el estado de sus postulaciones.

---

## ✨ Características Principales

- 🔐 **Autenticación Segura**: Integración completa de OAuth2 con Google y emisión de JWT.
- 📄 **Ingesta de CVs Inteligente**: Parsing de datos de Currículum para enriquecer el perfil del usuario.
- 🔎 **Motores de Recomendación**: Análisis de compatibilidad (Skills, Location, Modalidad).
- 🕸 **Scraping Asíncrono**: Recolección de ofertas a través de trabajos programados de forma nativa en NestJS.
- 📊 **Gestión de Postulaciones**: Pipelines y tracking de estados de postulación (Sent, Interview, Offer, Rejected).
- 📚 **Documentación Interactiva**: API completamente documentada con OpenAPI (Swagger).

---

## 🏗 Arquitectura y Módulos

El proyecto sigue una arquitectura modular en NestJS para facilitar la escalabilidad y el mantenimiento:

| Módulo | Descripción |
| :--- | :--- |
| **`AuthModule`** | Emisión y validación de JWT, Integración con Google OAuth2 (Passport). |
| **`ProfileModule`** | Gestión de perfil de usuario (Habilidades, Experiencia, Educación). |
| **`JobOffersModule`** | Buscador paginado y filtrado de ofertas disponibles. |
| **`ApplicationsModule`** | CRUD y máquina de estados (event-tracking) de postulaciones. |
| **`ScrapingModule`** | Tareas programadas encargadas de agregar nuevas ofertas a la BD. |
| **`RecommendationModule`**| Motor para calcular el *Match Score* entre Usuarios y Ofertas. |
| **`AiModule`** | Funcionalidades de Inteligencia Artificial para análisis de ofertas y preparación de entrevistas. |
| **`JobAlertsModule`** | Configuración de alertas personalizadas para nuevas ofertas de empleo. |

---

## ⚙️ Requisitos Previos

Asegúrate de contar con las siguientes herramientas instaladas en tu sistema:
- [Node.js](https://nodejs.org/en/) (v18 o superior)
- [Docker](https://www.docker.com/) & [Docker Compose](https://docs.docker.com/compose/) (opcional, para BD)
- [NPM](https://www.npmjs.com/) (o Yarn / pnpm)

---

## 🔑 Configuración de Entorno

Antes de iniciar el proyecto, necesitas configurar tus variables de entorno.
1. Crea una copia del archivo de ejemplo:
   ```bash
   cp .env.example .env
   ```
2. Rellena `.env` con tus credenciales (el ejemplo por defecto funcionará de inmediato con Docker):
   ```env
   # API Configuration
   PORT=3000

   # Database Settings (PostgreSQL + pgvector)
   DATABASE_URL="postgresql://postgres:postgres@db:5432/postulatrack?schema=public"

   # Authentication Secrets
   JWT_SECRET="tu_secreto_super_seguro"
   GOOGLE_CLIENT_ID="tu-google-client-id"
   GOOGLE_CLIENT_SECRET="tu-google-client-secret"
   GOOGLE_CALLBACK_URL="http://localhost:3000/api/auth/google/callback"
   FRONTEND_URL="http://localhost:4200"
   ```

---

## 🐳 Guía de Inicio Rápido (Docker Recomendado)

Hemos configurado un ecosistema Docker completo (API y Base de datos PostgreSQL) con una imagen **Multi-stage** lista tanto para desarrollo como producción.

### 1. Iniciar Entorno de Desarrollo
Para levantar la infraestructura con **Hot-Reloading** habilitado, ejecuta:
```bash
docker-compose up --build
```
> **Nota:** La API correrá en `http://localhost:3000`. Cualquier cambio en el directorio `src/` se sincronizará y recargará el servidor automáticamente.

### 2. Ejecutar Migraciones
Con los contenedores corriendo, abre otra terminal y aplica las migraciones a la BD:
```bash
docker exec -it postulatrack_api npx prisma migrate dev
```

### 3. Compilación para Producción (Multi-stage)
Si deseas construir una imagen final, liviana y sin dependencias de desarrollo:
```bash
docker build --target production -t postulatrack-api:latest .
```

---

## 💻 Inicialización Manual (Local)

Si prefieres ejecutar el código Node.js directamente en tu máquina anfitriona:

1. **Instala las dependencias**:
   ```bash
   npm install
   ```
2. **Levanta los servicios de infraestructura** (Postgres):
   ```bash
   # Asegúrate de configurar DATABASE_URL con "localhost" en lugar de "db" en tu .env
   docker-compose up -d db
   ```
3. **Ejecuta las migraciones**:
   ```bash
   npx prisma migrate dev
   ```
   *(Importante: Tu PostgreSQL debe tener la extensión `vector` habilitada para Prisma).*
4. **Arranca la aplicación**:
   ```bash
   npm run start:dev
   ```

---

## 📚 Documentación API (Swagger)

Toda la estructura de endpoints de la aplicación se encuentra documentada profesionalmente utilizando Swagger.

Una vez que el servidor esté en ejecución, puedes acceder a la interfaz interactiva en:  
👉 **[http://localhost:3000/api/docs](http://localhost:3000/api/docs)**

Encontrarás detalles precisos sobre Request Bodies, Query Parameters, Headers (Bearer Auth) y Response schemas.

---

## 🧪 Scripts y Testing

El proyecto contiene diferentes comandos pre-configurados para verificar la calidad del software:

```bash
# Ejecutar linter
npm run lint

# Formatear código (Prettier)
npm run format

# Ejecutar tests unitarios
npm run test

# Ejecutar tests End-to-End (E2E)
npm run test:e2e

# Verificar cobertura de testing
npm run test:cov