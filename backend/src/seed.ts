import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('⚠️  Ce seed basique est obsolète en mode SaaS.');
  console.log('   Utilisez "npx tsx prisma/seed-saas.ts" à la place.');
  console.log('   Aucune donnée n\'a été modifiée.');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
