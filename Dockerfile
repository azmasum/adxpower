FROM node:18-slim

RUN apt-get update && apt-get install -y \
    chromium \
    fonts-ipafont-gothic \
    fonts-wqy-zenhei \
    fonts-thai-tlwg \
    fonts-kacst \
    fonts-freefont-ttf \
    --no-install-recommends \
    && rm -rf /var/lib/apt/lists/*

ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium

WORKDIR /app

COPY package.json package-lock.json* ./
COPY server/package.json server/
RUN npm install

COPY server/ server/
COPY client/build-exe.js client/

RUN cd server && npx prisma generate && npx nest build

RUN cd server && npx prisma migrate deploy || true

EXPOSE 3000

CMD ["sh", "-c", "cd server && npx prisma migrate deploy && node dist/main.js"]
