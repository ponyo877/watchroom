FROM node:22-alpine

RUN corepack enable && corepack prepare pnpm@latest --activate

WORKDIR /app

COPY web/package.json web/pnpm-lock.yaml* ./
RUN pnpm install

COPY web/ .

EXPOSE 5173

CMD ["pnpm", "dev", "--host", "0.0.0.0"]
