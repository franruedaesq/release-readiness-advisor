FROM node:20-slim AS builder
WORKDIR /app

RUN npm i -g pnpm

COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./

COPY apps/backend/package.json apps/backend/package.json

RUN pnpm install --frozen-lockfile --filter ./apps/backend...

COPY . .

RUN pnpm --filter ./apps/backend... run build

FROM node:20-slim AS runner
WORKDIR /app

RUN npm i -g pnpm

COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY apps/backend/package.json apps/backend/package.json

RUN pnpm install --frozen-lockfile --prod --filter ./apps/backend...

COPY --from=builder /app/apps/backend/dist ./apps/backend/dist

EXPOSE 3002
CMD ["node", "apps/backend/dist/main.js"]
