#####################
# The Node.js image #
#####################
# Not using builder image since it's quite tedious to copy / install everything all over
# Not using Alpine since installing Prisma is broken on it using MBP M1 as of v4.2.1 https://github.com/prisma/prisma/issues/8478
FROM node:16.10.0-slim

ENV NODE_ENV build
ENV INSTALL_PATH /usr/local/nodejs_server

WORKDIR ${INSTALL_PATH}

RUN npm install -g pnpm@7
RUN apt-get update && apt-get -y install openssl

COPY package.json tsconfig.json pnpm-lock.yaml pnpm-workspace.yaml ./
# Copy package.jsons first to cache pnpm install to run only if they were changed, not on source file changes
COPY packages/server/package.json ./packages/server/package.json
COPY packages/game/package.json ./packages/game/package.json

RUN pnpm i --frozen-lockfile --filter @example/server \
  --filter @example/game

COPY packages/game ./packages/game
RUN pnpm --filter @example/game build

COPY packages/server ./packages/server
RUN pnpm --filter @example/server build

ENV NODE_ENV production
ENV CORS_ENABLED 0

EXPOSE ${PORT}
EXPOSE 8080

CMD node ./packages/server/dist/index.js