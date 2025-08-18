FROM nginx:stable-alpine

COPY ./conf/nginx.conf /etc/nginx/nginx.conf

# Set up entrypoint script
COPY tools/entrypoint.sh /usr/local/bin
RUN chmod +x /usr/local/bin/entrypoint.sh

EXPOSE 3000

CMD [ "entrypoint.sh" ]