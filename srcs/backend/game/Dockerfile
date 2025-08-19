FROM node:lts-alpine

WORKDIR /app

RUN npm i fastify @fastify/websocket

COPY . .

EXPOSE 3000

CMD [ "node", "index.js" ]