FROM node:22-alpine AS production

WORKDIR /app
ENV NODE_ENV=production

COPY package.json package-lock.json ./
RUN npm ci --omit=dev

COPY src ./src
COPY prisma.config.ts ./prisma.config.ts

USER node
EXPOSE 5000
CMD ["node", "src/server.js"]
