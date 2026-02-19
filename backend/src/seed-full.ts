import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { v4 as uuid } from 'uuid';

const prisma = new PrismaClient();

function past(daysAgo: number): Date {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  d.setHours(Math.floor(Math.random() * 12) + 8, Math.floor(Math.random() * 60));
  return d;
}

async function main() {
  const adminPassword = await bcrypt.hash('admin123', 10);
  const admin = await prisma.user.upsert({
    where: { email: 'admin@store.com' },
    update: {},
    create: {
      name: 'Gérant',
      email: 'admin@store.com',
      password: adminPassword,
      role: 'gerant',
      active: true,
      mustChangePassword: true,
    },
  });
  console.log('Utilisateur admin:', admin.email);

  const catAlimentation = await prisma.category.create({ data: { id: uuid(), name: 'Alimentation' } });
  const catBoissons = await prisma.category.create({ data: { id: uuid(), name: 'Boissons' } });
  const catHygiene = await prisma.category.create({ data: { id: uuid(), name: 'Hygiène' } });
  const catElectronique = await prisma.category.create({ data: { id: uuid(), name: 'Électronique' } });
  const catPapeterie = await prisma.category.create({ data: { id: uuid(), name: 'Papeterie' } });
  const catMenage = await prisma.category.create({ data: { id: uuid(), name: 'Ménage' } });
  console.log('6 catégories créées');

  const productsData = [
    { name: 'Riz 5kg', barcode: '6001234500001', categoryId: catAlimentation.id, buyPrice: 2500, sellPrice: 3200, quantity: 45, alertThreshold: 10 },
    { name: 'Huile Dinor 1L', barcode: '6001234500002', categoryId: catAlimentation.id, buyPrice: 1200, sellPrice: 1500, quantity: 30, alertThreshold: 8 },
    { name: 'Sucre 1kg', barcode: '6001234500003', categoryId: catAlimentation.id, buyPrice: 600, sellPrice: 800, quantity: 60, alertThreshold: 15 },
    { name: 'Lait Nido 400g', barcode: '6001234500004', categoryId: catAlimentation.id, buyPrice: 2000, sellPrice: 2500, quantity: 20, alertThreshold: 5 },
    { name: 'Pâtes Spaghetti 500g', barcode: '6001234500005', categoryId: catAlimentation.id, buyPrice: 350, sellPrice: 500, quantity: 80, alertThreshold: 20 },
    { name: 'Tomate concentrée 70g', barcode: '6001234500006', categoryId: catAlimentation.id, buyPrice: 100, sellPrice: 150, quantity: 120, alertThreshold: 30 },
    { name: 'Sel 1kg', barcode: '6001234500007', categoryId: catAlimentation.id, buyPrice: 200, sellPrice: 300, quantity: 50, alertThreshold: 10 },
    { name: 'Café Nescafé 50g', barcode: '6001234500008', categoryId: catBoissons.id, buyPrice: 800, sellPrice: 1100, quantity: 25, alertThreshold: 5 },
    { name: 'Eau minérale 1.5L', barcode: '6001234500009', categoryId: catBoissons.id, buyPrice: 250, sellPrice: 400, quantity: 100, alertThreshold: 20 },
    { name: 'Jus de fruit Banga 1L', barcode: '6001234500010', categoryId: catBoissons.id, buyPrice: 500, sellPrice: 750, quantity: 35, alertThreshold: 8 },
    { name: 'Coca-Cola 33cl', barcode: '6001234500011', categoryId: catBoissons.id, buyPrice: 200, sellPrice: 350, quantity: 48, alertThreshold: 10 },
    { name: 'Thé Lipton 25 sachets', barcode: '6001234500012', categoryId: catBoissons.id, buyPrice: 600, sellPrice: 850, quantity: 15, alertThreshold: 5 },
    { name: 'Savon Palmolive', barcode: '6001234500013', categoryId: catHygiene.id, buyPrice: 300, sellPrice: 450, quantity: 40, alertThreshold: 10 },
    { name: 'Dentifrice Colgate 100ml', barcode: '6001234500014', categoryId: catHygiene.id, buyPrice: 500, sellPrice: 700, quantity: 25, alertThreshold: 8 },
    { name: 'Shampooing 250ml', barcode: '6001234500015', categoryId: catHygiene.id, buyPrice: 800, sellPrice: 1100, quantity: 18, alertThreshold: 5 },
    { name: 'Papier hygiénique x4', barcode: '6001234500016', categoryId: catHygiene.id, buyPrice: 400, sellPrice: 600, quantity: 30, alertThreshold: 8 },
    { name: 'Pile AA x2', barcode: '6001234500017', categoryId: catElectronique.id, buyPrice: 300, sellPrice: 500, quantity: 50, alertThreshold: 10 },
    { name: 'Ampoule LED 9W', barcode: '6001234500018', categoryId: catElectronique.id, buyPrice: 500, sellPrice: 800, quantity: 15, alertThreshold: 5 },
    { name: 'Chargeur téléphone USB', barcode: '6001234500019', categoryId: catElectronique.id, buyPrice: 1500, sellPrice: 2500, quantity: 12, alertThreshold: 3 },
    { name: 'Cahier 200 pages', barcode: '6001234500020', categoryId: catPapeterie.id, buyPrice: 250, sellPrice: 400, quantity: 70, alertThreshold: 15 },
    { name: 'Stylo Bic bleu x3', barcode: '6001234500021', categoryId: catPapeterie.id, buyPrice: 150, sellPrice: 250, quantity: 90, alertThreshold: 20 },
    { name: 'Javel 1L', barcode: '6001234500022', categoryId: catMenage.id, buyPrice: 350, sellPrice: 500, quantity: 28, alertThreshold: 8 },
    { name: 'Éponge vaisselle x3', barcode: '6001234500023', categoryId: catMenage.id, buyPrice: 150, sellPrice: 250, quantity: 40, alertThreshold: 10 },
    { name: 'Détergent OMO 500g', barcode: '6001234500024', categoryId: catMenage.id, buyPrice: 700, sellPrice: 1000, quantity: 22, alertThreshold: 5 },
  ];

  const products: { id: string; name: string; sellPrice: number; buyPrice: number; quantity: number }[] = [];
  for (const p of productsData) {
    products.push(await prisma.product.create({ data: { id: uuid(), ...p } }));
  }
  console.log(products.length + ' produits créés');

  const clientsData = [
    { name: 'Amadou Diallo', phone: '76 12 34 56', creditBalance: 5200 },
    { name: 'Fatoumata Traoré', phone: '66 23 45 67', creditBalance: 0 },
    { name: 'Moussa Konaté', phone: '78 34 56 78', creditBalance: 12000 },
    { name: 'Awa Coulibaly', phone: '65 45 67 89', creditBalance: 3500 },
    { name: 'Ibrahim Sanogo', phone: '76 56 78 90', creditBalance: 0 },
    { name: 'Mariam Sidibé', phone: '66 67 89 01', creditBalance: 8000 },
    { name: 'Oumar Keita', phone: '78 78 90 12', creditBalance: 0 },
    { name: 'Kadiatou Bah', phone: '65 89 01 23', creditBalance: 1500 },
  ];
  const clients = [];
  for (const c of clientsData) {
    clients.push(await prisma.customer.create({ data: { id: uuid(), ...c } }));
  }
  console.log(clients.length + ' clients créés');

  const suppliersData = [
    { name: 'Grossiste Bamako Central', phone: '20 22 33 44', address: 'Marché de Medine, Bamako' },
    { name: 'SODIBAF Distribution', phone: '20 33 44 55', address: 'Zone Industrielle, Bamako' },
    { name: 'Sahelienne Import', phone: '20 44 55 66', address: 'Badalabougou, Bamako' },
  ];
  const suppliers = [];
  for (const s of suppliersData) {
    suppliers.push(await prisma.supplier.create({ data: { id: uuid(), ...s } }));
  }
  console.log(suppliers.length + ' fournisseurs créés');

  const salesData = [
    { daysAgo: 0, items: [{ pIdx: 0, qty: 2 }, { pIdx: 5, qty: 5 }], method: 'cash' as const },
    { daysAgo: 0, items: [{ pIdx: 8, qty: 3 }, { pIdx: 10, qty: 6 }], method: 'mobile' as const },
    { daysAgo: 0, items: [{ pIdx: 12, qty: 2 }, { pIdx: 15, qty: 1 }], method: 'cash' as const },
    { daysAgo: 1, items: [{ pIdx: 1, qty: 1 }, { pIdx: 2, qty: 3 }, { pIdx: 6, qty: 2 }], method: 'cash' as const },
    { daysAgo: 1, items: [{ pIdx: 9, qty: 2 }, { pIdx: 13, qty: 1 }], method: 'mobile' as const },
    { daysAgo: 2, items: [{ pIdx: 0, qty: 1 }, { pIdx: 3, qty: 1 }, { pIdx: 7, qty: 1 }], method: 'cash' as const, clientIdx: 1 },
    { daysAgo: 2, items: [{ pIdx: 19, qty: 5 }, { pIdx: 20, qty: 3 }], method: 'cash' as const },
    { daysAgo: 3, items: [{ pIdx: 4, qty: 4 }, { pIdx: 5, qty: 10 }], method: 'credit' as const, clientIdx: 3 },
    { daysAgo: 3, items: [{ pIdx: 16, qty: 2 }, { pIdx: 17, qty: 3 }], method: 'cash' as const },
    { daysAgo: 4, items: [{ pIdx: 21, qty: 2 }, { pIdx: 22, qty: 3 }, { pIdx: 23, qty: 1 }], method: 'cash' as const },
    { daysAgo: 5, items: [{ pIdx: 0, qty: 3 }, { pIdx: 1, qty: 2 }], method: 'cash' as const, clientIdx: 4 },
    { daysAgo: 5, items: [{ pIdx: 8, qty: 4 }, { pIdx: 11, qty: 2 }], method: 'mobile' as const },
    { daysAgo: 6, items: [{ pIdx: 14, qty: 1 }, { pIdx: 12, qty: 3 }], method: 'cash' as const },
    { daysAgo: 7, items: [{ pIdx: 2, qty: 5 }, { pIdx: 6, qty: 3 }], method: 'cash' as const, clientIdx: 6 },
    { daysAgo: 8, items: [{ pIdx: 18, qty: 1 }], method: 'cash' as const },
    { daysAgo: 9, items: [{ pIdx: 3, qty: 2 }, { pIdx: 7, qty: 2 }, { pIdx: 10, qty: 4 }], method: 'mobile' as const },
    { daysAgo: 10, items: [{ pIdx: 0, qty: 1 }, { pIdx: 5, qty: 8 }], method: 'cash' as const },
    { daysAgo: 12, items: [{ pIdx: 9, qty: 3 }, { pIdx: 11, qty: 1 }], method: 'credit' as const, clientIdx: 5 },
    { daysAgo: 14, items: [{ pIdx: 19, qty: 10 }, { pIdx: 20, qty: 5 }], method: 'cash' as const },
    { daysAgo: 16, items: [{ pIdx: 4, qty: 6 }, { pIdx: 2, qty: 2 }], method: 'cash' as const, clientIdx: 1 },
    { daysAgo: 18, items: [{ pIdx: 13, qty: 2 }, { pIdx: 15, qty: 2 }], method: 'mobile' as const },
    { daysAgo: 20, items: [{ pIdx: 16, qty: 4 }, { pIdx: 23, qty: 2 }], method: 'cash' as const },
    { daysAgo: 22, items: [{ pIdx: 1, qty: 3 }, { pIdx: 0, qty: 1 }], method: 'cash' as const, clientIdx: 6 },
    { daysAgo: 25, items: [{ pIdx: 8, qty: 6 }, { pIdx: 10, qty: 8 }], method: 'cash' as const },
    { daysAgo: 28, items: [{ pIdx: 12, qty: 4 }, { pIdx: 14, qty: 1 }], method: 'mobile' as const },
  ];

  let salesCount = 0;
  for (const sale of salesData) {
    const saleId = uuid();
    const date = past(sale.daysAgo);
    const saleItems = sale.items.map((item) => ({
      id: uuid(),
      productId: products[item.pIdx].id,
      productName: products[item.pIdx].name,
      quantity: item.qty,
      unitPrice: products[item.pIdx].sellPrice,
      total: item.qty * products[item.pIdx].sellPrice,
    }));
    const total = saleItems.reduce((acc, i) => acc + i.total, 0);

    await prisma.sale.create({
      data: {
        id: saleId,
        userId: admin.id,
        customerId: sale.clientIdx !== undefined ? clients[sale.clientIdx].id : null,
        date,
        total,
        paymentMethod: sale.method,
        status: 'completed',
        items: { create: saleItems },
      },
    });

    for (const item of saleItems) {
      await prisma.stockMovement.create({
        data: {
          id: uuid(),
          productId: item.productId,
          productName: item.productName,
          type: 'sortie',
          quantity: item.quantity,
          date,
          reason: `Vente #${saleId.slice(0, 8)}`,
        },
      });
    }
    salesCount++;
  }
  console.log(salesCount + ' ventes créées');

  const order1Id = uuid();
  const order1Date = past(10);
  await prisma.supplierOrder.create({
    data: {
      id: order1Id,
      supplierId: suppliers[0].id,
      date: order1Date,
      total: 87500,
      status: 'recue',
      items: {
        create: [
          { id: uuid(), productId: products[0].id, productName: products[0].name, quantity: 20, unitPrice: 2500, total: 50000 },
          { id: uuid(), productId: products[1].id, productName: products[1].name, quantity: 15, unitPrice: 1200, total: 18000 },
          { id: uuid(), productId: products[2].id, productName: products[2].name, quantity: 25, unitPrice: 600, total: 15000 },
          { id: uuid(), productId: products[6].id, productName: products[6].name, quantity: 15, unitPrice: 300, total: 4500 },
        ],
      },
    },
  });

  for (const item of [
    { pIdx: 0, qty: 20 }, { pIdx: 1, qty: 15 }, { pIdx: 2, qty: 25 }, { pIdx: 6, qty: 15 },
  ]) {
    await prisma.stockMovement.create({
      data: {
        id: uuid(),
        productId: products[item.pIdx].id,
        productName: products[item.pIdx].name,
        type: 'entree',
        quantity: item.qty,
        date: order1Date,
        reason: `Réception commande #${order1Id.slice(0, 8)}`,
      },
    });
  }

  await prisma.supplierOrder.create({
    data: {
      id: uuid(),
      supplierId: suppliers[1].id,
      date: past(3),
      total: 27000,
      status: 'en_attente',
      items: {
        create: [
          { id: uuid(), productId: products[8].id, productName: products[8].name, quantity: 48, unitPrice: 250, total: 12000 },
          { id: uuid(), productId: products[10].id, productName: products[10].name, quantity: 24, unitPrice: 200, total: 4800 },
          { id: uuid(), productId: products[9].id, productName: products[9].name, quantity: 20, unitPrice: 500, total: 10000 },
          { id: uuid(), productId: products[11].id, productName: products[11].name, quantity: 200, unitPrice: 1, total: 200 },
        ],
      },
    },
  });
  console.log('2 commandes fournisseurs créées');

  console.log('\n=== Seed complet terminé ===');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
