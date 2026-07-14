# Backend API Escolar

Proyecto `backend-api-escolar` con Spring Boot 4.0.5, Java 21, arquitectura hexagonal y autenticacion JWT sin base de datos.

## Arquitectura

- `domain`: modelo y puertos
- `application`: casos de uso
- `infrastructure`: controladores, seguridad y adapters

## Credenciales

- Usuario: `admin`
- Password: `admin`

## Endpoints

- `POST /api/auth/login`
- `GET /api/auth/me`

## Login

```bash
curl --request POST http://localhost:8080/api/auth/login \
  --header "Content-Type: application/json" \
  --data "{\"username\":\"admin\",\"password\":\"admin\"}"
```

Respuesta esperada:

```json
{
  "accessToken": "eyJ...",
  "tokenType": "Bearer",
  "expiresIn": 3600,
  "username": "admin",
  "roles": [
    "ROLE_ADMIN"
  ]
}
```

## Endpoint protegido

```bash
curl http://localhost:8080/api/auth/me \
  --header "Authorization: Bearer TU_TOKEN"
```

## Ejecutar

Si tienes Maven instalado en tu maquina:

```bash
mvn spring-boot:run
```

Tambien puedes importar el proyecto en IntelliJ y ejecutar `AuthHexagonalApplication`.

## Educacion Inicial NT1/NT2

Los programas de `Prekinder` y `Kinder` se cargan desde:

- `src/main/resources/data/study-programs/programa_pedagogico_NT1_NT2_final.json`

Ese archivo se usa solo como semilla inicial. La operacion normal del sistema consulta la base de datos, no el JSON directo.

### Tablas usadas

- `PROGRAMAS_EDUCACION_INICIAL`
- `PROGRAMAS_EDUCACION_INICIAL_OAS`
- `PROGRAMAS_EDUCACION_INICIAL_OA_INDICADORES`
- `PROGRAMAS_EDUCACION_INICIAL_OA_ACTIVIDADES`

### Comportamiento de carga

- Si la tabla ya tiene programas activos, el backend no vuelve a sembrar en cada arranque.
- Si la tabla esta vacia, el backend carga una vez la data desde `programa_pedagogico_NT1_NT2_final.json`.

En resumen: el JSON no gobierna el runtime. La fuente real para frontend y backend es la base de datos.
