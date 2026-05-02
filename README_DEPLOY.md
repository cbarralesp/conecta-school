# Deploy con Docker Compose

## Estructura usada

- Backend Spring Boot: `C:\Users\Diegazzo\Desktop\Desarrollo\Backend-CTF-SCHOOL\backend-api-escolar`
- Frontend Angular: `C:\Users\Diegazzo\Desktop\Desarrollo\Front-CTF-SCHOOL\backend-front-escolar`
- Compose: `C:\Users\Diegazzo\Desktop\Desarrollo\deploy\docker-compose.yml`

## Imágenes Docker Hub

- Backend: `crbarrales/conectaschool:backend-latest`
- Frontend: `crbarrales/conectaschool:frontend-latest`

Si quieres reutilizar estos archivos con otro usuario, reemplaza `crbarrales` por tu usuario o define variables en `deploy/.env`.

## Variables importantes

El backend ya quedó preparado para leer:

- `SPRING_DATASOURCE_URL`
- `SPRING_DATASOURCE_USERNAME`
- `SPRING_DATASOURCE_PASSWORD`
- `SPRING_PROFILES_ACTIVE`
- `JAVA_OPTS`
- `SERVER_ADDRESS`
- `SERVER_PORT`
- `APP_CORS_ALLOWED_ORIGINS`
- `APP_SECURITY_JWT_SECRET`

Valor recomendado para Docker:

```env
SPRING_DATASOURCE_URL=jdbc:postgresql://db:5432/sistema_escolar
SPRING_DATASOURCE_USERNAME=escolar_user
SPRING_DATASOURCE_PASSWORD=escolar_pass
SPRING_PROFILES_ACTIVE=docker
JAVA_OPTS=-Xms128m -Xmx512m
```

## Backend: build y push

Ubícate en:

```powershell
cd C:\Users\Diegazzo\Desktop\Desarrollo\Backend-CTF-SCHOOL\backend-api-escolar
```

Login:

```powershell
docker login
```

Build:

```powershell
docker build -t crbarrales/conectaschool:backend-latest .
```

Push:

```powershell
docker push crbarrales/conectaschool:backend-latest
```

Si quieres mantener placeholders genéricos:

```powershell
docker build -t DOCKERHUB_USER/sistema-escolar-backend:latest .
docker push DOCKERHUB_USER/sistema-escolar-backend:latest
```

## Frontend: build y push

Ubícate en:

```powershell
cd C:\Users\Diegazzo\Desktop\Desarrollo\Front-CTF-SCHOOL\backend-front-escolar
```

Build:

```powershell
docker build -t crbarrales/conectaschool:frontend-latest .
```

Push:

```powershell
docker push crbarrales/conectaschool:frontend-latest
```

Con placeholders:

```powershell
docker build -t DOCKERHUB_USER/sistema-escolar-frontend:latest .
docker push DOCKERHUB_USER/sistema-escolar-frontend:latest
```

## Docker Compose local o servidor

Ubícate en:

```powershell
cd C:\Users\Diegazzo\Desktop\Desarrollo\deploy
```

Copia el archivo de ejemplo si quieres personalizar variables:

```powershell
Copy-Item .env.example .env
```

Descargar imágenes:

```powershell
docker compose pull
```

Levantar servicios:

```powershell
docker compose up -d
```

Ver contenedores:

```powershell
docker ps
```

Logs:

```powershell
docker logs -f sistema_escolar_backend
docker logs -f sistema_escolar_frontend
docker logs -f sistema_escolar_db
```

## Servicios incluidos

- `db`: `postgres:16`
- `backend`: `crbarrales/conectaschool:backend-latest`
- `frontend`: `crbarrales/conectaschool:frontend-latest`

Persistencia:

- PostgreSQL: volumen `postgres_data`
- Archivos subidos del backend: volumen `backend_uploads`

## Notas de frontend

- Angular quedó usando `baseUrl: '/api'`.
- En desarrollo local, `npm start` usa `proxy.conf.json` para reenviar `/api` a `http://localhost:8080`.
- En producción, Nginx hace proxy de `/api` al contenedor `backend`.
- El `nginx.conf` redirige cualquier ruta desconocida a `index.html`, evitando errores 404 al refrescar una SPA.

## Notas de backend

- El backend expone `8080`.
- Quedó preparado para escuchar en `0.0.0.0:8080`.
- La conexión a PostgreSQL en Docker usa `jdbc:postgresql://db:5432/sistema_escolar`.
- Los valores por defecto locales siguen apuntando a `localhost`, para no romper el desarrollo fuera de Docker.

## Despliegue en un Droplet

1. Instala Docker y el plugin de Docker Compose.
2. Crea una carpeta de despliegue, por ejemplo `/opt/conectaschool`.
3. Copia `docker-compose.yml` y opcionalmente `.env.example` como `.env`.
4. Reemplaza imágenes o usuario si corresponde.
5. Ejecuta:

```bash
docker login
docker compose pull
docker compose up -d
```

6. Abre al menos el puerto `80`.
7. Abre también `8080` sólo si necesitas acceder al backend directamente desde fuera del proxy frontal.

## Verificación sugerida

Frontend:

```powershell
cd C:\Users\Diegazzo\Desktop\Desarrollo\Front-CTF-SCHOOL\backend-front-escolar
npm run build
```

Backend:

```powershell
cd C:\Users\Diegazzo\Desktop\Desarrollo\Backend-CTF-SCHOOL\backend-api-escolar
docker build -t crbarrales/conectaschool:backend-latest .
```

El proyecto no incluye `mvnw`, por eso la validación práctica del backend queda apoyada en el `docker build` multi-stage con Maven.
