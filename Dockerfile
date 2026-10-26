# define base image
# node 22 is the newest LTS with 32-bit ARM (Raspberry Pi OS armhf) images
FROM node:22-bookworm-slim

# download dumb-init (images use @napi-rs/canvas, which ships prebuilt binaries, so no build tools are needed)
RUN apt-get update && apt-get install -y --no-install-recommends dumb-init \
    && rm -rf /var/lib/apt/lists/*

# define environment
ENV NODE_ENV production

# set work directory
WORKDIR /usr/src/app

# copy all sources to container
COPY --chown=node:node . /usr/src/app
RUN chown node:node /usr/src/app

# install dependencies as the user the bot runs as: skyhelper-networth writes its
# item cache (.itemsBackup.json) inside node_modules, and the bot rewrites config.json and data/
USER node
RUN npm ci --omit=dev

# run your app
CMD [ "dumb-init", "node", "index.js" ]
