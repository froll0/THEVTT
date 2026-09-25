# Always-on group server (accounts, friends, campaigns, relay), for groups that
# don't want to depend on the GM's PC being on.
#   docker build -t thevtt-server .
#   docker run -d -p 4477:4477 -v thevtt-data:/data --name thevtt thevtt-server
FROM node:24-slim AS build
WORKDIR /src
RUN corepack enable
COPY . .
RUN pnpm install --frozen-lockfile --filter "@thevtt/server..." && pnpm -F @thevtt/server bundle

FROM node:24-slim
WORKDIR /app
COPY --from=build /src/apps/server/dist/thevtt-server.mjs .
ENV PORT=4477 THEVTT_DB=/data/thevtt.sqlite NODE_ENV=production
# the volume inherits this ownership, so the unprivileged user can write the database
RUN mkdir -p /data && chown node:node /data
VOLUME /data
EXPOSE 4477
USER node
CMD ["node", "thevtt-server.mjs"]
