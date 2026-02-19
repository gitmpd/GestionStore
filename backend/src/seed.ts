import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  const adminPassword = await bcrypt.hash('admin123', 10);

  const admin = await prisma.user.upsert({
    where: { email: 'admin@store.com' },
    update: { mustChangePassword: true },
    create: {
      name: 'Gérant',
      email: 'admin@store.com',
      password: adminPassword,
      role: 'gerant',
      active: true,
      mustChangePassword: true,
    },
  });

  console.log('Gérant créé:', admin.email);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
