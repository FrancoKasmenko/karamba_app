const { PrismaClient } = require("@prisma/client");
const fs = require("fs");

const prisma = new PrismaClient();

async function main() {
    const products = await prisma.product.findMany({
        select: { name: true, images: true },
    });

    fs.writeFileSync(
        "product-images.json",
        JSON.stringify(products, null, 2)
    );

    console.log("✅ Exportado OK");
}

main()
    .catch(console.error)
    .finally(() => prisma.$disconnect());