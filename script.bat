node -e "
const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const prisma = new PrismaClient();

(async () => {
  const products = await prisma.product.findMany({
    select: { name: true, images: true }
  });

  fs.writeFileSync('product-images.json', JSON.stringify(products, null, 2));

  console.log('Exportado OK');
  await prisma.$disconnect();
})();
"