import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function cleanup() {
  console.log('=== Nettoyage des doublons ===\n');

  // 1. Deduplicate categories by name (keep first, merge references)
  const categories = await prisma.category.findMany({ orderBy: { createdAt: 'asc' } });
  const catByName = new Map<string, typeof categories>();
  for (const cat of categories) {
    const normalized = cat.name.trim().toLowerCase().replace(/s$/, '');
    const existing = catByName.get(normalized) || [];
    existing.push(cat);
    catByName.set(normalized, existing);
  }

  for (const [name, cats] of catByName) {
    if (cats.length <= 1) continue;
    const keep = cats[0];
    const duplicates = cats.slice(1);
    console.log(`Catégorie "${keep.name}": garde ${keep.id.slice(0, 8)}, supprime ${duplicates.map(d => d.id.slice(0, 8) + ' (' + d.name + ')').join(', ')}`);
    for (const dup of duplicates) {
      await prisma.product.updateMany({
        where: { categoryId: dup.id },
        data: { categoryId: keep.id },
      });
      await prisma.category.delete({ where: { id: dup.id } });
    }
  }

  // 2. Deduplicate products by name (keep first, merge references)
  const products = await prisma.product.findMany({ orderBy: { createdAt: 'asc' } });
  const prodByName = new Map<string, typeof products>();
  for (const prod of products) {
    const key = prod.name.trim().toLowerCase();
    const existing = prodByName.get(key) || [];
    existing.push(prod);
    prodByName.set(key, existing);
  }

  for (const [name, prods] of prodByName) {
    if (prods.length <= 1) continue;
    const keep = prods[0];
    const duplicates = prods.slice(1);
    const totalExtraStock = duplicates.reduce((sum, d) => sum + d.quantity, 0);
    console.log(`Produit "${keep.name}": garde ${keep.id.slice(0, 8)} (stock ${keep.quantity}), supprime ${duplicates.map(d => d.id.slice(0, 8) + ' (stock ' + d.quantity + ')').join(', ')}`);
    
    for (const dup of duplicates) {
      await prisma.saleItem.updateMany({
        where: { productId: dup.id },
        data: { productId: keep.id },
      });
      await prisma.stockMovement.updateMany({
        where: { productId: dup.id },
        data: { productId: keep.id },
      });
      await prisma.orderItem.updateMany({
        where: { productId: dup.id },
        data: { productId: keep.id },
      });
      await prisma.customerOrderItem.updateMany({
        where: { productId: dup.id },
        data: { productId: keep.id },
      });
      await prisma.product.delete({ where: { id: dup.id } });
    }
  }

  // 3. Deduplicate customers by name+phone
  const customers = await prisma.customer.findMany({ orderBy: { createdAt: 'asc' } });
  const custByKey = new Map<string, typeof customers>();
  for (const cust of customers) {
    const key = cust.name.trim().toLowerCase() + '|' + cust.phone.trim();
    const existing = custByKey.get(key) || [];
    existing.push(cust);
    custByKey.set(key, existing);
  }

  for (const [key, custs] of custByKey) {
    if (custs.length <= 1) continue;
    const keep = custs[0];
    const duplicates = custs.slice(1);
    console.log(`Client "${keep.name}": garde ${keep.id.slice(0, 8)}, supprime ${duplicates.map(d => d.id.slice(0, 8)).join(', ')}`);
    for (const dup of duplicates) {
      await prisma.sale.updateMany({
        where: { customerId: dup.id },
        data: { customerId: keep.id },
      });
      await prisma.creditTransaction.updateMany({
        where: { customerId: dup.id },
        data: { customerId: keep.id },
      });
      await prisma.customerOrder.updateMany({
        where: { customerId: dup.id },
        data: { customerId: keep.id },
      });
      const dupBalance = dup.creditBalance;
      if (dupBalance > 0) {
        await prisma.customer.update({
          where: { id: keep.id },
          data: { creditBalance: { increment: dupBalance } },
        });
      }
      await prisma.customer.delete({ where: { id: dup.id } });
    }
  }

  // 4. Deduplicate suppliers by name
  const suppliers = await prisma.supplier.findMany({ orderBy: { createdAt: 'asc' } });
  const suppByName = new Map<string, typeof suppliers>();
  for (const supp of suppliers) {
    const key = supp.name.trim().toLowerCase();
    const existing = suppByName.get(key) || [];
    existing.push(supp);
    suppByName.set(key, existing);
  }

  for (const [name, supps] of suppByName) {
    if (supps.length <= 1) continue;
    const keep = supps[0];
    const duplicates = supps.slice(1);
    console.log(`Fournisseur "${keep.name}": garde ${keep.id.slice(0, 8)}, supprime ${duplicates.map(d => d.id.slice(0, 8)).join(', ')}`);
    for (const dup of duplicates) {
      await prisma.supplierOrder.updateMany({
        where: { supplierId: dup.id },
        data: { supplierId: keep.id },
      });
      await prisma.supplier.delete({ where: { id: dup.id } });
    }
  }

  // Final counts
  console.log('\n=== État après nettoyage ===');
  console.log('Catégories:', await prisma.category.count());
  console.log('Produits:', await prisma.product.count());
  console.log('Clients:', await prisma.customer.count());
  console.log('Fournisseurs:', await prisma.supplier.count());
  console.log('Ventes:', await prisma.sale.count());
  console.log('Mouvements stock:', await prisma.stockMovement.count());

  console.log('\n=== Nettoyage terminé ===');
}

cleanup()
  .then(() => prisma.$disconnect())
  .catch((e) => { console.error(e); prisma.$disconnect(); });
