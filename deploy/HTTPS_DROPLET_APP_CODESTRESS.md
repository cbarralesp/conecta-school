# HTTPS Para app.codestress.cl En Droplet

## Objetivo

Dejar `app.codestress.cl` funcionando con:

- Docker Compose para `frontend`, `backend` y `db`
- Nginx instalado en el host del Droplet
- Certificado Let's Encrypt emitido con Certbot
- Redireccion HTTP -> HTTPS

## Arquitectura recomendada

La arquitectura correcta para este caso es:

1. Los contenedores corren con Docker Compose.
2. `frontend` escucha solo en `127.0.0.1:8081`.
3. `backend` escucha solo en `127.0.0.1:8080`.
4. `db` escucha solo en `127.0.0.1:5432`.
5. Nginx del host toma los puertos publicos `80` y `443`.
6. Certbot emite y renueva el certificado para `app.codestress.cl`.
7. Nginx del host hace proxy al frontend Docker en `127.0.0.1:8081`.

## Por que este cambio es necesario

Antes el contenedor `frontend` tomaba directamente `80:80`.

Eso impide usar Nginx del host en `80/443`, que es precisamente la forma mas simple y estable de usar Certbot y Let's Encrypt en Ubuntu.

## Requisitos previos

Antes de emitir el certificado, debe cumplirse lo siguiente:

1. El DNS `app.codestress.cl` debe apuntar a la IP publica del Droplet.
2. Los puertos `80` y `443` deben estar abiertos en firewall y/o cloud firewall.
3. Docker y Docker Compose ya deben estar instalados.
4. El archivo `docker-compose.yml` actualizado debe estar en `/data`.

## Archivos preparados en el repo

Archivo de Compose actualizado:

- `C:\Users\Diegazzo\Desktop\Desarrollo\deploy\docker-compose.yml`

Archivo de ejemplo de variables:

- `C:\Users\Diegazzo\Desktop\Desarrollo\deploy\.env.example`

Config Nginx para el host:

- `C:\Users\Diegazzo\Desktop\Desarrollo\deploy\nginx\app.codestress.cl.conf`

## Cambios hechos en Docker Compose

Quedaron asi para el Droplet:

- `frontend` publica `127.0.0.1:8081:80`
- `backend` publica `127.0.0.1:8080:8080`
- `db` publica `127.0.0.1:5432:5432`

Con esto:

- el sitio no queda expuesto directamente por Docker
- Nginx del host puede tomar `80` y `443`
- Certbot puede validar el dominio correctamente

## Pasos en el Droplet

### 1. Copiar archivos

Debes tener en el Droplet:

- `/data/docker-compose.yml`
- opcionalmente `/data/.env`

Y copia el archivo Nginx del repo a:

- `/etc/nginx/sites-available/app.codestress.cl`

## 2. Instalar Nginx y Certbot

```bash
sudo apt-get update
sudo apt-get install -y nginx certbot python3-certbot-nginx
```

## 3. Crear carpeta para challenge ACME

```bash
sudo mkdir -p /var/www/certbot
sudo chown -R www-data:www-data /var/www/certbot
```

## 4. Instalar la configuracion de Nginx

Si copiaste el archivo ya preparado:

```bash
sudo ln -sf /etc/nginx/sites-available/app.codestress.cl /etc/nginx/sites-enabled/app.codestress.cl
sudo nginx -t
sudo systemctl reload nginx
```

## 5. Levantar Docker Compose con los puertos internos

```bash
cd /data
cp .env.example .env
docker compose pull
docker compose up -d
```

## 6. Emitir el certificado

El articulo de DigitalOcean que tomamos como referencia recomienda usar Certbot con el plugin de Nginx:

Fuente:

- [How To Secure Nginx with Let's Encrypt on Ubuntu](https://www.digitalocean.com/community/tutorials/how-to-secure-nginx-with-let-s-encrypt-on-ubuntu-20-04)

Comando:

```bash
sudo certbot --nginx -d app.codestress.cl
```

Si quieres correo de renovacion y aceptar TOS de una sola pasada:

```bash
sudo certbot --nginx -d app.codestress.cl -m TU_CORREO --agree-tos --no-eff-email
```

## 7. Verificar renovacion automatica

```bash
sudo systemctl status certbot.timer
sudo certbot renew --dry-run
```

## 8. Verificar el sitio

```bash
curl -I http://app.codestress.cl
curl -I https://app.codestress.cl
```

Debes ver:

- redireccion de `http` a `https`
- respuesta correcta de `https`

## 9. Verificaciones utiles

Ver puertos ocupados:

```bash
sudo ss -tulpn | grep ':80'
sudo ss -tulpn | grep ':443'
sudo ss -tulpn | grep ':8081'
sudo ss -tulpn | grep ':8080'
```

Ver contenedores:

```bash
docker ps
docker compose -f /data/docker-compose.yml ps
```

Logs:

```bash
docker logs --tail 100 sistema_escolar_frontend
docker logs --tail 100 sistema_escolar_backend
docker logs --tail 100 sistema_escolar_db
sudo journalctl -u nginx --no-pager -n 100
```

## 10. Problemas comunes

### 10.1 Certbot no valida dominio

Causas tipicas:

- `app.codestress.cl` no apunta al Droplet
- puerto `80` bloqueado
- otro proceso sigue ocupando `80`
- Nginx tiene `server_name` incorrecto

### 10.2 Sigue apareciendo HTTP o certificado viejo

Posibles causas:

- cache del navegador
- DNS aun propagando
- no se recreo el frontend despues de `pull`
- Nginx no se recargo luego de Certbot

### 10.3 Docker sigue ocupando el puerto 80

Debes usar el Compose actualizado de este repo.

El Compose viejo publicaba:

- `80:80`

El Compose correcto para HTTPS en host usa:

- `127.0.0.1:8081:80`

## 11. Estado esperado al final

Al terminar, debes tener:

- `https://app.codestress.cl` funcionando
- frontend servido desde Docker
- backend accesible por `/api`
- SSL renovable automaticamente con Certbot

