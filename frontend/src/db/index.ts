import Dexie, { type EntityTable } from 'dexie';
import type {
  User,
  Category,
  Product,
  Customer,
  Supplier,
  Sale,
  SaleItem,
  SupplierOrder,
  OrderItem,
  StockMovement,
  CreditTransaction,
  AuditLog,
  Expense,
} from '@/types';

class StoreDB extends Dexie {
  users!: EntityTable<User, 'id'>;
  auditLogs!: EntityTable<AuditLog, 'id'>;
  expenses!: EntityTable<Expense, 'id'>;
  categories!: EntityTable<Category, 'id'>;
  products!: EntityTable<Product, 'id'>;
  customers!: EntityTable<Customer, 'id'>;
  suppliers!: EntityTable<Supplier, 'id'>;
  sales!: EntityTable<Sale, 'id'>;
  saleItems!: EntityTable<SaleItem, 'id'>;
  supplierOrders!: EntityTable<SupplierOrder, 'id'>;
  orderItems!: EntityTable<OrderItem, 'id'>;
  stockMovements!: EntityTable<StockMovement, 'id'>;
  creditTransactions!: EntityTable<CreditTransaction, 'id'>;

  constructor() {
    super('GestionStoreDB');

    this.version(1).stores({
      products: 'id, name, barcode, category, syncStatus',
      customers: 'id, name, phone, syncStatus',
      suppliers: 'id, name, syncStatus',
      sales: 'id, userId, customerId, date, status, syncStatus',
      saleItems: 'id, saleId, productId, syncStatus',
      supplierOrders: 'id, supplierId, date, status, syncStatus',
      orderItems: 'id, orderId, productId, syncStatus',
      stockMovements: 'id, productId, type, date, syncStatus',
      creditTransactions: 'id, customerId, type, date, syncStatus',
    });

    this.version(2).stores({
      categories: 'id, name, syncStatus',
      products: 'id, name, barcode, categoryId, syncStatus',
    });

    this.version(3).stores({
      users: 'id, email, role, active, syncStatus',
    });

    this.version(4).stores({
      users: 'id, name, email, role, active, syncStatus',
    });

    this.version(5).stores({
      auditLogs: 'id, userId, action, entity, date, syncStatus',
    });

    this.version(6).stores({
      expenses: 'id, category, date, recurring, syncStatus',
    });
  }
}

export const db = new StoreDB();

db.open().catch(async (err) => {
  console.error('DB open failed, deleting and retrying:', err);
  await Dexie.delete('GestionStoreDB');
  window.location.reload();
});
