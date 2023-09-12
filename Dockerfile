FROM node:19-bullseye-slim
WORKDIR /src
COPY --chown=node:node . /src
RUN npm ci
RUN npm run build
CMD ["npm", "run", "demo"]
