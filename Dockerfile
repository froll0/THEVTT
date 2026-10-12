# Always-on group server (accounts, friends, campaigns, relay), for groups that
# don't want to depend on the GM's PC being on. It also serves the web client
# at /play/, so players join from a browser.
#   docker build -t thevtt-server .
#   docker run -d -p 4477:4477 -v thevtt-data:/data --name thevtt thevtt-server
FROM node:24-slim AS build
WORKDIR /src
RUN corepack enable
COPY . .
ENV ELECTRON_SKIP_BINARY_DOWNLOAD=1
RUN pnpm install --frozen-lockfile --filter "@thevtt/server..." --filter "@thevtt/desktop..." && pnpm -F @thevtt/server bundle && pnpm -F @thevtt/desktop exec vite build

FROM node:24-slim
WORKDIR /app
COPY --from=build /src/apps/server/dist/thevtt-server.mjs .
COPY --from=build /src/apps/desktop/out/renderer ./web
ENV PORT=4477 THEVTT_DB=/data/thevtt.sqlite THEVTT_WEB=/app/web NODE_ENV=production
# the volume inherits this ownership, so the unprivileged user can write the database
RUN mkdir -p /data && chown node:node /data
VOLUME /data
EXPOSE 4477
USER node
CMD ["node", "thevtt-server.mjs"]
