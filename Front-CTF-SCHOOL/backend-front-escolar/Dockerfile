FROM node:22-alpine AS builder
WORKDIR /app
ARG APP_BASE_HREF=/
ARG APP_DEPLOY_URL=/

COPY package.json package-lock.json ./
RUN npm ci

COPY angular.json tsconfig.json tsconfig.app.json tsconfig.spec.json ./
COPY public ./public
COPY src ./src
COPY proxy.conf.json ./proxy.conf.json

RUN npm run build -- --base-href ${APP_BASE_HREF} --deploy-url ${APP_DEPLOY_URL}

FROM nginx:1.27-alpine

COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=builder /app/dist/backend-front-escolar/browser /usr/share/nginx/html

EXPOSE 80
