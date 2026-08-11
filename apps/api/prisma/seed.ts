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

  // Une sous-catégorie réelle — sans ça, la navigation/l'inclusion des
  // descendants sur la page catégorie parente (products.service.ts#list)
  // n'avait jamais de données pour être testée localement.
  const circuitsVehicules = await prisma.category.upsert({
    where: { slug: "circuits-vehicules" },
    update: {},
    create: { slug: "circuits-vehicules", nameFr: "Circuits & Véhicules", image: "🏎️", parentId: categories["construction"] },
  });
  categories["circuits-vehicules"] = circuitsVehicules.id;

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
      categorySlug: "circuits-vehicules",
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

  console.log("Seeding extended demo catalog (front-office audit coverage)...");
  const demoProductsData: {
    sku: string;
    nameFr: string;
    categorySlug: string;
    brand?: string;
    price: number;
    promoPrice?: number;
    costPrice: number;
    stock: number;
    ageMin?: number;
    ageMax?: number;
    targetGender?: "BOY" | "GIRL" | "UNISEX";
    seoUrl: string;
    variants?: { label: string; skuSuffix: string }[];
  }[] = [
    { sku: "LEGO-DUP-1001", nameFr: "LEGO Duplo — La Ferme", categorySlug: "construction", brand: "LEGO", price: 249, costPrice: 130, stock: 20, ageMin: 0, ageMax: 2, targetGender: "UNISEX", seoUrl: "lego-duplo-la-ferme" },
    { sku: "LEGO-TEC-2201", nameFr: "LEGO Technic — Voiture de Course", categorySlug: "circuits-vehicules", brand: "LEGO", price: 799, promoPrice: 699, costPrice: 480, stock: 6, ageMin: 9, ageMax: 12, targetGender: "BOY", seoUrl: "lego-technic-voiture-de-course" },
    { sku: "BOI-CIR-3301", nameFr: "Circuit de Billes en Bois", categorySlug: "construction", price: 199, costPrice: 100, stock: 0, ageMin: 3, ageMax: 5, targetGender: "UNISEX", seoUrl: "circuit-de-billes-en-bois" },
    { sku: "POU-BEB-1102", nameFr: "Poupée Bébé qui Pleure", categorySlug: "poupees", price: 179, costPrice: 95, stock: 25, ageMin: 3, ageMax: 5, targetGender: "GIRL", seoUrl: "poupee-bebe-qui-pleure", variants: [{ label: "Blonde", skuSuffix: "BLD" }, { label: "Brune", skuSuffix: "BRN" }] },
    { sku: "FIG-SUP-2205", nameFr: "Figurines Super-Héros — Pack de 6", categorySlug: "poupees", price: 149, costPrice: 75, stock: 3, ageMin: 6, ageMax: 8, targetGender: "BOY", seoUrl: "figurines-super-heros-pack-6" },
    { sku: "PLA-CHT-4401", nameFr: "Playmobil — Château des Princesses", categorySlug: "poupees", brand: "Playmobil", price: 549, promoPrice: 469, costPrice: 320, stock: 9, ageMin: 4, ageMax: 9, targetGender: "GIRL", seoUrl: "playmobil-chateau-des-princesses" },
    { sku: "VTE-TAB-1203", nameFr: "VTech — Tablette Éducative", categorySlug: "educatifs", brand: "VTech", price: 399, costPrice: 220, stock: 14, ageMin: 3, ageMax: 5, targetGender: "UNISEX", seoUrl: "vtech-tablette-educative" },
    { sku: "PUZ-ANI-0501", nameFr: "Puzzle 100 pièces — Animaux du Monde", categorySlug: "educatifs", price: 89, costPrice: 40, stock: 40, ageMin: 6, ageMax: 8, targetGender: "UNISEX", seoUrl: "puzzle-100-pieces-animaux-du-monde" },
    { sku: "EDU-ALP-0902", nameFr: "Jeu de Cartes — Alphabet Rigolo", categorySlug: "educatifs", price: 69, costPrice: 30, stock: 0, ageMin: 3, ageMax: 5, targetGender: "UNISEX", seoUrl: "jeu-de-cartes-alphabet-rigolo" },
    { sku: "SOC-UNO-1000", nameFr: "Uno — Édition Classique", categorySlug: "societe", price: 89, costPrice: 35, stock: 30, ageMin: 6, ageMax: 99, targetGender: "UNISEX", seoUrl: "uno-edition-classique" },
    { sku: "SOC-MOJ-2299", nameFr: "Monopoly Junior", categorySlug: "societe", price: 199, promoPrice: 159, costPrice: 100, stock: 2, ageMin: 6, ageMax: 12, targetGender: "UNISEX", seoUrl: "monopoly-junior" },
    { sku: "PLE-TRO-3001", nameFr: "Trottinette 3 Roues", categorySlug: "plein-air", price: 449, costPrice: 260, stock: 8, ageMin: 3, ageMax: 5, targetGender: "UNISEX", seoUrl: "trottinette-3-roues" },
    { sku: "PLE-BAL-0501", nameFr: "Ballon de Foot — Taille 5", categorySlug: "plein-air", price: 129, costPrice: 55, stock: 20, ageMin: 9, ageMax: 12, targetGender: "BOY", seoUrl: "ballon-de-foot-taille-5" },
    { sku: "PLE-VEL-1601", nameFr: "Vélo Enfant 16 Pouces", categorySlug: "plein-air", price: 899, costPrice: 540, stock: 4, ageMin: 6, ageMax: 8, targetGender: "UNISEX", seoUrl: "velo-enfant-16-pouces", variants: [{ label: "Bleu", skuSuffix: "BLU" }, { label: "Rose", skuSuffix: "PNK" }] },
    { sku: "CHI-POR-0001", nameFr: "Chicco — Portique d'Éveil", categorySlug: "bebe", brand: "Chicco", price: 349, costPrice: 190, stock: 11, ageMin: 0, ageMax: 2, targetGender: "UNISEX", seoUrl: "chicco-portique-eveil" },
    { sku: "BEB-DEN-0502", nameFr: "Anneaux de Dentition — Lot de 5", categorySlug: "bebe", price: 59, costPrice: 22, stock: 60, ageMin: 0, ageMax: 2, targetGender: "UNISEX", seoUrl: "anneaux-de-dentition-lot-5" },
    { sku: "BEB-DOU-1301", nameFr: "Doudou Musical Lapin", categorySlug: "bebe", price: 129, costPrice: 60, stock: 0, ageMin: 0, ageMax: 2, targetGender: "UNISEX", seoUrl: "doudou-musical-lapin" },
    { sku: "CLA-TRO-0301", nameFr: "Trousse Clairefontaine 3 Compartiments", categorySlug: "scolaire", brand: "Clairefontaine", price: 79, costPrice: 35, stock: 35, ageMin: 6, ageMax: 12, targetGender: "UNISEX", seoUrl: "trousse-clairefontaine-3-compartiments", variants: [{ label: "Bleu marine", skuSuffix: "NAV" }, { label: "Rose", skuSuffix: "PNK" }, { label: "Vert", skuSuffix: "GRN" }] },
    { sku: "SCO-ARD-0401", nameFr: "Ardoise Magique Effaçable", categorySlug: "scolaire", price: 49, costPrice: 18, stock: 18, ageMin: 3, ageMax: 5, targetGender: "UNISEX", seoUrl: "ardoise-magique-effacable" },
    { sku: "SCO-SAC-2001", nameFr: "Sac à Dos Maternelle", categorySlug: "scolaire", price: 199, costPrice: 95, stock: 5, ageMin: 3, ageMax: 5, targetGender: "GIRL", seoUrl: "sac-a-dos-maternelle" },
  ];

  const demoProductIds: Record<string, string> = {};
  for (const p of demoProductsData) {
    const product = await prisma.product.upsert({
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
        targetGender: p.targetGender ?? "UNISEX",
        seoUrl: p.seoUrl,
        status: "ACTIVE",
      },
    });
    demoProductIds[p.sku] = product.id;
    for (const v of p.variants ?? []) {
      await prisma.productVariant.upsert({
        where: { sku: `${p.sku}-${v.skuSuffix}` },
        update: {},
        create: { productId: product.id, sku: `${p.sku}-${v.skuSuffix}`, label: v.label, stock: Math.max(1, Math.floor(p.stock / (p.variants!.length || 1))) },
      });
    }
  }

  // Réutilise les 3 visuels déjà présents en local (uploadés lors des tests
  // précédents) plutôt que d'écrire de nouveaux fichiers factices sur disque —
  // suffisant pour vérifier que la grille/fiche produit affichent bien une
  // image plutôt qu'un espace vide, ce qui était le cas pour 11 produits/12
  // avant cet ajout.
  const sharedImages = await prisma.productImage.findMany({ take: 3, orderBy: { createdAt: "asc" } });
  if (sharedImages.length > 0) {
    for (const sku of Object.keys(demoProductIds)) {
      const productId = demoProductIds[sku]!;
      const existing = await prisma.productImage.findFirst({ where: { productId } });
      if (existing) continue;
      await prisma.productImage.create({
        data: { productId, url: sharedImages[0]!.url, thumbnailUrl: sharedImages[0]!.thumbnailUrl, order: 0 },
      });
    }
  }

  console.log("Seeding hero banners...");
  const bannersData = [
    { titleFr: "Le Conseiller Cadeau qui trouve le jouet parfait", subtitleFr: "Répondez à 3 questions, recevez des suggestions sur mesure", link: "/conseiller-cadeau", order: 0 },
    { titleFr: "Créez la liste d'anniversaire de vos enfants", subtitleFr: "Partagez-la avec famille et amis en un lien", link: "/liste-anniversaire", order: 1 },
    { titleFr: "Jusqu'à -20% sur l'univers Construction", subtitleFr: "Offre à durée limitée", link: "/categorie/construction", order: 2 },
  ];
  const bannerImage = sharedImages[0]?.url ?? "http://localhost:4000/uploads/products/placeholder.webp";
  for (const b of bannersData) {
    const already = await prisma.heroBanner.findFirst({ where: { titleFr: b.titleFr } });
    if (already) continue;
    await prisma.heroBanner.create({
      data: { titleFr: b.titleFr, subtitleFr: b.subtitleFr, link: b.link, order: b.order, imageDesktop: bannerImage, imageMobile: bannerImage, status: "ACTIVE" },
    });
  }

  console.log("Seeding reviews...");
  const reviewCustomers = await prisma.customer.findMany({ take: 12, orderBy: { createdAt: "asc" } });
  const reviewTargets = [
    ...Object.values(demoProductIds).slice(0, 8),
  ];
  const reviewTexts = [
    { rating: 5, comment: "Mes enfants adorent, très bonne qualité et livraison rapide." },
    { rating: 4, comment: "Bon produit, conforme à la description." },
    { rating: 5, comment: "Parfait pour l'anniversaire de ma fille, je recommande." },
    { rating: 3, comment: "Correct mais un peu cher pour la qualité." },
    { rating: 5, comment: undefined },
    { rating: 4, comment: "Emballage soigné, produit conforme aux photos." },
  ];
  let reviewIdx = 0;
  for (let i = 0; i < Math.min(reviewCustomers.length, reviewTargets.length); i++) {
    const customer = reviewCustomers[i]!;
    const productId = reviewTargets[i]!;
    const already = await prisma.review.findUnique({ where: { productId_customerId: { productId, customerId: customer.id } } });
    if (already) continue;
    const text = reviewTexts[reviewIdx % reviewTexts.length]!;
    reviewIdx++;
    await prisma.review.create({
      data: { productId, customerId: customer.id, rating: text.rating, comment: text.comment, status: "APPROVED" },
    });
  }

  console.log("Seeding a bundle...");
  // FP-EVL-1145 vient de la boucle productsData plus haut (pas
  // demoProductsData) — chercher les deux dans demoProductIds uniquement
  // faisait manquer ce SKU et créait un bundle à 2 produits sur 3.
  const bundleProductSkus = ["FP-EVL-1145", "CHI-POR-0001", "BEB-DOU-1301"];
  const bundleProducts = await prisma.product.findMany({ where: { sku: { in: bundleProductSkus } }, select: { id: true } });
  const bundleProductIds = bundleProducts.map((p: { id: string }) => p.id);
  const existingBundle = await prisma.bundle.findFirst({ where: { name: "Pack Découverte Bébé" } });
  if (!existingBundle && bundleProductIds.length === bundleProductSkus.length) {
    // 449 (promo 399) + 349 + 129 = 877 DH au prix effectif : un vrai rabais,
    // pas un bundle plus cher que l'achat séparé.
    await prisma.bundle.create({
      data: {
        name: "Pack Découverte Bébé",
        bundlePrice: 749,
        status: "ACTIVE",
        items: { create: bundleProductIds.map((productId: string) => ({ productId, quantity: 1 })) },
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
