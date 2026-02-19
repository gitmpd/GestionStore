import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

interface PlanTier {
  name: string;
  maxProducts: number;
  maxUsers: number;
  maxSales: number;
  features: string[];
  monthlyPrice: number;
  sortOrder: number;
}

const TIERS: PlanTier[] = [
  {
    name: 'Starter',
    maxProducts: 100,
    maxUsers: 3,
    maxSales: 0,
    features: ['Ventes & stock', 'Catégories', 'Commandes fournisseurs', 'Synchronisation', 'Support email'],
    monthlyPrice: 5000,
    sortOrder: 1,
  },
  {
    name: 'Business',
    maxProducts: 500,
    maxUsers: 10,
    maxSales: 0,
    features: [
      'Ventes & stock', 'Catégories', 'Commandes fournisseurs',
      'Commandes clients', 'Export CSV', "Journal d'audit",
      'Synchronisation', 'Support prioritaire',
    ],
    monthlyPrice: 15000,
    sortOrder: 2,
  },
  {
    name: 'Premium',
    maxProducts: 0,
    maxUsers: 0,
    maxSales: 0,
    features: [
      'Toutes les fonctionnalités',
      'Produits illimités', 'Utilisateurs illimités',
      'Commandes clients', 'Export CSV', "Journal d'audit",
      'Sauvegarde & restauration', 'Rapports avancés',
      'Synchronisation illimitée', 'Support dédié',
    ],
    monthlyPrice: 30000,
    sortOrder: 3,
  },
];

const DURATIONS = [
  { months: 1, days: 30, discount: 0 },
  { months: 3, days: 90, discount: 0.10 },
  { months: 6, days: 180, discount: 0.20 },
  { months: 12, days: 365, discount: 0.30 },
];

async function main() {
  console.log('=== GestionStore SaaS Seed ===\n');

  // 1. Create trial plan
  console.log('1. Création des plans...');

  const essai = await prisma.plan.upsert({
    where: { name_durationDays: { name: 'Essai', durationDays: 7 } },
    update: {},
    create: {
      name: 'Essai',
      price: 0,
      durationDays: 7,
      maxProducts: 30,
      maxUsers: 2,
      maxSales: 0,
      features: ['Ventes & stock', 'Catégories', '7 jours gratuits'],
      sortOrder: 0,
    },
  });
  console.log(`   Plan Essai : ${essai.id}`);

  // 2. Create tier × duration plans
  for (const tier of TIERS) {
    for (const dur of DURATIONS) {
      const totalMonths = dur.months;
      const basePrice = tier.monthlyPrice * totalMonths;
      const price = Math.round(basePrice * (1 - dur.discount));

      const plan = await prisma.plan.upsert({
        where: { name_durationDays: { name: tier.name, durationDays: dur.days } },
        update: {
          price,
          maxProducts: tier.maxProducts,
          maxUsers: tier.maxUsers,
          maxSales: tier.maxSales,
          features: tier.features,
          sortOrder: tier.sortOrder,
          active: true,
        },
        create: {
          name: tier.name,
          price,
          durationDays: dur.days,
          maxProducts: tier.maxProducts,
          maxUsers: tier.maxUsers,
          maxSales: tier.maxSales,
          features: tier.features,
          sortOrder: tier.sortOrder,
        },
      });

      const label = dur.months >= 12 ? '1 an' : `${dur.months} mois`;
      const discountLabel = dur.discount > 0 ? ` (-${dur.discount * 100}%)` : '';
      console.log(`   ${tier.name} ${label}: ${price} FCFA${discountLabel} [${plan.id}]`);
    }
  }

  // Clean up old plans
  await prisma.plan.deleteMany({ where: { name: 'Standard' } });

  // 3. Migrate existing data to a default tenant
  console.log('\n2. Migration des données existantes...');

  const existingUsers = await prisma.user.findMany({ where: { tenantId: null } });

  if (existingUsers.length > 0) {
    let defaultTenant = await prisma.tenant.findFirst({ where: { slug: 'boutique-default' } });

    if (!defaultTenant) {
      const firstGerant = existingUsers.find((u) => u.role === 'gerant') || existingUsers[0];
      defaultTenant = await prisma.tenant.create({
        data: {
          name: 'Boutique par défaut',
          slug: 'boutique-default',
          ownerUserId: firstGerant.id,
          status: 'active',
        },
      });
      console.log(`   Tenant par défaut créé : ${defaultTenant.id}`);
    } else {
      console.log(`   Tenant par défaut existant : ${defaultTenant.id}`);
    }

    const tid = defaultTenant.id;

    const tables = [
      'user', 'category', 'product', 'priceHistory', 'customer', 'supplier',
      'sale', 'saleItem', 'supplierOrder', 'orderItem', 'stockMovement',
      'creditTransaction', 'auditLog', 'expense', 'customerOrder', 'customerOrderItem',
    ] as const;

    for (const table of tables) {
      const count = await (prisma[table] as any).updateMany({
        where: { tenantId: null },
        data: { tenantId: tid },
      });
      if (count.count > 0) {
        console.log(`   ${table}: ${count.count} enregistrement(s) migrés`);
      }
    }

    const existingSub = await prisma.subscription.findFirst({
      where: { tenantId: tid, status: 'active' },
    });
    if (!existingSub) {
      const premiumYearly = await prisma.plan.findFirst({
        where: { name: 'Premium', durationDays: 365, active: true },
      });
      if (premiumYearly) {
        const endDate = new Date();
        endDate.setFullYear(endDate.getFullYear() + 1);
        await prisma.subscription.create({
          data: {
            tenantId: tid,
            planId: premiumYearly.id,
            status: 'active',
            startDate: new Date(),
            endDate,
          },
        });
        console.log('   Abonnement Premium (1 an) créé pour le tenant par défaut');
      }
    }
  } else {
    console.log('   Aucune donnée existante à migrer.');
  }

  // 4. Create super-admin user
  console.log('\n3. Vérification du super-admin...');

  const superAdminEmail = process.env.SUPER_ADMIN_EMAIL || 'superadmin@gestionstore.com';
  const superAdminPassword = process.env.SUPER_ADMIN_PASSWORD || 'SuperAdmin2026!';

  let superAdmin = await prisma.user.findUnique({ where: { email: superAdminEmail } });
  if (!superAdmin) {
    const hashedPassword = await bcrypt.hash(superAdminPassword, 10);
    superAdmin = await prisma.user.create({
      data: {
        name: 'Super Admin',
        email: superAdminEmail,
        password: hashedPassword,
        role: 'super_admin',
        tenantId: null,
        mustChangePassword: true,
        active: true,
      },
    });
    console.log(`   Super-admin créé : ${superAdminEmail} / ${superAdminPassword}`);
  } else {
    await prisma.user.update({
      where: { id: superAdmin.id },
      data: { role: 'super_admin', tenantId: null },
    });
    console.log(`   Super-admin vérifié/mis à jour : ${superAdminEmail}`);
  }

  console.log('\n=== Seed terminé avec succès ===');
}

main()
  .catch((e) => {
    console.error('Seed error:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
