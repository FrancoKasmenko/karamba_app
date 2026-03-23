# Karamba - Ecommerce Artesanal

Ecommerce moderno para **Karamba** (karamba.com.uy) construido con Next.js 15, Prisma, PostgreSQL, TailwindCSS y MercadoPago.

## Stack

- **Frontend**: Next.js 15 (App Router) + React 19 + TypeScript
- **Estilos**: TailwindCSS 4 + Framer Motion
- **Backend**: Next.js API Routes
- **Base de datos**: PostgreSQL + Prisma ORM
- **Auth**: NextAuth.js (credentials)
- **Pagos**: MercadoPago (Checkout Pro)
- **Estado**: Zustand (carrito persistente en localStorage)
- **Data Fetching**: TanStack React Query

## Inicio Rápido

### 1. Instalar dependencias

```bash
npm install
```

### 2. Configurar variables de entorno

Copiar `.env.example` a `.env` y configurar:

```bash
cp .env.example .env
```

La variable más importante es `DATABASE_URL` con tu conexión PostgreSQL.

### 3. Crear la base de datos

```bash
npx prisma db push
```

### 4. Poblar con datos de prueba

```bash
npm run db:seed
```

Esto crea:
- **Admin**: admin@karamba.com.uy / admin123
- **Usuario**: usuario@test.com / user123
- 8 productos de ejemplo con variantes
- 3 categorías
- Configuración del sitio

### 5. Iniciar en desarrollo

```bash
npm run dev
```

Abrir [http://localhost:3000](http://localhost:3000)

## Estructura

```
karamba/
├── prisma/
│   ├── schema.prisma      # Modelos de datos
│   └── seed.ts            # Datos de prueba
├── src/
│   ├── app/
│   │   ├── admin/         # Panel de administración
│   │   │   ├── productos/ # CRUD de productos
│   │   │   ├── ordenes/   # Gestión de órdenes
│   │   │   ├── usuarios/  # Lista de usuarios
│   │   │   ├── pagos/     # Config MercadoPago
│   │   │   ├── configuracion/ # Config general
│   │   │   └── cursos-online/ # Cursos grabados (admin)
│   │   ├── api/
│   │   │   ├── admin/     # API admin (protegida por rol)
│   │   │   ├── auth/      # NextAuth + registro
│   │   │   ├── checkout/  # Crear orden + preferencia MP
│   │   │   └── webhooks/  # Webhook MercadoPago
│   │   ├── productos/     # Listado y detalle
│   │   ├── carrito/       # Carrito de compras
│   │   ├── checkout/      # Checkout + éxito
│   │   ├── perfil/        # Perfil de usuario
│   │   ├── login/         # Login
│   │   ├── registro/      # Registro
│   │   ├── nosotros/      # Sobre nosotros
│   │   ├── contacto/      # Contacto
│   │   ├── cursos-online/ # Catálogo cursos online
│   │   ├── curso/[slug]/  # Detalle + aula (/contenido)
│   │   └── mi-aprendizaje/ # Mis cursos comprados
│   ├── components/
│   │   ├── home/          # Hero, productos, brand
│   │   ├── layout/        # Navbar, Footer
│   │   ├── ui/            # Button, ProductCard
│   │   └── learning/      # Video embed aula
│   ├── lib/               # Prisma, auth, utils, MP
│   ├── store/             # Zustand (carrito)
│   └── types/             # TypeScript types
```

## MercadoPago

La integración se configura desde el panel admin → Pagos:

1. Ingresar **Access Token** de MercadoPago
2. (Opcional) Ingresar **Public Key**
3. Activar el checkbox "Activar MercadoPago"
4. Configurar webhook en MercadoPago: `https://tu-dominio.com/api/webhooks/mercadopago`

### Flujo de pago:
1. Usuario agrega productos al carrito
2. En checkout ingresa datos de envío
3. Se crea una orden con estado PENDING
4. Se crea preferencia de pago en MercadoPago
5. Usuario es redirigido a MercadoPago para pagar
6. El webhook actualiza el estado de la orden (PAID/CANCELLED)

## Cursos online (grabados)

- **Admin → Cursos online**: crear módulos, clases (URL YouTube/Vimeo), recursos.
- **Producto de venta**: se crea y actualiza solo al guardar el curso; no aparece en el catálogo de productos (solo en **Cursos online** y checkout).
- Tras pago **PAID** (Mercado Pago, transferencia validada, etc.) se crea el acceso (`UserCourse` + `UserCoursePurchase`).
- **Rutas**: `/cursos-online`, `/curso/[slug]`, aula en `/curso/[slug]/contenido`, `/mi-aprendizaje`.
- Tras cambios en `schema.prisma`: `npx prisma db push` y `npx prisma generate`.
- Si ves un error Prisma **P2022** con columna `existe`, suele ser PostgreSQL en español: falta sincronizar la DB (p. ej. columna `completedAt` en `UserCourse`). Volvé a ejecutar `npx prisma db push`.

### Certificados PDF (cursos online)

- Al completar el 100% del curso se puede descargar el PDF desde el aula o **Mi aprendizaje**.
- Endpoint: `GET /api/courses/certificate/[courseId]` (sesión requerida, compra + curso completo).
- Logo: colocá `public/brand/karamba-logo.png` (o `.jpg`). Ver `public/brand/README.md`. Opcional: `KARAMBA_LOGO_PATH`.

### Emails transaccionales

- Configurá **Resend** (`RESEND_API_KEY` + `EMAIL_FROM`) o **SMTP** (variables en `.env.example`).
- Eventos: registro, cambio de contraseña, pedido creado, pago confirmado / rechazado, recordatorio transferencia (admin), acceso a curso, curso completado (con link al certificado).
- Registro de envíos en tabla `EmailLog` (anti-duplicados). Admin → detalle de orden: reenviar emails.

## Modelos de Datos

| Modelo | Descripción |
|--------|-------------|
| User | Usuarios (USER/ADMIN) |
| Product | Productos con imágenes (`isOnlineCourse`, `onlineCourseId`) |
| Variant | Variantes dinámicas (color, tamaño, etc.) |
| Category | Categorías de productos |
| Order | Pedidos con estado y pago |
| OrderItem | Items de cada pedido |
| SiteSettings | Config del sitio y MercadoPago |
| OnlineCourse, CourseModule, CourseLesson | Cursos online grabados |
| CourseResource | Archivos descargables del curso |
| UserCourse | Progreso y última clase vista |
| EmailLog | Envíos de email (deduplicación) |
| UserLessonProgress | Clase completada |
| UserCoursePurchase | Acceso ligado a la orden (revocable si se cancela) |
| Course, CourseSession, CourseBooking | Cursos presenciales / en vivo (sin cambios) |

## Deploy

El proyecto está optimizado para **Vercel**:

```bash
# Con Vercel CLI
vercel
```

Variables de entorno requeridas en producción:
- `DATABASE_URL`
- `NEXTAUTH_SECRET`
- `NEXTAUTH_URL`

## Scripts

| Comando | Descripción |
|---------|-------------|
| `npm run dev` | Desarrollo |
| `npm run build` | Build de producción |
| `npm run start` | Iniciar en producción |
| `npm run db:push` | Sincronizar schema con DB |
| `npm run db:seed` | Poblar datos de prueba |
| `npm run db:studio` | Abrir Prisma Studio |
