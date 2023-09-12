FROM node:19-bullseye-slim
WORKDIR /src
COPY --chown=node:node . /src
RUN npm ci
CMD ["npm", "run", "serve"]
