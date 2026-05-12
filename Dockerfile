FROM node:20-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

FROM node:20-alpine AS build
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build
RUN npm prune --omit=dev

FROM node:20-alpine AS runner
WORKDIR /app
ARG RABBITMQ_URI_OVERRIDE
ENV NODE_ENV=production
COPY --from=build /app/package.json /app/package-lock.json ./
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
COPY --from=build /app/config/production.yaml ./config/production.yaml
COPY --from=build /app/config/custom-environment-variables.yaml ./config/custom-environment-variables.yaml
RUN if [ -n "$RABBITMQ_URI_OVERRIDE" ]; then node -e "const fs=require('fs'); const yaml=require('yaml'); const p='./config/production.yaml'; const cfg=yaml.parse(fs.readFileSync(p,'utf8'))||{}; cfg.broker=cfg.broker||{}; cfg.broker.uri=process.env.RABBITMQ_URI_OVERRIDE; fs.writeFileSync(p, yaml.stringify(cfg));"; fi
EXPOSE 3000
CMD ["node", "dist/main"]
