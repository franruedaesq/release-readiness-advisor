FROM node:20-slim AS builder

WORKDIR /app

RUN npm install -g pnpm

COPY package.json pnpm-lock.yaml ./

RUN pnpm install

COPY . .

ENV PATH /app/node_modules/.bin:$PATH

RUN pnpm --filter backend build

FROM node:20-slim

WORKDIR /app

RUN npm install -g pnpm

COPY package.json pnpm-lock.yaml ./

RUN pnpm install --prod

COPY --from=builder /app/apps/backend/dist ./apps/backend/dist

EXPOSE 3002

CMD ["node", "apps/backend/dist/main"]