FROM node:20-alpine

RUN apk add --no-cache \
  libc6-compat \
  openssl \
  chromium \
  nss \
  freetype \
  harfbuzz \
  ca-certificates \
  ttf-freefont

WORKDIR /app

ENV DATABASE_URL="postgresql://karamba:Majo1984_@db:5432/karamba?schema=public"
ENV NEXT_TELEMETRY_DISABLED=1
ENV HOSTNAME=0.0.0.0
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium

COPY package.json package-lock.json ./
RUN npm install

COPY . .

RUN npx prisma generate
RUN npm run build

# Si subís archivos en runtime (banners, imágenes de producto, etc.), el directorio
# public/uploads debe persistir: en Docker Compose usá un volumen → uploads_data.

EXPOSE 3000

CMD ["npm", "start"]
