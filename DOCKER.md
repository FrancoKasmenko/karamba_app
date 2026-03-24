# Docker (VPS)

Copiá variables de entorno (ajustá secretos en producción):

```bash
cp .env.example .env
```

Levantar:

```bash
docker compose up -d
```

App: [http://localhost:3000](http://localhost:3000)

Tras el primer arranque (esquema y datos):

```bash
docker exec -it karamba_app npx prisma db push
docker exec -it karamba_app npm run db:seed
```
