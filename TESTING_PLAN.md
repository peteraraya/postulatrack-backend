# Plan de Pruebas Unitarias - PostulaTrack Backend

## Objetivo
Establecer e implementar un marco de pruebas unitarias robusto para asegurar la calidad y estabilidad de toda la lógica de negocio (Servicios), controladores y guards dentro de la aplicación.

## Estrategia de Pruebas
1. **Framework**: `Jest` con `@nestjs/testing`.
2. **Mocking de Base de Datos**: Uso de `jest-mock-extended` para simular `PrismaService` y aislar las pruebas de la base de datos real.
3. **Estructura**: Las pruebas vivirán junto al código (archivos `.spec.ts`).
4. **Priorización**:
   - Fase 1: Servicios Core (`ApplicationsService`, `AuthService`, `ProfileService`)
   - Fase 2: Controladores y Guardias de Seguridad (JWT Guards).
   - Fase 3: Tareas asíncronas y Scraping (`ScrapingService`, `JobOffersService`).

## Pasos de Implementación
1. ✅ **Setup inicial**: Crear rama `feature/unit-tests`, revisar configuración de Jest e instalar `jest-mock-extended`.
2. 🔄 **Ejemplo de prueba base**: Crear la configuración global de mock de Prisma (`prisma.service.spec.ts` o utilitario).
3. 🔄 **Implementar pruebas de `ApplicationsService`**: Probar métodos críticos como `createManual`, verificando que lance errores 400 en lugar de 500 y devuelva correctamente los datos simulados.
4. ⏳ **Extender a los demás módulos**: (Auth, Perfiles, Scraping, AI).

## Estructura de Mocks (Prisma)
Se creará un singleton para mockear `PrismaClient` usando `mockDeep<PrismaClient>()`. Esto permitirá sobreescribir las respuestas de la BD directamente en cada prueba sin tocar la BD de PostgreSQL real.
