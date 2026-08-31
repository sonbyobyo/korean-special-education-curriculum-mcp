FROM node:20-bookworm-slim AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --ignore-scripts
COPY . ./
RUN npm run build && npm run verify:core

FROM node:20-bookworm-slim
WORKDIR /app
ENV NODE_ENV=production
ENV MCP_TRANSPORT=http
ENV PORT=8080
COPY package.json package-lock.json ./
RUN npm ci --omit=dev --ignore-scripts && npm cache clean --force
COPY --from=build /app/dist ./dist
COPY --from=build /app/data/core ./data/core
COPY --from=build /app/sources/official/source-catalog.json ./sources/official/source-catalog.json
CMD ["node", "dist/src/server.js"]
