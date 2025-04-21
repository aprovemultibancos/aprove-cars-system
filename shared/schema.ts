import { pgTable, text, serial, integer, boolean, numeric, date, timestamp, jsonb, varchar, foreignKey, index } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { relations } from "drizzle-orm";

// Companies (multitenancy) schema - deve ser definido primeiro para evitar referências circulares
export const companies = pgTable("companies", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  tradingName: text("trading_name").notNull(),
  document: text("document").notNull().unique(), // CNPJ
  email: text("email").notNull(),
  phone: text("phone").notNull(),
  address: text("address"),
  city: text("city"),
  state: text("state"),
  zipCode: text("zip_code"),
  logo: text("logo"),
  primaryColor: text("primary_color").default("#10b981"), // default verde
  isActive: boolean("is_active").notNull().default(true),
  isMaster: boolean("is_master").notNull().default(false), // Flag para identificar a conta mestre
  masterCompanyId: integer("master_company_id").references(() => companies.id), // Auto-referência para a empresa mãe
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

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
  companyId: integer("company_id").references(() => companies.id),
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
  companyId: integer("company_id").notNull().references(() => companies.id),
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
  companyId: integer("company_id").notNull().references(() => companies.id),
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
  companyId: integer("company_id").notNull().references(() => companies.id),
  name: text("name").notNull(),
  email: text("email"),
  phone: text("phone").notNull(),
  document: text("document").notNull(),
  address: text("address"),
  city: text("city"),
  state: text("state"),
  zipCode: text("zip_code"),
  asaasId: text("asaas_id"), // ID do cliente no Asaas
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
  companyId: integer("company_id").notNull().references(() => companies.id),
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
  companyId: integer("company_id").notNull().references(() => companies.id),
  description: text("description").notNull(),
  amount: numeric("amount").notNull(),
  date: date("date").notNull(),
  category: text("category").notNull(),
  type: text("type", { enum: ["fixed", "variable"] }).notNull(),
  payeeId: integer("payee_id"),
  notes: text("notes"),
  status: text("status", { enum: ["pending", "paid"] }).default("pending"),
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
  notes: z.string().optional(),
  status: z.enum(["pending", "paid"]).optional()
});

// Schema para atualizar status
export const updateExpenseStatusSchema = z.object({
  status: z.enum(["pending", "paid"])
});

// Personnel schema
export const personnel = pgTable("personnel", {
  id: serial("id").primaryKey(),
  companyId: integer("company_id").notNull().references(() => companies.id),
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

// REMOVIDO - Já foi definido no início do arquivo para evitar referências circulares

export const insertCompanySchema = createInsertSchema(companies)
  .omit({ 
    id: true, 
    createdAt: true, 
    isMaster: true, 
    isActive: true, 
    masterCompanyId: true
  });

// Company API Integrations schema
export const companyIntegrations = pgTable("company_integrations", {
  id: serial("id").primaryKey(),
  companyId: integer("company_id").notNull().references(() => companies.id),
  integrationType: text("integration_type", { enum: ["asaas", "whatsapp"] }).notNull(),
  apiKey: text("api_key").notNull(),
  apiSecret: text("api_secret"), // Para APIs que exigem secret key
  walletId: text("wallet_id"), // ID da carteira/conta no serviço externo
  isSandbox: boolean("is_sandbox").notNull().default(false),
  additionalConfig: jsonb("additional_config"), // Para configurações adicionais específicas de cada integração
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertCompanyIntegrationSchema = createInsertSchema(companyIntegrations)
  .omit({ 
    id: true, 
    createdAt: true, 
    updatedAt: true 
  });

// Split configuration schema
export const splitConfigs = pgTable("split_configs", {
  id: serial("id").primaryKey(),
  companyId: integer("company_id").notNull().references(() => companies.id),
  masterPercentage: numeric("master_percentage").notNull().default("1.0"), // Porcentagem que vai para a conta master (default 1%)
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertSplitConfigSchema = createInsertSchema(splitConfigs)
  .omit({ 
    id: true, 
    createdAt: true, 
    updatedAt: true 
  });

// Adicionar coluna companyId às entidades principais para isolar os dados por empresa
export const userCompanies = pgTable("user_companies", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  companyId: integer("company_id").notNull().references(() => companies.id),
  isAdmin: boolean("is_admin").notNull().default(false), // Se usuário é admin desta empresa
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// Relações
export const companiesRelations = relations(companies, ({ many, one }) => ({
  users: many(userCompanies),
  integrations: many(companyIntegrations),
  splitConfigs: many(splitConfigs),
  childCompanies: many(companies, { relationName: "parentChild" }),
  parentCompany: one(companies, {
    fields: [companies.masterCompanyId],
    references: [companies.id],
    relationName: "parentChild"
  }),
}));

export const usersRelations = relations(users, ({ many }) => ({
  companies: many(userCompanies)
}));

export const userCompaniesRelations = relations(userCompanies, ({ one }) => ({
  user: one(users, {
    fields: [userCompanies.userId],
    references: [users.id]
  }),
  company: one(companies, {
    fields: [userCompanies.companyId],
    references: [companies.id]
  })
}));

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

export type InsertCompany = z.infer<typeof insertCompanySchema>;
export type Company = typeof companies.$inferSelect;

export type InsertCompanyIntegration = z.infer<typeof insertCompanyIntegrationSchema>;
export type CompanyIntegration = typeof companyIntegrations.$inferSelect;

export type InsertSplitConfig = z.infer<typeof insertSplitConfigSchema>;
export type SplitConfig = typeof splitConfigs.$inferSelect;

// Payments schema removido conforme solicitado

// WhatsApp Integration schemas
export const whatsappConnections = pgTable("whatsapp_connections", {
  id: serial("id").primaryKey(),
  companyId: integer("company_id").notNull().references(() => companies.id),
  name: text("name").notNull(),
  phoneNumber: text("phone_number").notNull().unique(),
  status: text("status", { enum: ["connected", "disconnected", "connecting"] }).notNull().default("disconnected"),
  qrCode: text("qr_code"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  lastConnection: timestamp("last_connection"),
  dailyLimit: integer("daily_limit").default(50),
});

export const whatsappContacts = pgTable("whatsapp_contacts", {
  id: serial("id").primaryKey(),
  companyId: integer("company_id").notNull().references(() => companies.id),
  name: text("name").notNull(),
  phoneNumber: text("phone_number").notNull(),
  customerId: integer("customer_id").references(() => customers.id),
  tags: text("tags").array(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  lastMessageSent: timestamp("last_message_sent"),
  isBlocked: boolean("is_blocked").default(false),
});

export const whatsappGroups = pgTable("whatsapp_groups", {
  id: serial("id").primaryKey(),
  companyId: integer("company_id").notNull().references(() => companies.id),
  name: text("name").notNull(),
  description: text("description"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  totalContacts: integer("total_contacts").default(0),
});

export const whatsappGroupContacts = pgTable("whatsapp_group_contacts", {
  id: serial("id").primaryKey(),
  groupId: integer("group_id").notNull().references(() => whatsappGroups.id),
  contactId: integer("contact_id").notNull().references(() => whatsappContacts.id),
});

export const whatsappTemplates = pgTable("whatsapp_templates", {
  id: serial("id").primaryKey(),
  companyId: integer("company_id").notNull().references(() => companies.id),
  name: text("name").notNull(),
  content: text("content").notNull(),
  hasMedia: boolean("has_media").default(false),
  mediaType: text("media_type", { enum: ["image", "video", "document", "audio"] }),
  mediaUrl: text("media_url"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const whatsappCampaigns = pgTable("whatsapp_campaigns", {
  id: serial("id").primaryKey(),
  companyId: integer("company_id").notNull().references(() => companies.id),
  name: text("name").notNull(),
  description: text("description"),
  templateId: integer("template_id").notNull().references(() => whatsappTemplates.id),
  connectionId: integer("connection_id").notNull().references(() => whatsappConnections.id),
  status: text("status", { enum: ["draft", "scheduled", "in_progress", "completed", "canceled"] }).notNull().default("draft"),
  scheduledFor: timestamp("scheduled_for"),
  completedAt: timestamp("completed_at"),
  totalContacts: integer("total_contacts").default(0),
  sentMessages: integer("sent_messages").default(0),
  deliveredMessages: integer("delivered_messages").default(0),
  readMessages: integer("read_messages").default(0),
  failedMessages: integer("failed_messages").default(0),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
  minInterval: integer("min_interval").notNull().default(1), // Intervalo mínimo entre envios (segundos)
  maxInterval: integer("max_interval").notNull().default(3), // Intervalo máximo entre envios (segundos)
  startTime: text("start_time").notNull().default("08:00"),
  endTime: text("end_time").notNull().default("18:00"),
});

export const whatsappCampaignTargets = pgTable("whatsapp_campaign_targets", {
  id: serial("id").primaryKey(),
  campaignId: integer("campaign_id").notNull().references(() => whatsappCampaigns.id),
  groupId: integer("group_id").references(() => whatsappGroups.id),
  contactId: integer("contact_id").references(() => whatsappContacts.id),
  status: text("status", { enum: ["pending", "sent", "delivered", "read", "failed"] }).notNull().default("pending"),
  sentAt: timestamp("sent_at"),
  deliveredAt: timestamp("delivered_at"),
  readAt: timestamp("read_at"),
  failedAt: timestamp("failed_at"),
  failureReason: text("failure_reason"),
});

// Schema de inserção para WhatsApp
export const insertWhatsappConnectionSchema = createInsertSchema(whatsappConnections).pick({
  name: true,
  phoneNumber: true,
  status: true,
  qrCode: true,
  dailyLimit: true,
});

export const insertWhatsappContactSchema = createInsertSchema(whatsappContacts).pick({
  name: true,
  phoneNumber: true,
  customerId: true,
  tags: true,
  isBlocked: true,
});

export const insertWhatsappGroupSchema = createInsertSchema(whatsappGroups).pick({
  name: true,
  description: true,
});

export const insertWhatsappTemplateSchema = createInsertSchema(whatsappTemplates).pick({
  name: true,
  content: true,
  hasMedia: true,
  mediaType: true,
  mediaUrl: true,
});

export const insertWhatsappCampaignSchema = createInsertSchema(whatsappCampaigns).pick({
  name: true,
  description: true,
  templateId: true,
  connectionId: true,
  status: true,
  scheduledFor: true,
  minInterval: true,
  maxInterval: true,
  startTime: true,
  endTime: true,
});

// Tipos para WhatsApp
export type InsertWhatsappConnection = z.infer<typeof insertWhatsappConnectionSchema>;
export type WhatsappConnection = typeof whatsappConnections.$inferSelect;

export type InsertWhatsappContact = z.infer<typeof insertWhatsappContactSchema>;
export type WhatsappContact = typeof whatsappContacts.$inferSelect;

export type InsertWhatsappGroup = z.infer<typeof insertWhatsappGroupSchema>;
export type WhatsappGroup = typeof whatsappGroups.$inferSelect;

export type InsertWhatsappTemplate = z.infer<typeof insertWhatsappTemplateSchema>;
export type WhatsappTemplate = typeof whatsappTemplates.$inferSelect;

export type InsertWhatsappCampaign = z.infer<typeof insertWhatsappCampaignSchema>;
export type WhatsappCampaign = typeof whatsappCampaigns.$inferSelect;
