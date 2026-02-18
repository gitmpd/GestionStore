import { db } from '@/db';
import { generateId, nowISO } from '@/lib/utils';

function past(daysAgo: number): string {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  d.setHours(Math.floor(Math.random() * 12) + 8, Math.floor(Math.random() * 60));
  return d.toISOString();
}

export async function seedTestData(userId: string) {
  const now = nowISO();
  const s = { createdAt: now, updatedAt: now, syncStatus: 'pending' as const };

  // --- Utilisateurs ---
  const existingUsers = await db.users.count();
  if (existingUsers === 0) {
    await db.users.bulkAdd([
      { id: userId, name: 'Administrateur', email: 'admin@store.com', role: 'gerant', active: true, ...s },
      { id: generateId(), name: 'Vendeur', email: 'vendeur@store.com', role: 'vendeur', active: true, ...s },
      { id: generateId(), name: 'Awa Diarra', email: 'awa@store.com', role: 'vendeur', active: true, ...s },
    ]);
  }

  // --- Catégories ---
  const catAlimentation = { id: generateId(), name: 'Alimentation', ...s };
  const catBoissons     = { id: generateId(), name: 'Boissons', ...s };
  const catHygiene      = { id: generateId(), name: 'Hygiène', ...s };
  const catElectronique = { id: generateId(), name: 'Électronique', ...s };
  const catPapeterie    = { id: generateId(), name: 'Papeterie', ...s };
  const catMenage       = { id: generateId(), name: 'Ménage', ...s };

  const categories = [catAlimentation, catBoissons, catHygiene, catElectronique, catPapeterie, catMenage];
  await db.categories.bulkAdd(categories);

  // --- Produits ---
  const products = [
    { id: generateId(), name: 'Riz 5kg', barcode: '6001234500001', categoryId: catAlimentation.id, buyPrice: 2500, sellPrice: 3200, quantity: 45, alertThreshold: 10, ...s },
    { id: generateId(), name: 'Huile Dinor 1L', barcode: '6001234500002', categoryId: catAlimentation.id, buyPrice: 1200, sellPrice: 1500, quantity: 30, alertThreshold: 8, ...s },
    { id: generateId(), name: 'Sucre 1kg', barcode: '6001234500003', categoryId: catAlimentation.id, buyPrice: 600, sellPrice: 800, quantity: 60, alertThreshold: 15, ...s },
    { id: generateId(), name: 'Lait Nido 400g', barcode: '6001234500004', categoryId: catAlimentation.id, buyPrice: 2000, sellPrice: 2500, quantity: 20, alertThreshold: 5, ...s },
    { id: generateId(), name: 'Pâtes Spaghetti 500g', barcode: '6001234500005', categoryId: catAlimentation.id, buyPrice: 350, sellPrice: 500, quantity: 80, alertThreshold: 20, ...s },
    { id: generateId(), name: 'Tomate concentrée 70g', barcode: '6001234500006', categoryId: catAlimentation.id, buyPrice: 100, sellPrice: 150, quantity: 120, alertThreshold: 30, ...s },
    { id: generateId(), name: 'Sel 1kg', barcode: '6001234500007', categoryId: catAlimentation.id, buyPrice: 200, sellPrice: 300, quantity: 50, alertThreshold: 10, ...s },
    { id: generateId(), name: 'Café Nescafé 50g', barcode: '6001234500008', categoryId: catBoissons.id, buyPrice: 800, sellPrice: 1100, quantity: 25, alertThreshold: 5, ...s },
    { id: generateId(), name: 'Eau minérale 1.5L', barcode: '6001234500009', categoryId: catBoissons.id, buyPrice: 250, sellPrice: 400, quantity: 100, alertThreshold: 20, ...s },
    { id: generateId(), name: 'Jus de fruit Banga 1L', barcode: '6001234500010', categoryId: catBoissons.id, buyPrice: 500, sellPrice: 750, quantity: 35, alertThreshold: 8, ...s },
    { id: generateId(), name: 'Coca-Cola 33cl', barcode: '6001234500011', categoryId: catBoissons.id, buyPrice: 200, sellPrice: 350, quantity: 3, alertThreshold: 10, ...s },
    { id: generateId(), name: 'Thé Lipton 25 sachets', barcode: '6001234500012', categoryId: catBoissons.id, buyPrice: 600, sellPrice: 850, quantity: 15, alertThreshold: 5, ...s },
    { id: generateId(), name: 'Savon Palmolive', barcode: '6001234500013', categoryId: catHygiene.id, buyPrice: 300, sellPrice: 450, quantity: 40, alertThreshold: 10, ...s },
    { id: generateId(), name: 'Dentifrice Colgate 100ml', barcode: '6001234500014', categoryId: catHygiene.id, buyPrice: 500, sellPrice: 700, quantity: 25, alertThreshold: 8, ...s },
    { id: generateId(), name: 'Shampooing 250ml', barcode: '6001234500015', categoryId: catHygiene.id, buyPrice: 800, sellPrice: 1100, quantity: 18, alertThreshold: 5, ...s },
    { id: generateId(), name: 'Papier hygiénique x4', barcode: '6001234500016', categoryId: catHygiene.id, buyPrice: 400, sellPrice: 600, quantity: 30, alertThreshold: 8, ...s },
    { id: generateId(), name: 'Pile AA x2', barcode: '6001234500017', categoryId: catElectronique.id, buyPrice: 300, sellPrice: 500, quantity: 50, alertThreshold: 10, ...s },
    { id: generateId(), name: 'Ampoule LED 9W', barcode: '6001234500018', categoryId: catElectronique.id, buyPrice: 500, sellPrice: 800, quantity: 2, alertThreshold: 5, ...s },
    { id: generateId(), name: 'Chargeur téléphone USB', barcode: '6001234500019', categoryId: catElectronique.id, buyPrice: 1500, sellPrice: 2500, quantity: 12, alertThreshold: 3, ...s },
    { id: generateId(), name: 'Cahier 200 pages', barcode: '6001234500020', categoryId: catPapeterie.id, buyPrice: 250, sellPrice: 400, quantity: 70, alertThreshold: 15, ...s },
    { id: generateId(), name: 'Stylo Bic bleu x3', barcode: '6001234500021', categoryId: catPapeterie.id, buyPrice: 150, sellPrice: 250, quantity: 90, alertThreshold: 20, ...s },
    { id: generateId(), name: 'Javel 1L', barcode: '6001234500022', categoryId: catMenage.id, buyPrice: 350, sellPrice: 500, quantity: 28, alertThreshold: 8, ...s },
    { id: generateId(), name: 'Éponge vaisselle x3', barcode: '6001234500023', categoryId: catMenage.id, buyPrice: 150, sellPrice: 250, quantity: 40, alertThreshold: 10, ...s },
    { id: generateId(), name: 'Détergent OMO 500g', barcode: '6001234500024', categoryId: catMenage.id, buyPrice: 700, sellPrice: 1000, quantity: 22, alertThreshold: 5, ...s },
  ];
  await db.products.bulkAdd(products);

  // --- Clients ---
  const clients = [
    { id: generateId(), name: 'Amadou Diallo', phone: '76 12 34 56', creditBalance: 5200, ...s },
    { id: generateId(), name: 'Fatoumata Traoré', phone: '66 23 45 67', creditBalance: 0, ...s },
    { id: generateId(), name: 'Moussa Konaté', phone: '78 34 56 78', creditBalance: 12000, ...s },
    { id: generateId(), name: 'Awa Coulibaly', phone: '65 45 67 89', creditBalance: 3500, ...s },
    { id: generateId(), name: 'Ibrahim Sanogo', phone: '76 56 78 90', creditBalance: 0, ...s },
    { id: generateId(), name: 'Mariam Sidibé', phone: '66 67 89 01', creditBalance: 8000, ...s },
    { id: generateId(), name: 'Oumar Keita', phone: '78 78 90 12', creditBalance: 0, ...s },
    { id: generateId(), name: 'Kadiatou Bah', phone: '65 89 01 23', creditBalance: 1500, ...s },
  ];
  await db.customers.bulkAdd(clients);

  // --- Fournisseurs ---
  const suppliers = [
    { id: generateId(), name: 'Grossiste Bamako Central', phone: '20 22 33 44', address: 'Marché de Medine, Bamako', ...s },
    { id: generateId(), name: 'SODIBAF Distribution', phone: '20 33 44 55', address: 'Zone Industrielle, Bamako', ...s },
    { id: generateId(), name: 'Sahelienne Import', phone: '20 44 55 66', address: 'Badalabougou, Bamako', ...s },
  ];
  await db.suppliers.bulkAdd(suppliers);

  // --- Transactions de crédit pour les clients avec crédit ---
  const creditTransactions = [
    { id: generateId(), customerId: clients[0].id, amount: 5200, type: 'credit' as const, date: past(5), note: 'Achat à crédit riz + huile', ...s },
    { id: generateId(), customerId: clients[2].id, amount: 15000, type: 'credit' as const, date: past(12), note: 'Achat à crédit gros', ...s },
    { id: generateId(), customerId: clients[2].id, amount: 3000, type: 'payment' as const, date: past(7), note: 'Paiement partiel', ...s },
    { id: generateId(), customerId: clients[3].id, amount: 3500, type: 'credit' as const, date: past(3), note: 'Achat à crédit', ...s },
    { id: generateId(), customerId: clients[5].id, amount: 10000, type: 'credit' as const, date: past(15), note: 'Achat mensuel à crédit', ...s },
    { id: generateId(), customerId: clients[5].id, amount: 2000, type: 'payment' as const, date: past(8), note: 'Versement', ...s },
    { id: generateId(), customerId: clients[7].id, amount: 1500, type: 'credit' as const, date: past(2), note: 'Petit crédit', ...s },
  ];
  await db.creditTransactions.bulkAdd(creditTransactions);

  // --- Ventes (30 derniers jours) ---
  const salesData: { daysAgo: number; items: { pIdx: number; qty: number }[]; method: 'cash' | 'mobile' | 'credit'; clientIdx?: number }[] = [
    { daysAgo: 0, items: [{ pIdx: 0, qty: 2 }, { pIdx: 5, qty: 5 }], method: 'cash' },
    { daysAgo: 0, items: [{ pIdx: 8, qty: 3 }, { pIdx: 10, qty: 6 }], method: 'mobile' },
    { daysAgo: 0, items: [{ pIdx: 12, qty: 2 }, { pIdx: 15, qty: 1 }], method: 'cash' },
    { daysAgo: 1, items: [{ pIdx: 1, qty: 1 }, { pIdx: 2, qty: 3 }, { pIdx: 6, qty: 2 }], method: 'cash' },
    { daysAgo: 1, items: [{ pIdx: 9, qty: 2 }, { pIdx: 13, qty: 1 }], method: 'mobile' },
    { daysAgo: 2, items: [{ pIdx: 0, qty: 1 }, { pIdx: 3, qty: 1 }, { pIdx: 7, qty: 1 }], method: 'cash', clientIdx: 1 },
    { daysAgo: 2, items: [{ pIdx: 19, qty: 5 }, { pIdx: 20, qty: 3 }], method: 'cash' },
    { daysAgo: 3, items: [{ pIdx: 4, qty: 4 }, { pIdx: 5, qty: 10 }], method: 'credit', clientIdx: 3 },
    { daysAgo: 3, items: [{ pIdx: 16, qty: 2 }, { pIdx: 17, qty: 3 }], method: 'cash' },
    { daysAgo: 4, items: [{ pIdx: 21, qty: 2 }, { pIdx: 22, qty: 3 }, { pIdx: 23, qty: 1 }], method: 'cash' },
    { daysAgo: 5, items: [{ pIdx: 0, qty: 3 }, { pIdx: 1, qty: 2 }], method: 'cash', clientIdx: 4 },
    { daysAgo: 5, items: [{ pIdx: 8, qty: 4 }, { pIdx: 11, qty: 2 }], method: 'mobile' },
    { daysAgo: 6, items: [{ pIdx: 14, qty: 1 }, { pIdx: 12, qty: 3 }], method: 'cash' },
    { daysAgo: 7, items: [{ pIdx: 2, qty: 5 }, { pIdx: 6, qty: 3 }], method: 'cash', clientIdx: 6 },
    { daysAgo: 8, items: [{ pIdx: 18, qty: 1 }], method: 'cash' },
    { daysAgo: 9, items: [{ pIdx: 3, qty: 2 }, { pIdx: 7, qty: 2 }, { pIdx: 10, qty: 4 }], method: 'mobile' },
    { daysAgo: 10, items: [{ pIdx: 0, qty: 1 }, { pIdx: 5, qty: 8 }], method: 'cash' },
    { daysAgo: 12, items: [{ pIdx: 9, qty: 3 }, { pIdx: 11, qty: 1 }], method: 'credit', clientIdx: 5 },
    { daysAgo: 14, items: [{ pIdx: 19, qty: 10 }, { pIdx: 20, qty: 5 }], method: 'cash' },
    { daysAgo: 16, items: [{ pIdx: 4, qty: 6 }, { pIdx: 2, qty: 2 }], method: 'cash', clientIdx: 1 },
    { daysAgo: 18, items: [{ pIdx: 13, qty: 2 }, { pIdx: 15, qty: 2 }], method: 'mobile' },
    { daysAgo: 20, items: [{ pIdx: 16, qty: 4 }, { pIdx: 23, qty: 2 }], method: 'cash' },
    { daysAgo: 22, items: [{ pIdx: 1, qty: 3 }, { pIdx: 0, qty: 1 }], method: 'cash', clientIdx: 6 },
    { daysAgo: 25, items: [{ pIdx: 8, qty: 6 }, { pIdx: 10, qty: 8 }], method: 'cash' },
    { daysAgo: 28, items: [{ pIdx: 12, qty: 4 }, { pIdx: 14, qty: 1 }], method: 'mobile' },
  ];

  for (const sale of salesData) {
    const saleId = generateId();
    const date = past(sale.daysAgo);
    const saleItems = sale.items.map((item) => {
      const p = products[item.pIdx];
      return {
        id: generateId(),
        saleId,
        productId: p.id,
        productName: p.name,
        quantity: item.qty,
        unitPrice: p.sellPrice,
        total: item.qty * p.sellPrice,
        ...s,
      };
    });
    const total = saleItems.reduce((acc, i) => acc + i.total, 0);

    await db.sales.add({
      id: saleId,
      userId,
      customerId: sale.clientIdx !== undefined ? clients[sale.clientIdx].id : undefined,
      date,
      total,
      paymentMethod: sale.method,
      status: 'completed',
      ...s,
    });
    await db.saleItems.bulkAdd(saleItems);

    for (const item of saleItems) {
      await db.stockMovements.add({
        id: generateId(),
        productId: item.productId,
        productName: item.productName,
        type: 'sortie',
        quantity: item.quantity,
        date,
        reason: `Vente #${saleId.slice(0, 8)}`,
        ...s,
      });
    }
  }

  // --- Commandes fournisseurs ---
  const order1Id = generateId();
  const order1Date = past(10);
  await db.supplierOrders.add({
    id: order1Id, supplierId: suppliers[0].id, date: order1Date, total: 87500,
    status: 'recue', ...s,
  });
  await db.orderItems.bulkAdd([
    { id: generateId(), orderId: order1Id, productId: products[0].id, productName: products[0].name, quantity: 20, unitPrice: 2500, total: 50000, ...s },
    { id: generateId(), orderId: order1Id, productId: products[1].id, productName: products[1].name, quantity: 15, unitPrice: 1200, total: 18000, ...s },
    { id: generateId(), orderId: order1Id, productId: products[2].id, productName: products[2].name, quantity: 25, unitPrice: 600, total: 15000, ...s },
    { id: generateId(), orderId: order1Id, productId: products[6].id, productName: products[6].name, quantity: 15, unitPrice: 300, total: 4500, ...s },
  ]);

  const order2Id = generateId();
  await db.supplierOrders.add({
    id: order2Id, supplierId: suppliers[1].id, date: past(3), total: 27000,
    status: 'en_attente', ...s,
  });
  await db.orderItems.bulkAdd([
    { id: generateId(), orderId: order2Id, productId: products[8].id, productName: products[8].name, quantity: 48, unitPrice: 250, total: 12000, ...s },
    { id: generateId(), orderId: order2Id, productId: products[10].id, productName: products[10].name, quantity: 24, unitPrice: 200, total: 4800, ...s },
    { id: generateId(), orderId: order2Id, productId: products[9].id, productName: products[9].name, quantity: 20, unitPrice: 500, total: 10000, ...s },
    { id: generateId(), orderId: order2Id, productId: products[11].id, productName: products[11].name, quantity: 200, unitPrice: 1, total: 200, ...s },
  ]);

  // --- Mouvements de stock d'entrée (réception commande 1) ---
  for (const item of [
    { pIdx: 0, qty: 20 }, { pIdx: 1, qty: 15 }, { pIdx: 2, qty: 25 }, { pIdx: 6, qty: 15 },
  ]) {
    await db.stockMovements.add({
      id: generateId(),
      productId: products[item.pIdx].id,
      productName: products[item.pIdx].name,
      type: 'entree',
      quantity: item.qty,
      date: order1Date,
      reason: `Réception commande #${order1Id.slice(0, 8)}`,
      ...s,
    });
  }
}
