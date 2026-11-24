FROM node:22-alpine
WORKDIR /app

COPY package*.json ./
RUN npm install --omit=dev

COPY . .

ENV PORT=5188
EXPOSE 5188

CMD ["node", "server.js"]
