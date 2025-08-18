FROM nginx:stable-alpine

ENV SSL_DIR=/etc/ssl
ENV CERTS_DIR=${SSL_DIR}/certs
ENV KEYS_DIR=${SSL_DIR}/private

RUN apk add openssl

COPY ./conf/nginx.conf /etc/nginx/nginx.conf

COPY ./src /var/www/html

# Set up entrypoint script
COPY tools/entrypoint.sh /usr/local/bin
RUN chmod +x /usr/local/bin/entrypoint.sh

EXPOSE 443

ENTRYPOINT [ "entrypoint.sh" ]