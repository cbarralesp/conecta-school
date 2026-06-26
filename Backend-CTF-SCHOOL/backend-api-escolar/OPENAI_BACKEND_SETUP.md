# OpenAI en planificaciones nuevo

Este backend usa siempre el flujo:

`Angular -> Spring Boot -> OpenAI`

La API key nunca debe quedar en Angular ni en el repositorio.

## Desarrollo local

1. Crear un archivo local no versionado:

   `C:\Users\Diegazzo\Desktop\Desarrollo\Backend-CTF-SCHOOL\backend-api-escolar\application-local.yml`

2. Usar como base `src/main/resources/application-local.yml.example`.

3. Activar el perfil local al levantar el backend:

   `SPRING_PROFILES_ACTIVE=local`

4. Verificar configuracion cargada:

   `GET /api/planning/classes/ai-status`

5. Verificar uso real del proveedor:

   `POST /api/planning/classes/suggestion`

   La prueba real es revisar `providerUsed` en la respuesta:

   - `OPENAI:gpt-5.4-mini`
   - `LOCAL_FALLBACK:OPENAI_MISSING_API_KEY`
   - `LOCAL_FALLBACK:OPENAI_UNAUTHORIZED`
   - `LOCAL_FALLBACK:OPENAI_INSUFFICIENT_QUOTA`

## Droplet

Recomendado: usar variables de entorno en `systemd` o un archivo de entorno fuera del repo.

Variables esperadas:

- `AI_PROVIDER=openai`
- `OPENAI_API_KEY=...`
- `OPENAI_MODEL=gpt-5.4-mini`
- `OPENAI_BASE_URL=https://api.openai.com/v1`
- `OPENAI_TIMEOUT_SECONDS=45`

Si el backend corre con `systemd`, la opcion mas segura es definir estas variables en la unidad o en un `EnvironmentFile` con permisos restringidos.

## Endpoint de verificacion

`GET /api/planning/classes/ai-status`

Devuelve:

- proveedor configurado
- modo efectivo
- si hay key cargada
- modelo activo
- base URL
- timeout

No expone la API key.
