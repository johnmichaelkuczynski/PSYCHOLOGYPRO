FROM node:22-bookworm-slim

ENV NODE_ENV=production
WORKDIR /app

RUN npm install --global npm@11

COPY package.json package-lock.json ./
RUN npm ci --include=dev

COPY . .
RUN npm run build

ENV PORT=5000
EXPOSE 5000

CMD ["npm", "start"]
