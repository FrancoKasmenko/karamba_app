-- Many-to-many Product <-> Category (Prisma 6: tabla implícita _ProductCategories; A=Category, B=Product)
CREATE TABLE "_ProductCategories" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_ProductCategories_AB_pkey" PRIMARY KEY ("A","B")
);

CREATE INDEX "_ProductCategories_B_index" ON "_ProductCategories"("B");

ALTER TABLE "_ProductCategories" ADD CONSTRAINT "_ProductCategories_A_fkey" FOREIGN KEY ("A") REFERENCES "Category"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "_ProductCategories" ADD CONSTRAINT "_ProductCategories_B_fkey" FOREIGN KEY ("B") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Preservar categoría única legacy
INSERT INTO "_ProductCategories" ("A", "B")
SELECT p."categoryId", p."id" FROM "Product" p WHERE p."categoryId" IS NOT NULL;

ALTER TABLE "Product" DROP CONSTRAINT IF EXISTS "Product_categoryId_fkey";

DROP INDEX IF EXISTS "Product_categoryId_idx";

ALTER TABLE "Product" DROP COLUMN IF EXISTS "categoryId";
