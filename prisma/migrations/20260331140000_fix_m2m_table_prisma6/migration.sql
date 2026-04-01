-- Reparación: migraciones antiguas usaban `_CategoryToProduct`; Prisma 6 usa `_ProductCategories`.

CREATE TABLE IF NOT EXISTS "_ProductCategories" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,
    CONSTRAINT "_ProductCategories_AB_pkey" PRIMARY KEY ("A","B")
);

CREATE INDEX IF NOT EXISTS "_ProductCategories_B_index" ON "_ProductCategories"("B");

DO $$
BEGIN
  ALTER TABLE "_ProductCategories" ADD CONSTRAINT "_ProductCategories_A_fkey" FOREIGN KEY ("A") REFERENCES "Category"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER TABLE "_ProductCategories" ADD CONSTRAINT "_ProductCategories_B_fkey" FOREIGN KEY ("B") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

INSERT INTO "_ProductCategories" ("A", "B")
SELECT o."A", o."B" FROM "_CategoryToProduct" o
WHERE EXISTS (
  SELECT 1 FROM information_schema.tables
  WHERE table_schema = 'public' AND table_name = '_CategoryToProduct'
)
ON CONFLICT DO NOTHING;

DROP TABLE IF EXISTS "_CategoryToProduct";
