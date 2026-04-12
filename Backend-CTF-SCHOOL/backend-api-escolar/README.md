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
