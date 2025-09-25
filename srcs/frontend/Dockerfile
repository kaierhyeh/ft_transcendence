FROM node:20-alpine3.21 AS build

WORKDIR /app

COPY ./src ./

RUN npm install
RUN npm install -g typescript

RUN tsc

RUN cp dist/*.js dist/*.js.map ./scripts
RUN rm -rf dist node_modules scripts/*.ts

FROM nginx:1.28.0-alpine3.21

ENV SSL_DIR=/etc/ssl
ENV CERTS_DIR=${SSL_DIR}/certs
ENV KEYS_DIR=${SSL_DIR}/private

RUN apk add openssl

COPY ./conf/nginx.conf /etc/nginx/nginx.conf
COPY --from=build /app /var/www/html

# Set up entrypoint script
COPY tools/entrypoint.sh /usr/local/bin
RUN chmod +x /usr/local/bin/entrypoint.sh

EXPOSE 443

ENTRYPOINT [ "entrypoint.sh" ]