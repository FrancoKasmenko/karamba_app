FROM node:20-alpine

RUN apk add --no-cache libc6-compat openssl

WORKDIR /app

ENV DATABASE_URL="postgresql://karamba:Majo1984_@db:5432/karamba?schema=public"
ENV NEXT_TELEMETRY_DISABLED=1
ENV HOSTNAME=0.0.0.0

COPY package.json package-lock.json ./
RUN npm install

COPY . .

RUN npx prisma generate
RUN npm run build

EXPOSE 3000

CMD ["npm", "start"]
