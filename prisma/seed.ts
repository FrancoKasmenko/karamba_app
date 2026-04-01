import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("Seeding database...");

  // Admin user
  const adminPassword = await bcrypt.hash("admin123", 12);
  const admin = await prisma.user.upsert({
    where: { email: "admin@karamba.com.uy" },
    update: {},
    create: {
      email: "admin@karamba.com.uy",
      name: "Admin Karamba",
      hashedPassword: adminPassword,
      role: "ADMIN",
    },
  });
  console.log("Admin created:", admin.email);

  const userPassword = await bcrypt.hash("user123", 12);
  const user = await prisma.user.upsert({
    where: { email: "usuario@test.com" },
    update: {},
    create: {
      email: "usuario@test.com",
      name: "Usuario Test",
      hashedPassword: userPassword,
      role: "USER",
    },
  });
  console.log("User created:", user.email);

  const navbarRoots = [
    { slug: "herramientas", name: "Herramientas", order: 0 },
    { slug: "insumos", name: "Insumos", order: 1 },
    { slug: "encuadernacion", name: "Encuadernaci\u00f3n", order: 2 },
    { slug: "moldes", name: "Moldes", order: 3 },
    { slug: "organizadores", name: "Organizadores", order: 4 },
    { slug: "exhibidores", name: "Exhibidores", order: 5 },
    { slug: "para-tu-marca", name: "Para tu marca", order: 6 },
    {
      slug: "regalos",
      name: "Regalos y detalles",
      order: 7,
    },
    { slug: "kits-para-crear", name: "Kits para crear", order: 8 },
    { slug: "ofertas-y-saldos", name: "Ofertas y saldos", order: 9 },
    { slug: "recursos-digitales", name: "Recursos digitales", order: 10 },
  ];

  for (const c of navbarRoots) {
    await prisma.category.upsert({
      where: { slug: c.slug },
      update: {
        name: c.name,
        order: c.order,
        showInNavbar: true,
        parentId: null,
      },
      create: {
        name: c.name,
        slug: c.slug,
        order: c.order,
        showInNavbar: true,
      },
    });
  }

  const herramientas = await prisma.category.findUniqueOrThrow({
    where: { slug: "herramientas" },
  });
  const regalos = await prisma.category.findUniqueOrThrow({
    where: { slug: "regalos" },
  });

  const decoracion = await prisma.category.upsert({
    where: { slug: "decoracion" },
    update: { showInNavbar: false },
    create: {
      name: "Decoraci\u00f3n",
      slug: "decoracion",
      order: 20,
      showInNavbar: false,
    },
  });

  // Subcategories
  const mdf = await prisma.category.upsert({
    where: { slug: "mdf" },
    update: {},
    create: {
      name: "MDF",
      slug: "mdf",
      order: 0,
      parentId: herramientas.id,
    },
  });

  const impresion3d = await prisma.category.upsert({
    where: { slug: "impresion-3d" },
    update: {},
    create: {
      name: "Impresi\u00f3n 3D",
      slug: "impresion-3d",
      order: 1,
      parentId: herramientas.id,
    },
  });

  const velas = await prisma.category.upsert({
    where: { slug: "velas" },
    update: {},
    create: {
      name: "Velas",
      slug: "velas",
      order: 0,
      parentId: decoracion.id,
    },
  });

  const cuadros = await prisma.category.upsert({
    where: { slug: "cuadros" },
    update: {},
    create: {
      name: "Cuadros",
      slug: "cuadros",
      order: 1,
      parentId: decoracion.id,
    },
  });

  // Banners
  await prisma.banner.upsert({
    where: { id: "banner-1" },
    update: {},
    create: {
      id: "banner-1",
      title: "Creatividad con criterio",
      subtitle: "Descubr\u00ed piezas \u00fanicas y artesanales que cuentan una historia",
      buttonText: "Ver Productos",
      buttonLink: "/productos",
      image: "/img/banner-1.png",
      order: 0,
      active: true,
    },
  });

  await prisma.banner.upsert({
    where: { id: "banner-2" },
    update: {},
    create: {
      id: "banner-2",
      title: "Nuevas colecciones",
      subtitle: "Encontr\u00e1 las \u00faltimas novedades de Karamba",
      buttonText: "Explorar",
      buttonLink: "/productos",
      image: "/img/banner-2.png",
      order: 1,
      active: true,
    },
  });

  // Products
  const products = [
    {
      name: "Vela Arom\u00e1tica Rosa",
      slug: "vela-aromatica-rosa",
      description:
        "Vela artesanal con aroma a rosas, hecha con cera de soja natural. Perfecta para crear ambientes c\u00e1lidos y relajantes.",
      price: 450,
      comparePrice: 550,
      imageUrl: "/api/uploads/products/009b0cb6-831b-45f2-a947-53c4e63d8036.png",
      images: ["/api/uploads/products/009b0cb6-831b-45f2-a947-53c4e63d8036.png"],
      featured: true,
      categoryIds: [velas.id],
      variants: [
        { name: "Tama\u00f1o", value: "Peque\u00f1a", stock: 10 },
        { name: "Tama\u00f1o", value: "Mediana", stock: 8 },
        { name: "Tama\u00f1o", value: "Grande", stock: 5 },
      ],
    },
    {
      name: "Vela Lavanda Zen",
      slug: "vela-lavanda-zen",
      description:
        "Vela de lavanda con aceites esenciales naturales. Ideal para meditaci\u00f3n y relajaci\u00f3n.",
      price: 380,
      imageUrl: "/api/uploads/products/00d5236f-d10f-4272-902d-2e3859b016e6.png",
      images: ["/api/uploads/products/00d5236f-d10f-4272-902d-2e3859b016e6.png"],
      featured: true,
      categoryIds: [velas.id],
      variants: [
        { name: "Tama\u00f1o", value: "Peque\u00f1a", stock: 15 },
        { name: "Tama\u00f1o", value: "Grande", stock: 7 },
      ],
    },
    {
      name: "Set Decorativo Luna",
      slug: "set-decorativo-luna",
      description:
        "Set de 3 piezas decorativas con forma de luna. Pintadas a mano con tonos pastel.",
      price: 890,
      comparePrice: 1100,
      imageUrl: "/api/uploads/products/00da9961-e129-4f0b-aff1-8fa06c13f981.jpg",
      images: ["/api/uploads/products/00da9961-e129-4f0b-aff1-8fa06c13f981.jpg"],
      featured: true,
      categoryIds: [cuadros.id],
      variants: [
        { name: "Color", value: "Rosa", stock: 5 },
        { name: "Color", value: "Lavanda", stock: 4 },
        { name: "Color", value: "Blanco", stock: 6 },
      ],
    },
    {
      name: "Portavelas Artesanal",
      slug: "portavelas-artesanal",
      description:
        "Portavelas hecho a mano en cer\u00e1mica. Cada pieza es \u00fanica e irrepetible.",
      price: 650,
      imageUrl: "/api/uploads/products/00e77027-7c91-4d7b-b5f8-f3c1e5fcc34a.jpg",
      images: ["/api/uploads/products/00e77027-7c91-4d7b-b5f8-f3c1e5fcc34a.jpg"],
      featured: true,
      categoryIds: [decoracion.id],
      variants: [
        { name: "Forma", value: "Redonda", stock: 8 },
        { name: "Forma", value: "Estrella", stock: 6 },
        { name: "Forma", value: "Coraz\u00f3n", stock: 4 },
      ],
    },
    {
      name: "Cortante MDF Personalizado",
      slug: "cortante-mdf-personalizado",
      description:
        "Cortante en MDF cortado l\u00e1ser. Ideal para reposteros y manualistas. Personalizable con la forma que necesites.",
      price: 320,
      imageUrl: "/api/uploads/products/01be6a2f-9fa6-4f0e-8ad9-2757f4d3283b.jpg",
      images: ["/api/uploads/products/01be6a2f-9fa6-4f0e-8ad9-2757f4d3283b.jpg"],
      featured: true,
      categoryIds: [mdf.id],
      variants: [
        { name: "Tama\u00f1o", value: "8cm", stock: 20 },
        { name: "Tama\u00f1o", value: "10cm", stock: 15 },
        { name: "Tama\u00f1o", value: "12cm", stock: 10 },
      ],
    },
    {
      name: "Figura 3D Personalizada",
      slug: "figura-3d-personalizada",
      description:
        "Figura impresa en 3D totalmente personalizable. Eleg\u00ed forma, color y tama\u00f1o. Ideal para cake toppers y decoraci\u00f3n.",
      price: 780,
      comparePrice: 950,
      imageUrl: "/api/uploads/products/02213fd8-1356-4101-ae31-2e8b7f9878c5.png",
      images: ["/api/uploads/products/02213fd8-1356-4101-ae31-2e8b7f9878c5.png"],
      featured: true,
      categoryIds: [impresion3d.id],
      variants: [
        { name: "Color", value: "Rosa", stock: 10 },
        { name: "Color", value: "Blanco", stock: 8 },
        { name: "Color", value: "Lavanda", stock: 6 },
      ],
    },
    {
      name: "Kit Regalo Especial",
      slug: "kit-regalo-especial",
      description:
        "Kit regalo con vela arom\u00e1tica, jab\u00f3n artesanal y sales de ba\u00f1o. Presentado en caja decorativa.",
      price: 1200,
      comparePrice: 1500,
      imageUrl: "/api/uploads/products/033721a6-58b9-4ce7-b4fe-f1751afb9e96.jpg",
      images: ["/api/uploads/products/033721a6-58b9-4ce7-b4fe-f1751afb9e96.jpg"],
      featured: true,
      categoryIds: [regalos.id],
      variants: [
        { name: "Variante", value: "Rosas", stock: 5 },
        { name: "Variante", value: "Lavanda", stock: 4 },
      ],
    },
    {
      name: "Difusor de Aromas Bamb\u00fa",
      slug: "difusor-aromas-bambu",
      description:
        "Difusor natural con varillas de bamb\u00fa y aceites esenciales. Duraci\u00f3n de hasta 3 meses.",
      price: 520,
      imageUrl: "/api/uploads/products/03a2aa0d-b916-4956-9b1e-d72a7877a622.jpg",
      images: ["/api/uploads/products/03a2aa0d-b916-4956-9b1e-d72a7877a622.jpg"],
      featured: true,
      categoryIds: [decoracion.id],
      variants: [
        { name: "Aroma", value: "Vainilla", stock: 10 },
        { name: "Aroma", value: "Jazm\u00edn", stock: 8 },
        { name: "Aroma", value: "Canela", stock: 6 },
      ],
    },
  ];

  for (const p of products) {
    const { variants, categoryIds, ...productBase } = p;
    await prisma.product.upsert({
      where: { slug: p.slug },
      update: {
        imageUrl: productBase.imageUrl ?? null,
        images: productBase.images,
        categories: {
          set: categoryIds.map((id) => ({ id })),
        },
      },
      create: {
        ...productBase,
        categories: {
          connect: categoryIds.map((id) => ({ id })),
        },
        variants: { create: variants },
      },
    });
  }
  console.log(`${products.length} products created`);

  const paymentAccounts = [
    {
      holderName: "María José Vargas",
      accountNumber: "6076414",
      bankName: "Midinero",
      bankKey: "midinero",
      sortOrder: 0,
    },
    {
      holderName: "María José Vargas",
      accountNumber: "4.315.969-4",
      bankName: "Giro en redes de cobranza",
      bankKey: "giro",
      sortOrder: 1,
    },
    {
      holderName: "María José Vargas",
      accountNumber: "2556392",
      bankName: "ITAÚ",
      bankKey: "itau",
      sortOrder: 2,
    },
    {
      holderName: "Nicolás Kasmenko",
      accountNumber: "0487712800 Suc. 025",
      bankName: "Scotiabank",
      bankKey: "scotiabank",
      sortOrder: 3,
    },
    {
      holderName: "Franco Kasmenko",
      accountNumber: "110659548-00001",
      bankName: "BROU",
      bankKey: "brou",
      sortOrder: 4,
    },
  ];

  for (const pa of paymentAccounts) {
    const exists = await prisma.paymentAccount.findFirst({
      where: {
        accountNumber: pa.accountNumber,
        bankName: pa.bankName,
      },
    });
    if (!exists) {
      await prisma.paymentAccount.create({ data: { ...pa, active: true } });
    }
  }
  console.log("Payment accounts ensured");

  const mvdZone = await prisma.shippingZone.findFirst({
    where: { name: "Montevideo (cadetería)" },
  });
  if (!mvdZone) {
    await prisma.shippingZone.create({
      data: {
        name: "Montevideo (cadetería)",
        price: 250,
        departmentNames: ["Montevideo"],
        cityNames: [],
        active: true,
        sortOrder: 0,
      },
    });
    console.log("Default shipping zone Montevideo created");
  }

  // Site settings
  await prisma.siteSettings.upsert({
    where: { id: "main" },
    update: {},
    create: {
      id: "main",
      siteName: "Karamba",
      siteDescription: "Productos y herramientas para tu creatividad. Tienda online con envíos en Uruguay.",
      contactEmail: "karamba@vera.com.uy",
      contactPhone: "2509 9128",
      contactAddress: "Solferino 4041, Montevideo",
      instagram: "@karamba",
      whatsapp: "097 629 629",
    },
  });
  console.log("Site settings created");

  console.log("\nSeed complete!");
  console.log("Credentials:");
  console.log("  Admin: admin@karamba.com.uy / admin123");
  console.log("  User:  usuario@test.com / user123");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
