import { PrismaClient } from "@prisma/client";
import * as argon2 from "argon2";
import { PermissionCode, StaffRoleCode } from "@universenfants/shared";

const prisma = new PrismaClient();

const ROLE_PERMISSIONS: Record<string, string[]> = {
  [StaffRoleCode.SUPER_ADMIN]: Object.values(PermissionCode),
  [StaffRoleCode.CATALOG_MANAGER]: [
    PermissionCode.PRODUCT_READ,
    PermissionCode.PRODUCT_CREATE,
    PermissionCode.PRODUCT_UPDATE,
  ],
  [StaffRoleCode.ORDERS_MANAGER]: [
    PermissionCode.ORDER_READ,
    PermissionCode.ORDER_UPDATE,
    PermissionCode.ORDER_CANCEL,
    PermissionCode.CUSTOMER_READ,
  ],
  [StaffRoleCode.MARKETING_MANAGER]: [
    PermissionCode.COUPON_CREATE,
    PermissionCode.COUPON_UPDATE,
    PermissionCode.PROMOTION_CREATE,
    PermissionCode.PROMOTION_UPDATE,
  ],
  [StaffRoleCode.STOCK_MANAGER]: [PermissionCode.STOCK_UPDATE, PermissionCode.PRODUCT_READ],
  [StaffRoleCode.ANALYTICS_MANAGER]: [PermissionCode.ANALYTICS_READ, PermissionCode.ANALYTICS_EXPORT],
  [StaffRoleCode.CUSTOMER_SERVICE]: [
    PermissionCode.CUSTOMER_READ,
    PermissionCode.ORDER_READ,
  ],
  [StaffRoleCode.READ_ONLY]: [
    PermissionCode.PRODUCT_READ,
    PermissionCode.ORDER_READ,
    PermissionCode.CUSTOMER_READ,
    PermissionCode.ANALYTICS_READ,
  ],
};

const ROLE_NAMES: Record<string, string> = {
  SUPER_ADMIN: "Super Administrateur",
  CATALOG_MANAGER: "Responsable Catalogue",
  ORDERS_MANAGER: "Responsable Commandes",
  MARKETING_MANAGER: "Responsable Marketing",
  STOCK_MANAGER: "Responsable Stock",
  ANALYTICS_MANAGER: "Responsable Analytics",
  CUSTOMER_SERVICE: "Service Client",
  READ_ONLY: "Lecture Seule",
};

async function main() {
  console.log("Seeding permissions...");
  for (const code of Object.values(PermissionCode)) {
    await prisma.permission.upsert({
      where: { code },
      update: {},
      create: { code, description: code },
    });
  }

  console.log("Seeding roles...");
  for (const [code, name] of Object.entries(ROLE_NAMES)) {
    const role = await prisma.role.upsert({
      where: { code },
      update: {},
      create: { code, name },
    });
    const permissionCodes = ROLE_PERMISSIONS[code] ?? [];
    for (const permCode of permissionCodes) {
      const permission = await prisma.permission.findUnique({ where: { code: permCode } });
      if (!permission) continue;
      await prisma.rolePermission.upsert({
        where: { roleId_permissionId: { roleId: role.id, permissionId: permission.id } },
        update: {},
        create: { roleId: role.id, permissionId: permission.id },
      });
    }
  }

  console.log("Seeding super admin...");
  const superAdminRole = await prisma.role.findUniqueOrThrow({ where: { code: "SUPER_ADMIN" } });
  await prisma.staffUser.upsert({
    where: { email: "admin@universenfants.ma" },
    update: {},
    create: {
      name: "Admin UniversEnfants",
      email: "admin@universenfants.ma",
      passwordHash: await argon2.hash("ChangeMe123!"),
      roleId: superAdminRole.id,
    },
  });

  console.log("Seeding cities...");
  const horsCasa = await prisma.cityGroup.upsert({
    where: { name: "Hors Casablanca" },
    update: {},
    create: { name: "Hors Casablanca", shippingFee: 35 },
  });
  const cities: { name: string; shippingFee: number; freeShippingFrom?: number; groupId?: string }[] = [
    { name: "Casablanca", shippingFee: 20, freeShippingFrom: 300 },
    { name: "Rabat", shippingFee: 35, freeShippingFrom: 400, groupId: horsCasa.id },
    { name: "Marrakech", shippingFee: 35, freeShippingFrom: 400, groupId: horsCasa.id },
    { name: "Fès", shippingFee: 40, groupId: horsCasa.id },
    { name: "Tanger", shippingFee: 40, groupId: horsCasa.id },
    { name: "Agadir", shippingFee: 45, groupId: horsCasa.id },
  ];
  for (const c of cities) {
    await prisma.city.upsert({ where: { name: c.name }, update: {}, create: c });
  }

  console.log("Seeding categories...");
  const categoriesData = [
    { slug: "construction", nameFr: "Construction", image: "🧱" },
    { slug: "poupees", nameFr: "Poupées & Figurines", image: "🎀" },
    { slug: "educatifs", nameFr: "Jouets éducatifs", image: "🧩" },
    { slug: "societe", nameFr: "Jeux de société", image: "🎲" },
    { slug: "plein-air", nameFr: "Plein air", image: "⚽" },
    { slug: "bebe", nameFr: "Bébé", image: "🍼" },
    { slug: "scolaire", nameFr: "Scolaire", image: "🎒" },
  ];
  const categories: Record<string, string> = {};
  for (const c of categoriesData) {
    const cat = await prisma.category.upsert({ where: { slug: c.slug }, update: {}, create: c });
    categories[c.slug] = cat.id;
  }

  console.log("Seeding brands...");
  const brandsData = ["LEGO", "Barbie", "Hot Wheels", "Fisher-Price", "VTech", "Playmobil", "Chicco", "Clairefontaine"];
  const brands: Record<string, string> = {};
  for (const name of brandsData) {
    const b = await prisma.brand.upsert({
      where: { name },
      update: {},
      create: { name, slug: name.toLowerCase().replace(/[^a-z0-9]+/g, "-") },
    });
    brands[name] = b.id;
  }

  console.log("Seeding products...");
  const productsData = [
    {
      sku: "LEGO-CTY-6012",
      nameFr: "LEGO City — Commissariat de Police",
      categorySlug: "construction",
      brand: "LEGO",
      price: 599,
      promoPrice: 499,
      costPrice: 300,
      stock: 12,
      ageMin: 6,
      ageMax: 12,
      seoUrl: "lego-city-commissariat-de-police",
    },
    {
      sku: "BAR-DRM-2201",
      nameFr: "Barbie — Maison de Rêve 3 étages",
      categorySlug: "poupees",
      brand: "Barbie",
      price: 899,
      promoPrice: 749,
      costPrice: 480,
      stock: 5,
      ageMin: 4,
      ageMax: 9,
      seoUrl: "barbie-maison-de-reve-3-etages",
    },
    {
      sku: "HWH-CRC-3390",
      nameFr: "Hot Wheels — Circuit Ultime",
      categorySlug: "construction",
      brand: "Hot Wheels",
      price: 449,
      costPrice: 260,
      stock: 18,
      ageMin: 5,
      ageMax: 10,
      seoUrl: "hot-wheels-circuit-ultime",
    },
    {
      sku: "FP-EVL-1145",
      nameFr: "Fisher-Price — Table d'Éveil Musicale",
      categorySlug: "bebe",
      brand: "Fisher-Price",
      price: 449,
      promoPrice: 399,
      costPrice: 240,
      stock: 8,
      ageMin: 0,
      ageMax: 2,
      seoUrl: "fisher-price-table-eveil-musicale",
    },
    {
      sku: "SCH-CRT-5541",
      nameFr: "Cartable Premium Ergonomique",
      categorySlug: "scolaire",
      price: 349,
      costPrice: 190,
      stock: 22,
      ageMin: 6,
      ageMax: 12,
      seoUrl: "cartable-premium-ergonomique",
    },
    {
      sku: "SOC-AVT-1500",
      nameFr: "Les Aventuriers du Rail",
      categorySlug: "societe",
      price: 249,
      costPrice: 130,
      stock: 15,
      ageMin: 8,
      ageMax: 99,
      seoUrl: "les-aventuriers-du-rail",
    },
  ];
  for (const p of productsData) {
    await prisma.product.upsert({
      where: { sku: p.sku },
      update: {},
      create: {
        sku: p.sku,
        nameFr: p.nameFr,
        categoryId: categories[p.categorySlug]!,
        brandId: p.brand ? brands[p.brand] : undefined,
        price: p.price,
        promoPrice: p.promoPrice,
        costPrice: p.costPrice,
        stock: p.stock,
        ageMin: p.ageMin,
        ageMax: p.ageMax,
        seoUrl: p.seoUrl,
        status: "ACTIVE",
      },
    });
  }

  console.log("Seed complete.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
