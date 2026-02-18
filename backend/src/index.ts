import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import { authRouter } from './routes/auth';
import { categoriesRouter } from './routes/categories';
import { productsRouter } from './routes/products';
import { customersRouter } from './routes/customers';
import { suppliersRouter } from './routes/suppliers';
import { salesRouter } from './routes/sales';
import { syncRouter } from './routes/sync';
import { reportsRouter } from './routes/reports';
import { auditRouter } from './routes/audit';
import { errorHandler } from './middleware/errorHandler';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

app.use(helmet());
app.use(cors());
app.use(express.json({ limit: '10mb' }));

app.use('/api/auth', authRouter);
app.use('/api/categories', categoriesRouter);
app.use('/api/products', productsRouter);
app.use('/api/customers', customersRouter);
app.use('/api/suppliers', suppliersRouter);
app.use('/api/sales', salesRouter);
app.use('/api/sync', syncRouter);
app.use('/api/reports', reportsRouter);
app.use('/api/audit', auditRouter);

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.use(errorHandler);

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

export default app;
