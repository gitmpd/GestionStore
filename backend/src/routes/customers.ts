import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticate } from '../middleware/auth';

const router = Router();
const prisma = new PrismaClient();

router.use(authenticate);

router.get('/', async (_req, res) => {
  const customers = await prisma.customer.findMany({
    orderBy: { name: 'asc' },
    include: { creditTransactions: { orderBy: { date: 'desc' }, take: 10 } },
  });
  res.json(customers);
});

router.get('/:id', async (req, res) => {
  const customer = await prisma.customer.findUnique({
    where: { id: req.params.id },
    include: {
      creditTransactions: { orderBy: { date: 'desc' } },
      sales: { orderBy: { date: 'desc' }, take: 20 },
    },
  });
  if (!customer) {
    res.status(404).json({ error: 'Client non trouvé' });
    return;
  }
  res.json(customer);
});

router.post('/', async (req, res) => {
  const customer = await prisma.customer.create({ data: req.body });
  res.status(201).json(customer);
});

router.put('/:id', async (req, res) => {
  const customer = await prisma.customer.update({
    where: { id: req.params.id },
    data: req.body,
  });
  res.json(customer);
});

router.delete('/:id', async (req, res) => {
  await prisma.creditTransaction.deleteMany({ where: { customerId: req.params.id } });
  await prisma.customer.delete({ where: { id: req.params.id } });
  res.status(204).send();
});

router.post('/:id/credit', async (req, res) => {
  const { amount, type, note } = req.body;
  const customer = await prisma.customer.findUnique({ where: { id: req.params.id } });
  if (!customer) {
    res.status(404).json({ error: 'Client non trouvé' });
    return;
  }

  const newBalance =
    type === 'credit'
      ? customer.creditBalance + amount
      : Math.max(0, customer.creditBalance - amount);

  const [updatedCustomer, transaction] = await prisma.$transaction([
    prisma.customer.update({
      where: { id: req.params.id },
      data: { creditBalance: newBalance },
    }),
    prisma.creditTransaction.create({
      data: {
        customerId: req.params.id,
        amount,
        type,
        note,
        date: new Date(),
      },
    }),
  ]);

  res.json({ customer: updatedCustomer, transaction });
});

export { router as customersRouter };
