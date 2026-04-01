-- Zonas de envío (admin + cotización checkout)
CREATE TABLE IF NOT EXISTS "ShippingZone" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "price" DOUBLE PRECISION NOT NULL,
    "departmentNames" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "cityNames" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "active" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ShippingZone_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "ShippingZone_active_sortOrder_idx" ON "ShippingZone"("active", "sortOrder");

-- Perfil checkout: departamento y código postal
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "departamento" TEXT;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "postalCode" TEXT;

-- PayPal (admin pagos + checkout)
ALTER TABLE "SiteSettings" ADD COLUMN IF NOT EXISTS "paypalClientId" TEXT;
ALTER TABLE "SiteSettings" ADD COLUMN IF NOT EXISTS "paypalClientSecret" TEXT;
ALTER TABLE "SiteSettings" ADD COLUMN IF NOT EXISTS "paypalEnabled" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "SiteSettings" ADD COLUMN IF NOT EXISTS "paypalEnvironment" TEXT NOT NULL DEFAULT 'sandbox';
ALTER TABLE "SiteSettings" ADD COLUMN IF NOT EXISTS "paypalCurrency" TEXT NOT NULL DEFAULT 'UYU';

-- Valor enum para órdenes con PayPal
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_enum e
    JOIN pg_type t ON e.enumtypid = t.oid
    WHERE t.typname = 'CheckoutPaymentMethod'
      AND e.enumlabel = 'PAYPAL'
  ) THEN
    ALTER TYPE "CheckoutPaymentMethod" ADD VALUE 'PAYPAL';
  END IF;
END $$;
