# Documentacion Completa De Dockerizacion Y Despliegue

## 1. Objetivo de este documento

Este documento resume todo el trabajo realizado para:

- dockerizar el sistema escolar completo
- publicar imagenes en Docker Hub
- levantar el sistema con Docker Compose
- desplegar en un Droplet de DigitalOcean
- enlazar dominio y subdominio en DigitalOcean Networking
- dejar registro de decisiones tecnicas, validaciones, problemas encontrados y estado actual

Incluye tanto configuraciones aplicadas como contexto operativo que fuimos descubriendo durante la puesta en marcha.

## 2. Estructura del proyecto

Workspace raiz:

- `C:\Users\Diegazzo\Desktop\Desarrollo`

Frontend Angular:

- `C:\Users\Diegazzo\Desktop\Desarrollo\Front-CTF-SCHOOL\backend-front-escolar`

Backend Spring Boot:

- `C:\Users\Diegazzo\Desktop\Desarrollo\Backend-CTF-SCHOOL\backend-api-escolar`

Despliegue y Compose:

- `C:\Users\Diegazzo\Desktop\Desarrollo\deploy`

Imagen de base de datos:

- `C:\Users\Diegazzo\Desktop\Desarrollo\deploy\db`

## 3. Arquitectura desplegada

El stack dockerizado consta de tres servicios:

1. `db`
   Usa PostgreSQL 16 y una imagen propia derivada de `postgres:16`, con un dump inicializable.

2. `backend`
   Usa Spring Boot empaquetado en una imagen Java con build multi-stage en Maven.

3. `frontend`
   Usa Angular compilado en Node y servido por Nginx.

Todos los servicios se integran mediante `docker-compose.yml`.

## 4. Imagenes Docker Hub publicadas

Repositorio Docker Hub usado:

- `crbarrales/conectaschool`

Imagenes activas:

- `crbarrales/conectaschool:db-latest`
- `crbarrales/conectaschool:backend-latest`
- `crbarrales/conectaschool:frontend-latest`

Digests mas recientes confirmados:

- DB: `sha256:893aa1b0d23c48cd820dc2bd260b5c12b70bbbc42575ee8d666ed380a474e630`
- Backend: `sha256:7619ac0730797bfb965781334a38cd7c473e21ee2beadd3ee23bf003d5846a00`
- Frontend: `sha256:281dfd67e60eacb5b105bfb4d201a678d8097f9382985930c277663d39ff48f0`

## 5. Archivos creados o usados para despliegue

### 5.1 Backend

- `C:\Users\Diegazzo\Desktop\Desarrollo\Backend-CTF-SCHOOL\backend-api-escolar\Dockerfile`
- `C:\Users\Diegazzo\Desktop\Desarrollo\Backend-CTF-SCHOOL\backend-api-escolar\.dockerignore`
- `C:\Users\Diegazzo\Desktop\Desarrollo\Backend-CTF-SCHOOL\backend-api-escolar\src\main\resources\application.yml`

### 5.2 Frontend

- `C:\Users\Diegazzo\Desktop\Desarrollo\Front-CTF-SCHOOL\backend-front-escolar\Dockerfile`
- `C:\Users\Diegazzo\Desktop\Desarrollo\Front-CTF-SCHOOL\backend-front-escolar\.dockerignore`
- `C:\Users\Diegazzo\Desktop\Desarrollo\Front-CTF-SCHOOL\backend-front-escolar\nginx.conf`
- `C:\Users\Diegazzo\Desktop\Desarrollo\Front-CTF-SCHOOL\backend-front-escolar\proxy.conf.json`
- `C:\Users\Diegazzo\Desktop\Desarrollo\Front-CTF-SCHOOL\backend-front-escolar\src\app\core\constants\api.config.ts`

### 5.3 Base de datos

- `C:\Users\Diegazzo\Desktop\Desarrollo\deploy\db\Dockerfile`
- `C:\Users\Diegazzo\Desktop\Desarrollo\deploy\db\.dockerignore`
- `C:\Users\Diegazzo\Desktop\Desarrollo\deploy\db\initdb\01_sistema_escolar.sql`
- `C:\Users\Diegazzo\Desktop\Desarrollo\deploy\db\verify_db_image.sql`

### 5.4 Compose y documentacion

- `C:\Users\Diegazzo\Desktop\Desarrollo\deploy\docker-compose.yml`
- `C:\Users\Diegazzo\Desktop\Desarrollo\deploy\.env.example`
- `C:\Users\Diegazzo\Desktop\Desarrollo\README_DEPLOY.md`

## 6. Configuracion actual del backend

### 6.1 Dockerfile backend

El backend usa build multi-stage:

- etapa 1: `maven:3.9.9-eclipse-temurin-21`
- etapa 2: `eclipse-temurin:21-jre-alpine`

Expone:

- puerto `8080`

Entry point:

```sh
java $JAVA_OPTS -jar /app/app.jar
```

### 6.2 Variables de entorno soportadas

El backend ya quedo preparado para leer:

- `SPRING_DATASOURCE_URL`
- `SPRING_DATASOURCE_USERNAME`
- `SPRING_DATASOURCE_PASSWORD`
- `SPRING_PROFILES_ACTIVE`
- `JAVA_OPTS`
- `SERVER_ADDRESS`
- `SERVER_PORT`
- `APP_CORS_ALLOWED_ORIGINS`
- `APP_SECURITY_JWT_SECRET`

### 6.3 Conexion a PostgreSQL dentro de Docker

Valor usado en Compose:

```env
SPRING_DATASOURCE_URL=jdbc:postgresql://db:5432/sistema_escolar
SPRING_DATASOURCE_USERNAME=escolar_user
SPRING_DATASOURCE_PASSWORD=escolar_pass
```

### 6.4 Comportamiento de red

El backend escucha en:

```env
SERVER_ADDRESS=0.0.0.0
SERVER_PORT=8080
```

## 7. Configuracion actual del frontend

### 7.1 Dockerfile frontend

El frontend usa:

- build con `node:22-alpine`
- runtime con `nginx:1.27-alpine`

Estado actual de build:

- `APP_BASE_HREF=/`
- `APP_DEPLOY_URL=/`

O sea, el frontend esta publicado para responder desde la raiz del host, no desde `/app`.

### 7.2 Nginx del contenedor frontend

Archivo:

- `C:\Users\Diegazzo\Desktop\Desarrollo\Front-CTF-SCHOOL\backend-front-escolar\nginx.conf`

Estado actual:

- `server_name app.codestress.cl;`
- sirve Angular desde `/`
- cualquier ruta desconocida cae en `index.html`
- `/api/` hace proxy al backend interno

Configuracion activa:

```nginx
server {
    listen 80;
    server_name app.codestress.cl;

    root /usr/share/nginx/html;
    index index.html;

    location /api/ {
        proxy_pass http://backend:8080/api/;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    location / {
        try_files $uri $uri/ /index.html;
    }
}
```

### 7.3 API en frontend

El frontend usa:

```ts
baseUrl: '/api'
```

Esto permite:

- en desarrollo local usar proxy Angular
- en produccion usar proxy interno de Nginx al backend

### 7.4 Cambio importante de ruta

Se probaron dos variantes:

1. variante antigua con `/app`
   Ejemplo: `https://app.codestress.cl/app`

2. variante final actual en raiz `/`
   Ejemplo: `https://app.codestress.cl/`

La imagen `frontend-latest` actualmente corresponde a la segunda variante, la de raiz `/`.

### 7.5 Limpieza de login publico

Se eliminaron del frontend:

- el banner visible con credenciales de prueba
- los valores precargados del formulario de login

Archivos implicados:

- `src\app\features\auth\pages\login-page.component.html`
- `src\app\features\auth\pages\login-page.component.ts`

## 8. Configuracion actual de la base de datos

### 8.1 Imagen de DB

La DB no usa solo `postgres:16` sin personalizacion.

Se creo una imagen propia:

- base: `postgres:16`
- agrega scripts de inicializacion en `/docker-entrypoint-initdb.d/`

### 8.2 Fuente de datos inicial

La base se preparo usando un dump real del entorno local:

- `deploy\db\initdb\01_sistema_escolar.sql`

### 8.3 Validacion realizada

Se verifico que la imagen restaure correctamente:

- 49 tablas
- 16 regiones
- 344 comunas

### 8.4 Regla importante del volumen

La restauracion corre solo si el directorio de datos esta vacio.

Si ya existe un volumen previo de PostgreSQL, el dump no vuelve a ejecutarse automaticamente.

## 9. Docker Compose actual

Archivo:

- `C:\Users\Diegazzo\Desktop\Desarrollo\deploy\docker-compose.yml`

Servicios:

- `db`
- `backend`
- `frontend`

Volumenes:

- `postgres_data`
- `backend_uploads`

Puertos publicados:

- DB: `5432:5432`
- Backend: `8080:8080`
- Frontend: `80:80`

### 9.1 Variables por defecto de `.env.example`

```env
POSTGRES_DB=sistema_escolar
POSTGRES_USER=escolar_user
POSTGRES_PASSWORD=escolar_pass
POSTGRES_PORT=5432
DB_IMAGE=crbarrales/conectaschool:db-latest

SPRING_DATASOURCE_URL=jdbc:postgresql://db:5432/sistema_escolar
SPRING_DATASOURCE_USERNAME=escolar_user
SPRING_DATASOURCE_PASSWORD=escolar_pass
SPRING_PROFILES_ACTIVE=docker
APP_CORS_ALLOWED_ORIGINS=http://localhost:4200,http://127.0.0.1:4200,http://localhost,http://127.0.0.1
APP_SECURITY_JWT_SECRET=change-this-jwt-secret-in-production
JAVA_OPTS=-Xms128m -Xmx512m

BACKEND_IMAGE=crbarrales/conectaschool:backend-latest
FRONTEND_IMAGE=crbarrales/conectaschool:frontend-latest
```

## 10. Builds y comandos usados localmente

### 10.1 Backend

```powershell
cd C:\Users\Diegazzo\Desktop\Desarrollo\Backend-CTF-SCHOOL\backend-api-escolar
docker build -t sistema-escolar-backend:test .
docker tag sistema-escolar-backend:test crbarrales/conectaschool:backend-latest
docker push crbarrales/conectaschool:backend-latest
```

### 10.2 Frontend

```powershell
cd C:\Users\Diegazzo\Desktop\Desarrollo\Front-CTF-SCHOOL\backend-front-escolar
docker build -t sistema-escolar-frontend:test .
docker tag sistema-escolar-frontend:test crbarrales/conectaschool:frontend-latest
docker push crbarrales/conectaschool:frontend-latest
```

### 10.3 DB

```powershell
cd C:\Users\Diegazzo\Desktop\Desarrollo\deploy\db
docker build -t crbarrales/conectaschool:db-latest .
docker push crbarrales/conectaschool:db-latest
```

## 11. Validaciones realizadas durante la dockerizacion

Se validaron distintos puntos en diferentes momentos:

- `npm run build` del frontend
- `docker build` del backend
- `docker build` del frontend
- `docker build` de la DB
- `docker compose config`
- restauracion real del dump en PostgreSQL 16

## 12. Despliegue en el Droplet

### 12.1 Contexto real encontrado

En el Droplet:

- existia `docker`
- no existia inicialmente `docker compose`
- no se queria depender de Git para desplegar

### 12.2 Instalacion de Compose

En el Droplet se detecto que:

- `docker compose` no existia
- `docker-compose-plugin` no aparecia en `apt`

La salida mas simple fue instalar:

```bash
sudo add-apt-repository universe -y
sudo apt-get update
sudo apt-get install -y docker-compose-v2
docker compose version
```

Nota:

- en Ubuntu modernos puede existir `docker-compose-v2`
- el comando que termina habilitando es `docker compose`

### 12.3 Archivo `docker-compose.yml` en el Droplet

Docker Hub no almacena `docker-compose.yml`.

Por eso, si no se usa Git, hay que copiar manualmente el archivo al Droplet, por ejemplo en:

- `/data/docker-compose.yml`

### 12.4 Comandos normales de despliegue

```bash
cd /data
docker login -u crbarrales
docker compose pull
docker compose up -d
```

### 12.5 Reinstalacion limpia

Si se quiere reinicializar todo incluyendo PostgreSQL:

```bash
cd /data
docker compose down -v
docker compose pull
docker compose up -d
```

### 12.6 Verificacion en el Droplet

```bash
docker ps
docker ps -a
docker compose ps
docker logs -f sistema_escolar_db
docker logs -f sistema_escolar_backend
docker logs -f sistema_escolar_frontend
```

## 13. Login Docker Hub en CLI

Si la cuenta usa Google para entrar a Docker Hub, igual el CLI se autentica con:

- el username real de Docker Hub
- password o idealmente un Personal Access Token

Ejemplo:

```bash
docker login -u crbarrales
```

## 14. Configuracion de dominio en DigitalOcean

### 14.1 Punto clave de DNS

DNS no enruta por ruta.

Es decir:

- `codestress.cl/app`
- `codestress.cl/otra-cosa`

no se separan por DNS.

DNS solo enruta por host:

- `codestress.cl`
- `www.codestress.cl`
- `app.codestress.cl`
- `pepe.codestress.cl`

### 14.2 Situacion encontrada

El dominio principal ya convivía con otra app estatica en App Platform.

Por eso se mezclaron registros apuntando a:

- App Platform / IPs externas
- Droplet

Eso genero confusiones y errores de resolucion/SSL.

### 14.3 Decisiones recomendadas

La forma mas limpia para este proyecto es:

- dejar `codestress.cl` para la app estatica o App Platform si sigue existiendo
- dejar el sistema escolar en un subdominio dedicado, por ejemplo:
  - `app.codestress.cl`

### 14.4 Configuracion DNS correcta para el sistema escolar

Si el frontend escolar corre en el Droplet, entonces:

- `app.codestress.cl` debe apuntar solo a la IP publica del Droplet

Ejemplo conceptual:

- `A` -> `app.codestress.cl` -> `IP_DEL_DROPLET`

### 14.5 Verificacion de IP del Droplet

Desde el Droplet:

```bash
curl ifconfig.me
```

Desde cualquier lado:

```bash
dig +short app.codestress.cl
```

Ambos deberian coincidir.

## 15. Estado de SSL / HTTPS

### 15.1 Lo que si se hizo

Se dejo el frontend escuchando via Nginx en el contenedor, por HTTP en puerto 80.

### 15.2 Lo que no esta resuelto solo con Docker

El contenedor frontend no trae SSL automatico.

Esto significa:

- `http://app.codestress.cl/` depende solo del DNS + Docker
- `https://app.codestress.cl/` requiere SSL configurado aparte

### 15.3 Regla importante

DigitalOcean App Platform si maneja SSL automaticamente para dominios custom en la app.

Pero un Droplet con Docker no obtiene SSL automatico solo por apuntar un DNS.

### 15.4 Opciones para HTTPS

Opciones validas:

1. Nginx frontal en el Droplet + Certbot
2. Load Balancer de DigitalOcean con certificado administrado
3. Otro proxy externo que termine TLS

### 15.5 Sintoma visto

El error:

- `ERR_SSL_VERSION_OR_CIPHER_MISMATCH`

aparecio cuando:

- el dominio pegaba a un destino incorrecto
- o el host entraba por HTTPS sin un certificado/terminacion TLS validos en el Droplet

## 16. Estado actual funcional esperado

Si DNS y contenedores estan bien:

- frontend: `http://app.codestress.cl/`
- backend interno: `http://backend:8080/api/` dentro de Compose
- DB interna: `db:5432` dentro de Compose

Si ademas se configura SSL externamente:

- frontend: `https://app.codestress.cl/`

## 17. Archivos y configuraciones importantes de negocio ya incorporados al sistema

Ademas de la dockerizacion, el proyecto ya venia con varios cambios funcionales importantes:

- integracion de regiones y comunas de Chile
- endpoint de catalogo:
  - `GET /api/catalogos/ubicaciones/chile`
- persistencia de region/comuna en matriculas y profesores
- enriquecimiento de catalogos usados por cursos
- soporte de documentos de alumno en matriculas
- mejoras de formularios
- integracion IA para planificacion
- ajustes del compilador Java y anotaciones de parametros para evitar errores de reflection

Este documento no reemplaza el conocimiento funcional del sistema, pero lo deja contextualizado en el despliegue.

## 18. Riesgos y pendientes que conviene recordar

1. El SSL del Droplet no queda resuelto solo por tener Docker y el dominio apuntado.

2. Si se usa un volumen PostgreSQL antiguo, la imagen `db-latest` no vuelve a restaurar el dump.

3. Si se vuelve a modificar el `Dockerfile` o `nginx.conf` del frontend, es facil publicar una variante equivocada:
   - con `/app`
   - o en raiz `/`

4. Si el dominio principal sigue compartido con App Platform, no conviene mezclar el mismo host del escolar con otra app salvo que exista un proxy frontal claro.

5. En el workspace ha existido una carpeta no relacionada:
   - `conecta-school-corp-web/`
   No corresponde mezclarla con este despliegue del sistema escolar.

## 19. Comandos utiles de operacion diaria

### 19.1 Ver imagen corriendo

```bash
docker inspect sistema_escolar_frontend --format='{{.Config.Image}}'
docker inspect sistema_escolar_backend --format='{{.Config.Image}}'
docker inspect sistema_escolar_db --format='{{.Config.Image}}'
```

### 19.2 Recrear solo frontend

```bash
cd /data
docker compose pull frontend
docker compose up -d --force-recreate frontend
```

### 19.3 Recrear backend

```bash
cd /data
docker compose pull backend
docker compose up -d --force-recreate backend
```

### 19.4 Recrear DB desde cero

```bash
cd /data
docker compose down -v
docker compose pull db
docker compose up -d db
```

### 19.5 Logs rapidos

```bash
docker logs --tail 100 sistema_escolar_frontend
docker logs --tail 100 sistema_escolar_backend
docker logs --tail 100 sistema_escolar_db
```

## 20. Resumen ejecutivo

El sistema escolar ya quedo dockerizado y publicable en Docker Hub mediante tres imagenes:

- frontend Angular servido por Nginx
- backend Spring Boot
- base PostgreSQL inicializable

La integracion por Compose ya esta hecha.

El punto mas delicado del despliegue no es Docker en si, sino:

- tener el `docker-compose.yml` correcto en el Droplet
- usar el subdominio correcto
- no mezclar DNS del Droplet con App Platform
- resolver HTTPS por fuera del contenedor frontend

Estado mas coherente a hoy:

- usar `app.codestress.cl` para el sistema escolar
- apuntarlo solo al Droplet
- usar la imagen `frontend-latest` publicada en raiz `/`
- levantar con `docker compose`
- agregar SSL sobre el Droplet o mediante un proxy externo si se quiere produccion completa

