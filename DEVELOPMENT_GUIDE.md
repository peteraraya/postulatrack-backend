# 📘 Guía de Desarrollo y Buenas Prácticas (PostulaTrack)

Esta guía establece el flujo de trabajo estándar, las reglas de codificación y las buenas prácticas para garantizar un desarrollo profesional, escalable y colaborativo en PostulaTrack.

---

## 1. Flujo de Trabajo en Git (Git Flow)

Adoptamos una versión simplificada de Git Flow para organizar el desarrollo.

### Ramas Principales
- **`main`**: Rama de producción. Todo el código aquí es estable y desplegable. **Nunca se hace commit directo a `main`.**
- **`develop`**: Rama principal de desarrollo. Contiene el código de la próxima versión a lanzar. Las nuevas características se integran aquí.

### Ramas de Apoyo
Al trabajar en una nueva tarea, siempre debes crear una rama temporal a partir de `develop`:
- **Features (`feature/nombre-de-la-tarea`)**: Para nuevas funcionalidades. Ej: `feature/ai-integration`.
- **Bugfixes (`bugfix/descripcion-del-bug`)**: Para solucionar errores no críticos en desarrollo. Ej: `bugfix/fix-jwt-payload`.
- **Hotfixes (`hotfix/descripcion-del-hotfix`)**: Para solucionar errores críticos en producción (salen desde `main`). Ej: `hotfix/db-connection-crash`.

### Flujo de Integración (Pull Requests)
1. Clona/Actualiza `develop`: `git checkout develop && git pull origin develop`
2. Crea tu rama: `git checkout -b feature/mi-nueva-funcion`
3. Desarrolla y haz commits descriptivos.
4. Sube tu rama: `git push origin feature/mi-nueva-funcion`
5. Crea un **Pull Request (PR)** hacia `develop`.
6. Solicita revisión (Code Review). Una vez aprobado, el PR se fusiona (Merge) y la rama se elimina.

---

## 2. Convenciones de Commits (Conventional Commits)

Utilizamos [Conventional Commits](https://www.conventionalcommits.org/es/v1.0.0/) para mantener un historial limpio y autogenerar Changelogs.

**Formato:** `<tipo>(<alcance opcional>): <descripción breve>`

**Tipos permitidos:**
- `feat:` Nueva funcionalidad. *(Ej: feat(ai): add job match analysis endpoint)*
- `fix:` Solución de un error. *(Ej: fix(profile): correct cv upload path)*
- `refactor:` Refactorización de código que no añade features ni arregla bugs.
- `docs:` Cambios solo en la documentación (README, Swagger).
- `style:` Cambios de formato (espacios, comas, Prettier).
- `test:` Agregar o modificar pruebas (Unitarias, E2E).
- `chore:` Cambios en configuración o dependencias (package.json, Dockerfile).

---

## 3. Estándares de Codificación (NestJS / TypeScript)

1. **Tipado Fuerte:** Evita usar `any` en la medida de lo posible. Define Interfaces o DTOs (Data Transfer Objects) para todo tipo de datos entrante o saliente.
2. **Uso de DTOs y Validación:** Todo body (`@Body`) de un controlador debe estar fuertemente tipado con un DTO y validado mediante decoradores de `class-validator` (ej. `@IsString()`, `@IsOptional()`).
3. **Responsabilidad Única:** 
   - **Controladores (`.controller.ts`)**: Solo deben encargarse de recibir la petición HTTP, validar la entrada, delegar la lógica al servicio, y retornar la respuesta.
   - **Servicios (`.service.ts`)**: Contienen toda la lógica de negocio.
4. **Manejo de Errores:** Utiliza las excepciones estándar de NestJS (Ej: `NotFoundException`, `BadRequestException`, `UnauthorizedException`) en lugar de arrojar errores genéricos.
5. **Inyección de Dependencias:** Evita instanciar clases manualmente con `new` si pueden ser inyectadas por el contenedor de NestJS (IoC).

---

## 4. Buenas Prácticas de Base de Datos (Prisma)

1. **Nunca modifiques la BD manualmente.** Todos los cambios en la estructura de la base de datos deben realizarse a través del archivo `schema.prisma`.
2. **Migraciones:** Cuando modifiques el esquema, genera una migración para llevar un control de versiones de la BD:
   ```bash
   npx prisma migrate dev --name descripcion_del_cambio
   ```
3. **Filtros e Índices:** Al realizar consultas complejas, asegúrate de utilizar selectores limitados (`select`) si no necesitas todo el modelo, y agrega `@@index` en el esquema de Prisma para las columnas que filtres frecuentemente.

---

## 5. Documentación de la API (Swagger)

Es estrictamente obligatorio documentar cada nuevo endpoint que se agregue utilizando los decoradores de Swagger.
- `@ApiTags('Nombre')` en el controlador para agrupar endpoints.
- `@ApiOperation({ summary: '...' })` para describir qué hace el endpoint.
- `@ApiResponse({ status: 200, description: '...' })` para documentar la respuesta de éxito y de error (ej: 400, 404).
- `@ApiBody({ type: MiDto })` o esquema definido para POST/PATCH/PUT.

---

## 6. Control de Calidad Continua

Antes de enviar un Pull Request o subir código, siempre debes ejecutar los siguientes comandos para garantizar que el código se ajusta a los estándares del equipo:

```bash
# 1. Formateo de código (Prettier)
npm run format

# 2. Análisis estático para detectar malas prácticas o errores de sintaxis (ESLint)
npm run lint

# 3. Verificación de construcción (TypeScript)
npm run build
```

Si implementaste código crítico, ejecuta las pruebas unitarias:
```bash
npm run test