FROM node:lts-alpine

WORKDIR /app

RUN npm i fastify

COPY . .

EXPOSE 3000

CMD [ "nodejs", "index.js" ]