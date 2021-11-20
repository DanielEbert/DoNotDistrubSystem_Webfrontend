FROM node:16.6

WORKDIR /usr/src/app

RUN npm install -g serve

COPY . .

RUN npm install && npm run build

EXPOSE 8080

CMD ["serve", "-s", "/usr/src/app/build", "--listen", "8080"]
