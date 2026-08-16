# 🔍 Auditoría de Código — PostulaTrack Backend

> Fecha: 2026-08-16 · Rama: `main` (commit `68d9b52`)
> Método: revisión manual del código fuente + `npm run lint`, `npm run build`, `npm test`.

---

## Estado general

| Verificación | Resultado |
| :--- | :--- |
| `npm run build` | ✅ Compila correctamente |
| `npm run lint` | ❌ **316 problemas (309 errores, 7 warnings)** |
| `npm test` | ❌ **4 de 6 suites fallan** |
| `test:e2e` | ❌ Espera `"Hello World!"` pero el controller devuelve JSON (fallaría) |

---

## 1. Problemas de seguridad (críticos)

| # | Severidad | Estado | Descripción | Ubicación |
| :--: | :--: | :--: | :--- | :--- |
| 1.1 | 🔴 Alta | ✅ Corregido | **SSRF** en `extract-url`: `fetch(url)` con URL controlada por el usuario. Ahora valida protocolo HTTP(S), resuelve el hostname y bloquea IPs privadas/reservadas/loopback con timeout. | `src/modules/applications/applications.service.ts:233` |
| 1.2 | 🔴 Alta | ✅ Corregido | **IDOR** en AI: `generateMessage` y `generateInterviewPrep` recibían un `applicationId` sin verificar que pertenezca al usuario autenticado. Ahora consultan con `where: { id, userId }`. | `src/modules/ai/ai.controller.ts:35,96`, `ai.service.ts` |
| 1.3 | 🔴 Alta | ✅ Corregido | **Endpoint público** `POST /api/scraping/trigger` sin `JwtAuthGuard`: ahora protegido con `@UseGuards(JwtAuthGuard)`. | `src/modules/scraping/scraping.controller.ts` |
| 1.4 | 🟠 Media | Pendiente | **Token JWT en la URL** de redirección del callback de Google. Queda en historial del navegador y logs de proxies. | `src/modules/auth/auth.controller.ts:47` |
| 1.5 | 🟠 Media | Pendiente | **Sin rate limiting** en los proxies de IA (Groq/Gemini/OpenRouter) y en `fileBase64` (solo límite global de 10 MB). Abuso de coste. | `src/modules/ai/ai.controller.ts:114-190` |

### Mitigaciones sugeridas

- **1.1**: validar protocolo (`https`), resolver el host y bloquear IPs privadas/loopback/link-local (o usar un allowlist de dominios).
- **1.2**: en los métodos del servicio, buscar la postulación con `where: { id: applicationId, userId }` antes de usar el recurso.
- **1.3**: proteger con `@UseGuards(JwtAuthGuard)` o restringir a un rol admin.
- **1.4**: alternativas: POST al frontend con mensaje, token de un solo uso de corta vida, o `window.postMessage` desde una página de callback propia.
- **1.5**: agregar `@nestjs/throttler` global y un límite de tamaño explícito para `fileBase64`.

---

## 2. Configuración y despliegue

| # | Severidad | Estado | Descripción | Ubicación |
| :--: | :--: | :--: | :--- | :--- |
| 2.1 | 🔴 Alta | ✅ Corregido | **`.env.example` roto**: las líneas 18–33 tenían comillas incrustadas (`"CLOUDINARY_CLOUD_NAME=tu_cloud_name"`). Reescrito con formato limpio e incluye las variables de Pusher. | `.env.example` |
| 2.2 | 🔴 Alta | ✅ Corregido | **Docker no levantaba**: `docker-compose.yml` usaba `postgres:15-alpine`, que no incluye pgvector; la migración `init` ejecuta `CREATE EXTENSION vector` y fallaba. Ahora usa `pgvector/pgvector:pg15`. | `docker-compose.yml` |
| 2.3 | 🟠 Media | Pendiente | **Pusher nunca se inicializa**: faltan `PUSHER_*` en `.env` y `.env.production`, y `NotificationsService` no se inyecta en ningún módulo (código muerto). | `src/modules/notifications/*` |
| 2.4 | 🟡 Baja | Pendiente | El backend **no se inicia sin** `GOOGLE_CLIENT_ID/SECRET/CALLBACK_URL` (validación Joi estricta), aunque no se use OAuth. | `src/app.module.ts:31-39` |

### Mitigaciones sugeridas

- **2.1**: reescribir `.env.example` con formato `KEY=value` limpio e incluir las variables de Pusher.
- **2.2**: usar imagen `pgvector/pgvector:pg15` (mismo usuario/password/db).
- **2.3**: inyectar `NotificationsService` donde corresponda (postulaciones, scraping, alertas) o eliminarlo.
- **2.4**: hacer opcionales las variables de OAuth en la validación Joi.

---

## 3. Calidad de código

| # | Severidad | Descripción | Ubicación |
| :--: | :--: | :--- | :--- |
| 3.1 | 🟠 Media | **Lint roto (309 errores)**: predominan `@typescript-eslint/no-unsafe-*` por uso masivo de `any`, `require()`, `await` de no-promesas y variables sin usar. Además el script `lint` usa `--fix`. | `package.json`, `src/**` |
| 3.2 | 🟠 Media | **Tests unitarios rotos**: 4/6 suites fallan por no proveer mock de `PrismaService` (y `AiService`). | `src/modules/ai/*.spec.ts`, `src/modules/job-alerts/*.spec.ts` |
| 3.3 | 🟠 Media | **Test e2e obsoleto**: espera `"Hello World!"`, pero el controller devuelve un objeto JSON. | `test/app.e2e-spec.ts` |
| 3.4 | 🟠 Media | **`calculateForProfile` en cada request**: `GET /recommendations` recalcula el match contra todas las ofertas (miles de queries por request). | `src/modules/recommendation/recommendation.service.ts:188` |
| 3.5 | 🟡 Baja | **CV "parsing" inexistente**: el archivo solo se sube a Cloudinary; los datos del perfil llegan como JSON del frontend. El JSON parseado en el controller **no pasa por el `ValidationPipe`**, por lo que los DTO anidados (`workExperiences`, `educations`) no se validan realmente. | `src/modules/profile/profile.controller.ts:129-149` |
| 3.6 | 🟡 Baja | **Dependencias muertas**: `argon2`, `bcrypt`, `node-fetch` y sus `@types` no se usan en ningún lado. | `package.json` |
| 3.7 | 🟡 Baja | `saveFavorite` hace `upsert` sin verificar que la oferta exista → error 500 (FK) si el `offerId` es inválido. | `src/modules/job-offers/job-offers.service.ts:104-110` |
| 3.8 | 🟡 Baja | **Paginación sin tope**: `limit` no tiene máximo (ej. `limit=1000000`). | `job-offers.service.ts`, `recommendation.service.ts` |
| 3.9 | 🟡 Baja | **Sin `$disconnect`** en apagado de la app (falta `enableShutdownHooks`). | `src/main.ts`, `src/prisma/prisma.service.ts` |
| 3.10 | 🟡 Baja | **Uso inconsistente de `process.env`** en lugar de `ConfigService` (dificulta testing). | `src/**` |
| 3.11 | 🟡 Baja | **Archivos de prueba en la raíz del repo**: `test-apps.ts`, `test-login.html`, `test.pdf`, `list_models.js`. | raíz |

---

## 4. Funcionalidad faltante / pendiente

- **JobAlerts es un stub**: solo `createAlert`; faltan listar/eliminar alertas, un worker que matchee ofertas nuevas contra las alertas y el envío de notificaciones.
- **Notificaciones sin conectar**: `NotificationsService` (Pusher) existe pero no se dispara desde postulaciones, scraping ni alertas.
- **Embeddings**: el campo `embedding vector(1536)` en `JobOffer` nunca se llena; no hay generación de embeddings ni búsqueda semántica.
- **Endpoints de IA con mock estático**: `generateMessage`, `translateMessage`, `analyzeOffer`, `generateInterviewPrep` no usan los clientes reales ya implementados (`callGroq`, `callGemini`, `callOpenRouter`).
- **Autenticación**: sin logout/revocación de tokens, sin refresh tokens, sin roles/admin.
- **Perfil**: no hay endpoint simple de crear/actualizar perfil sin `multipart`.
- **CI/CD**: no hay pipeline (GitHub Actions) pese al flujo Git Flow documentado en `DEVELOPMENT_GUIDE.md`.
- **README desactualizado**: la tabla de módulos no incluye `NotificationsModule`.

---

## 5. Plan de acción sugerido (por prioridad)

> Estado: **sección 1.1–1.3 y 2.1–2.2 corregidas** (2026-08-16). Lo siguiente pendiente:

1. **Inmediato (seguridad)**: rate limiting en endpoints de IA (1.5), evaluar token JWT en URL del callback (1.4).
2. **Inmediato (despliegue)**: agregar `PUSHER_*` a `.env`/`.env.production` y conectar `NotificationsService`, o eliminar el módulo (2.3).
3. **Corto plazo**: arreglar lint (eliminar `--fix` del script y resolver errores), mockear `PrismaService` en tests, corregir e2e.
4. **Medio plazo**: validación del JSON de perfil con `ValidationPipe`, tope de paginación, quitar dependencias muertas y archivos basura.
5. **Funcionalidad**: conectar notificaciones y alertas, integrar IA real, llenar embeddings o eliminar el campo.
