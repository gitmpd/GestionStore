import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  const adminPassword = await bcrypt.hash('admin123', 10);
  const vendeurPassword = await bcrypt.hash('vendeur123', 10);

  const admin = await prisma.user.upsert({
    where: { email: 'admin@store.com' },
    update: {},
    create: {
      name: 'Administrateur',
      email: 'admin@store.com',
      password: adminPassword,
      role: 'gerant',
      active: true,
    },
  });

  const vendeur = await prisma.user.upsert({
    where: { email: 'vendeur@store.com' },
    update: {},
    create: {
      name: 'Vendeur',
      email: 'vendeur@store.com',
      password: vendeurPassword,
      role: 'vendeur',
      active: true,
    },
  });

  console.log('Users created:', admin.email, vendeur.email);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
