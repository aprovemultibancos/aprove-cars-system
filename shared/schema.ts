import { pgTable, text, serial, integer, boolean, numeric, date, timestamp, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// User schema for authentication
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  name: text("name").notNull(),
  email: text("email").notNull(),
  role: text("role", { enum: ["admin", "financial", "sales"] }).notNull(),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
  name: true,
  email: true,
  role: true,
});

// Vehicle schema
export const vehicles = pgTable("vehicles", {
  id: serial("id").primaryKey(),
  make: text("make").notNull(),
  model: text("model").notNull(),
  year: integer("year").notNull(),
  km: numeric("km").notNull(),
  purchaseCost: numeric("purchase_cost").notNull(),
  expenses: numeric("expenses").default("0"),
  sellingPrice: numeric("selling_price").notNull(),
  description: text("description"),
  status: text("status", { enum: ["available", "reserved", "sold"] }).notNull().default("available"),
  crlvDocPath: text("crlv_doc_path"),
  powerOfAttorneyPath: text("power_of_attorney_path"),
  notes: text("notes"),
  images: jsonb("images"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertVehicleSchema = createInsertSchema(vehicles).pick({
  make: true,
  model: true,
  year: true,
  km: true,
  purchaseCost: true,
  expenses: true,
  sellingPrice: true,
  description: true,
  status: true,
  crlvDocPath: true,
  powerOfAttorneyPath: true,
  notes: true,
  images: true,
});

// Sales schema
export const sales = pgTable("sales", {
  id: serial("id").primaryKey(),
  vehicleId: integer("vehicle_id").notNull(),
  customerId: integer("customer_id"),
  customerName: text("customer_name"),
  sellerId: integer("seller_id").notNull(),
  saleDate: date("sale_date").notNull(),
  salePrice: numeric("sale_price").notNull(),
  paymentMethod: text("payment_method").notNull(),
  commission: numeric("commission").notNull(),
  asaasPaymentId: text("asaas_payment_id"),
  notes: text("notes"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertSaleSchema = createInsertSchema(sales).pick({
  vehicleId: true,
  customerId: true,
  customerName: true,
  sellerId: true,
  saleDate: true,
  salePrice: true,
  paymentMethod: true,
  commission: true,
  asaasPaymentId: true,
  notes: true,
});

// Customers schema
export const customers = pgTable("customers", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email"),
  phone: text("phone").notNull(),
  document: text("document").notNull(),
  address: text("address"),
  city: text("city"),
  state: text("state"),
  zipCode: text("zip_code"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertCustomerSchema = createInsertSchema(customers).pick({
  name: true,
  email: true,
  phone: true,
  document: true,
  address: true,
  city: true,
  state: true,
  zipCode: true,
});

// Financing schema
export const financings = pgTable("financings", {
  id: serial("id").primaryKey(),
  customerId: integer("customer_id"), // Pode ser NULL conforme alteração no banco
  customerName: text("customer_name").notNull(),
  bank: text("bank").notNull(),
  assetValue: numeric("asset_value").notNull(),
  returnType: text("return_type", { enum: ["R0", "R1", "R2", "R3", "R4", "R6", "RF"] }).notNull().default("R0"),
  accessoriesPercentage: numeric("accessories_percentage").default("0"),
  feeAmount: numeric("fee_amount").default("0"),
  releasedAmount: numeric("released_amount").default("0"), // Pode ser NULL conforme alteração no banco
  expectedReturn: numeric("expected_return").default("0"), // Pode ser NULL conforme alteração no banco
  agentCommission: numeric("agent_commission").notNull(),
  sellerCommission: numeric("seller_commission").notNull(),
  status: text("status", { enum: ["analysis", "approved", "paid", "rejected"] }).notNull().default("analysis"),
  agentId: integer("agent_id").notNull(),
  agentName: text("agent_name"),
  notes: text("notes"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// Criando um schema personalizado para inserção de financiamentos que faz coerção de tipos
export const insertFinancingSchema = z.object({
  customerId: z.number().nullable().optional(),
  customerName: z.string(),
  bank: z.string(),
  assetValue: z.coerce.number(),
  returnType: z.enum(["R0", "R1", "R2", "R3", "R4", "R6", "RF"]),
  accessoriesPercentage: z.coerce.number().default(0),
  feeAmount: z.coerce.number().default(0),
  releasedAmount: z.coerce.number().default(0),
  expectedReturn: z.coerce.number().default(0),
  agentCommission: z.coerce.number(),
  sellerCommission: z.coerce.number(),
  status: z.enum(["analysis", "approved", "paid", "rejected"]).default("analysis"),
  agentId: z.coerce.number(),
  agentName: z.string().optional(),
  notes: z.string().optional(),
});

// Expenses schema
export const expenses = pgTable("expenses", {
  id: serial("id").primaryKey(),
  description: text("description").notNull(),
  amount: numeric("amount").notNull(),
  date: date("date").notNull(),
  category: text("category").notNull(),
  type: text("type", { enum: ["fixed", "variable"] }).notNull(),
  payeeId: integer("payee_id"),
  notes: text("notes"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// Schema de inserção de despesas com coerção de tipos
export const insertExpenseSchema = z.object({
  description: z.string(),
  amount: z.coerce.number(),
  date: z.coerce.date(),
  category: z.string(),
  type: z.enum(["fixed", "variable"]),
  payeeId: z.coerce.number().nullable().optional(),
  notes: z.string().optional()
});

// Personnel schema
export const personnel = pgTable("personnel", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  type: text("type", { enum: ["employee", "agent", "dealer"] }).notNull(),
  document: text("document").notNull(),
  email: text("email"),
  phone: text("phone"),
  role: text("role").notNull(),
  isActive: boolean("is_active").notNull().default(true),
  commissionRate: numeric("commission_rate"),
  bankInfo: text("bank_info"),
  notes: text("notes"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// Schema de inserção de pessoal com coerção de tipos
export const insertPersonnelSchema = z.object({
  name: z.string(),
  type: z.enum(["employee", "agent", "dealer"]),
  document: z.string(),
  email: z.string().optional().nullable(),
  phone: z.string().optional().nullable(),
  role: z.string(),
  isActive: z.coerce.boolean().default(true),
  commissionRate: z.coerce.number().optional().nullable(),
  bankInfo: z.string().optional().nullable(),
  notes: z.string().optional().nullable()
});

// Type exports
export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

export type InsertVehicle = z.infer<typeof insertVehicleSchema>;
export type Vehicle = typeof vehicles.$inferSelect;

export type InsertSale = z.infer<typeof insertSaleSchema>;
export type Sale = typeof sales.$inferSelect;

export type InsertCustomer = z.infer<typeof insertCustomerSchema>;
export type Customer = typeof customers.$inferSelect;

export type InsertFinancing = z.infer<typeof insertFinancingSchema>;
export type Financing = typeof financings.$inferSelect;

export type InsertExpense = z.infer<typeof insertExpenseSchema>;
export type Expense = typeof expenses.$inferSelect;

export type InsertPersonnel = z.infer<typeof insertPersonnelSchema>;
export type Personnel = typeof personnel.$inferSelect;

// Payments schema
export const payments = pgTable("payments", {
  id: text("id").primaryKey(), // Pode ser local-123456 ou id do Asaas
  customer: text("customer").notNull(), // ID do cliente no Asaas ou "local"
  customerName: text("customer_name").notNull(),
  customerDocumentNumber: text("customer_document").notNull().default("00000000000"),
  value: numeric("value").notNull(),
  netValue: numeric("net_value").notNull(),
  description: text("description").notNull(),
  billingType: text("billing_type").notNull(),
  status: text("status").notNull(),
  dueDate: text("due_date").notNull(),
  bankSlipUrl: text("bank_slip_url"),
  pixQrCodeUrl: text("pix_qr_code_url"),
  invoiceUrl: text("invoice_url"),
  relatedSaleId: text("related_sale_id"),
  notes: text("notes"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  paymentDate: timestamp("payment_date"),
  confirmedDate: timestamp("confirmed_date"),
  externalId: text("external_id"), // ID do pagamento no Asaas
  isExternal: boolean("is_external").default(false), // Indica se foi criado no Asaas
});

export type Payment = typeof payments.$inferSelect;
export type InsertPayment = typeof payments.$inferInsert;

export const insertPaymentSchema = z.object({
  id: z.string(),
  customer: z.string(),
  customerName: z.string(),
  customerDocumentNumber: z.string().default("00000000000"),
  value: z.coerce.number(),
  netValue: z.coerce.number(),
  description: z.string(),
  billingType: z.string(),
  status: z.string(),
  dueDate: z.string(),
  bankSlipUrl: z.string().optional(),
  pixQrCodeUrl: z.string().optional(),
  invoiceUrl: z.string().optional(),
  relatedSaleId: z.string().optional(),
  notes: z.string().optional(),
  createdAt: z.string(),
  paymentDate: z.string().optional(),
  confirmedDate: z.string().optional(),
  externalId: z.string().optional(),
  isExternal: z.boolean().default(false),
});
