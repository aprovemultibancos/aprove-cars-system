import { users, type User, type InsertUser, vehicles, Vehicle, InsertVehicle, customers, Customer, InsertCustomer, sales, Sale, InsertSale, financings, Financing, InsertFinancing, expenses, Expense, InsertExpense, personnel, Personnel, InsertPersonnel, payments, Payment, InsertPayment } from "@shared/schema";
import session from "express-session";
import createMemoryStore from "memorystore";
import connectPg from "connect-pg-simple";
import { db } from "./db";
import { eq, and } from "drizzle-orm";

const MemoryStore = createMemoryStore(session);
const PostgresSessionStore = connectPg(session);

// modify the interface with any CRUD methods
// you might need

export interface IStorage {
  // User methods
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: number, userData: Partial<User>): Promise<User | undefined>;
  deleteUser(id: number): Promise<boolean>;
  
  // Vehicle methods
  getVehicles(): Promise<Vehicle[]>;
  getVehicle(id: number): Promise<Vehicle | undefined>;
  createVehicle(vehicle: InsertVehicle): Promise<Vehicle>;
  updateVehicle(id: number, vehicle: Partial<Vehicle>): Promise<Vehicle | undefined>;
  deleteVehicle(id: number): Promise<boolean>;
  getAvailableVehicles(): Promise<Vehicle[]>;
  
  // Customer methods
  getCustomers(): Promise<Customer[]>;
  getCustomer(id: number): Promise<Customer | undefined>;
  createCustomer(customer: InsertCustomer): Promise<Customer>;
  updateCustomer(id: number, customer: Partial<Customer>): Promise<Customer | undefined>;
  deleteCustomer(id: number): Promise<boolean>;
  
  // Sale methods
  getSales(): Promise<Sale[]>;
  getSale(id: number): Promise<Sale | undefined>;
  createSale(sale: InsertSale): Promise<Sale>;
  updateSale(id: number, sale: Partial<Sale>): Promise<Sale | undefined>;
  deleteSale(id: number): Promise<boolean>;
  
  // Financing methods
  getFinancings(): Promise<Financing[]>;
  getFinancing(id: number): Promise<Financing | undefined>;
  createFinancing(financing: InsertFinancing): Promise<Financing>;
  updateFinancing(id: number, financing: Partial<Financing>): Promise<Financing | undefined>;
  deleteFinancing(id: number): Promise<boolean>;
  
  // Expense methods
  getExpenses(): Promise<Expense[]>;
  getExpense(id: number): Promise<Expense | undefined>;
  createExpense(expense: InsertExpense): Promise<Expense>;
  updateExpense(id: number, expense: Partial<Expense>): Promise<Expense | undefined>;
  deleteExpense(id: number): Promise<boolean>;
  
  // Personnel methods
  getPersonnel(): Promise<Personnel[]>;
  getPersonnelByType(type: string): Promise<Personnel[]>;
  getPersonnelById(id: number): Promise<Personnel | undefined>;
  createPersonnel(personnel: InsertPersonnel): Promise<Personnel>;
  updatePersonnel(id: number, personnel: Partial<Personnel>): Promise<Personnel | undefined>;
  deletePersonnel(id: number): Promise<boolean>;
  
  // Payment methods
  getPayments(): Promise<Payment[]>;
  getPayment(id: string): Promise<Payment | undefined>;
  createPayment(payment: InsertPayment): Promise<Payment>;
  updatePayment(id: string, payment: Partial<Payment>): Promise<Payment | undefined>;
  deletePayment(id: string): Promise<boolean>;
  
  // Session store
  sessionStore: session.Store;
}

export class MemStorage implements IStorage {
  private users: Map<number, User>;
  private vehicles: Map<number, Vehicle>;
  private customers: Map<number, Customer>;
  private sales: Map<number, Sale>;
  private financings: Map<number, Financing>;
  private expenses: Map<number, Expense>;
  private personnel: Map<number, Personnel>;
  
  sessionStore: session.Store;
  currentId: number;

  constructor() {
    this.users = new Map();
    this.vehicles = new Map();
    this.customers = new Map();
    this.sales = new Map();
    this.financings = new Map();
    this.expenses = new Map();
    this.personnel = new Map();
    this.currentId = 1;
    
    this.sessionStore = new MemoryStore({
      checkPeriod: 86400000,
    });
  }

  // User methods
  async getUser(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username,
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = this.currentId++;
    const user: User = { 
      ...insertUser, 
      id, 
      isActive: true, 
      createdAt: new Date() 
    };
    this.users.set(id, user);
    return user;
  }
  
  async updateUser(id: number, userData: Partial<User>): Promise<User | undefined> {
    const user = await this.getUser(id);
    if (!user) return undefined;

    Object.assign(user, userData);
    this.users.set(id, user);
    return user;
  }
  
  async deleteUser(id: number): Promise<boolean> {
    const user = await this.getUser(id);
    if (!user) return false;
    
    // Não permitir exclusão de administradores ativos
    if (user.role === "admin" && user.isActive) {
      const adminCount = [...this.users.values()].filter(u => u.role === "admin" && u.isActive).length;
      // Não permitir exclusão se for o último administrador ativo
      if (adminCount <= 1) {
        return false;
      }
    }
    
    return this.users.delete(id);
  }
  
  // Vehicle methods
  async getVehicles(): Promise<Vehicle[]> {
    return Array.from(this.vehicles.values());
  }
  
  async getVehicle(id: number): Promise<Vehicle | undefined> {
    return this.vehicles.get(id);
  }
  
  async createVehicle(vehicle: InsertVehicle): Promise<Vehicle> {
    const id = this.currentId++;
    const newVehicle: Vehicle = {
      ...vehicle,
      id,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    this.vehicles.set(id, newVehicle);
    return newVehicle;
  }
  
  async updateVehicle(id: number, vehicle: Partial<Vehicle>): Promise<Vehicle | undefined> {
    const existingVehicle = this.vehicles.get(id);
    if (!existingVehicle) return undefined;
    
    const updatedVehicle = {
      ...existingVehicle,
      ...vehicle,
      updatedAt: new Date()
    };
    
    this.vehicles.set(id, updatedVehicle);
    return updatedVehicle;
  }
  
  async deleteVehicle(id: number): Promise<boolean> {
    return this.vehicles.delete(id);
  }
  
  async getAvailableVehicles(): Promise<Vehicle[]> {
    return Array.from(this.vehicles.values()).filter(
      (vehicle) => vehicle.status === "available"
    );
  }
  
  // Customer methods
  async getCustomers(): Promise<Customer[]> {
    return Array.from(this.customers.values());
  }
  
  async getCustomer(id: number): Promise<Customer | undefined> {
    return this.customers.get(id);
  }
  
  async createCustomer(customer: InsertCustomer): Promise<Customer> {
    const id = this.currentId++;
    const newCustomer: Customer = {
      ...customer,
      id,
      createdAt: new Date()
    };
    this.customers.set(id, newCustomer);
    return newCustomer;
  }
  
  async updateCustomer(id: number, customer: Partial<Customer>): Promise<Customer | undefined> {
    const existingCustomer = this.customers.get(id);
    if (!existingCustomer) return undefined;
    
    const updatedCustomer = {
      ...existingCustomer,
      ...customer
    };
    
    this.customers.set(id, updatedCustomer);
    return updatedCustomer;
  }
  
  async deleteCustomer(id: number): Promise<boolean> {
    return this.customers.delete(id);
  }
  
  // Sale methods
  async getSales(): Promise<Sale[]> {
    return Array.from(this.sales.values());
  }
  
  async getSale(id: number): Promise<Sale | undefined> {
    return this.sales.get(id);
  }
  
  async createSale(sale: InsertSale): Promise<Sale> {
    const id = this.currentId++;
    const newSale: Sale = {
      ...sale,
      id,
      createdAt: new Date()
    };
    this.sales.set(id, newSale);
    
    // Update vehicle status to sold
    const vehicle = this.vehicles.get(sale.vehicleId);
    if (vehicle) {
      this.updateVehicle(vehicle.id, { status: "sold" });
    }
    
    return newSale;
  }
  
  async updateSale(id: number, sale: Partial<Sale>): Promise<Sale | undefined> {
    const existingSale = this.sales.get(id);
    if (!existingSale) return undefined;
    
    const updatedSale = {
      ...existingSale,
      ...sale
    };
    
    this.sales.set(id, updatedSale);
    return updatedSale;
  }
  
  async deleteSale(id: number): Promise<boolean> {
    const sale = this.sales.get(id);
    if (sale) {
      // If we delete a sale, we need to set the vehicle status back to available
      const vehicle = this.vehicles.get(sale.vehicleId);
      if (vehicle) {
        this.updateVehicle(vehicle.id, { status: "available" });
      }
    }
    
    return this.sales.delete(id);
  }
  
  // Financing methods
  async getFinancings(): Promise<Financing[]> {
    return Array.from(this.financings.values());
  }
  
  async getFinancing(id: number): Promise<Financing | undefined> {
    return this.financings.get(id);
  }
  
  async createFinancing(financing: InsertFinancing): Promise<Financing> {
    const id = this.currentId++;
    const newFinancing: Financing = {
      ...financing,
      id,
      createdAt: new Date()
    };
    this.financings.set(id, newFinancing);
    return newFinancing;
  }
  
  async updateFinancing(id: number, financing: Partial<Financing>): Promise<Financing | undefined> {
    const existingFinancing = this.financings.get(id);
    if (!existingFinancing) return undefined;
    
    const updatedFinancing = {
      ...existingFinancing,
      ...financing
    };
    
    this.financings.set(id, updatedFinancing);
    return updatedFinancing;
  }
  
  async deleteFinancing(id: number): Promise<boolean> {
    return this.financings.delete(id);
  }
  
  // Expense methods
  async getExpenses(): Promise<Expense[]> {
    return Array.from(this.expenses.values());
  }
  
  async getExpense(id: number): Promise<Expense | undefined> {
    return this.expenses.get(id);
  }
  
  async createExpense(expense: InsertExpense): Promise<Expense> {
    const id = this.currentId++;
    const newExpense: Expense = {
      ...expense,
      id,
      createdAt: new Date()
    };
    this.expenses.set(id, newExpense);
    return newExpense;
  }
  
  async updateExpense(id: number, expense: Partial<Expense>): Promise<Expense | undefined> {
    const existingExpense = this.expenses.get(id);
    if (!existingExpense) return undefined;
    
    const updatedExpense = {
      ...existingExpense,
      ...expense
    };
    
    this.expenses.set(id, updatedExpense);
    return updatedExpense;
  }
  
  async deleteExpense(id: number): Promise<boolean> {
    return this.expenses.delete(id);
  }
  
  // Personnel methods
  async getPersonnel(): Promise<Personnel[]> {
    return Array.from(this.personnel.values());
  }
  
  async getPersonnelByType(type: string): Promise<Personnel[]> {
    return Array.from(this.personnel.values()).filter(
      (person) => person.type === type
    );
  }
  
  async getPersonnelById(id: number): Promise<Personnel | undefined> {
    return this.personnel.get(id);
  }
  
  async createPersonnel(personnel: InsertPersonnel): Promise<Personnel> {
    const id = this.currentId++;
    const newPersonnel: Personnel = {
      ...personnel,
      id,
      createdAt: new Date()
    };
    this.personnel.set(id, newPersonnel);
    return newPersonnel;
  }
  
  async updatePersonnel(id: number, personnel: Partial<Personnel>): Promise<Personnel | undefined> {
    const existingPersonnel = this.personnel.get(id);
    if (!existingPersonnel) return undefined;
    
    const updatedPersonnel = {
      ...existingPersonnel,
      ...personnel
    };
    
    this.personnel.set(id, updatedPersonnel);
    return updatedPersonnel;
  }
  
  async deletePersonnel(id: number): Promise<boolean> {
    return this.personnel.delete(id);
  }
  
  // Payment methods
  async getPayments(): Promise<Payment[]> {
    return [];
  }
  
  async getPayment(id: string): Promise<Payment | undefined> {
    return undefined;
  }
  
  async createPayment(payment: InsertPayment): Promise<Payment> {
    return payment as any;
  }
  
  async updatePayment(id: string, payment: Partial<Payment>): Promise<Payment | undefined> {
    return undefined;
  }
  
  async deletePayment(id: string): Promise<boolean> {
    return false;
  }
}

export class DatabaseStorage implements IStorage {
  sessionStore: session.Store;
  
  constructor() {
    this.sessionStore = new PostgresSessionStore({
      conObject: { connectionString: process.env.DATABASE_URL },
      createTableIfMissing: true
    });
  }

  // User methods
  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db.insert(users).values({
      ...insertUser,
      isActive: true,
      createdAt: new Date()
    }).returning();
    return user;
  }
  
  async updateUser(id: number, userData: Partial<User>): Promise<User | undefined> {
    const [updatedUser] = await db.update(users)
      .set(userData)
      .where(eq(users.id, id))
      .returning();
    return updatedUser;
  }
  
  async deleteUser(id: number): Promise<boolean> {
    // Verificar se é o último admin ativo antes de excluir
    if (id) {
      const [user] = await db.select().from(users).where(eq(users.id, id));
      if (user && user.role === "admin" && user.isActive) {
        const adminUsers = await db.select().from(users)
          .where(and(
            eq(users.role, "admin"),
            eq(users.isActive, true)
          ));
        
        // Se for o último admin ativo, não permitir exclusão
        if (adminUsers.length <= 1) {
          return false;
        }
      }
    }
    
    const result = await db.delete(users).where(eq(users.id, id));
    return result.rowCount ? result.rowCount > 0 : false;
  }
  
  // Vehicle methods
  async getVehicles(): Promise<Vehicle[]> {
    return await db.select().from(vehicles);
  }
  
  async getVehicle(id: number): Promise<Vehicle | undefined> {
    const [vehicle] = await db.select().from(vehicles).where(eq(vehicles.id, id));
    return vehicle;
  }
  
  async createVehicle(vehicle: InsertVehicle): Promise<Vehicle> {
    const [newVehicle] = await db.insert(vehicles).values({
      ...vehicle,
      createdAt: new Date(),
      updatedAt: new Date()
    }).returning();
    return newVehicle;
  }
  
  async updateVehicle(id: number, vehicle: Partial<Vehicle>): Promise<Vehicle | undefined> {
    const [updatedVehicle] = await db.update(vehicles)
      .set({
        ...vehicle,
        updatedAt: new Date()
      })
      .where(eq(vehicles.id, id))
      .returning();
    return updatedVehicle;
  }
  
  async deleteVehicle(id: number): Promise<boolean> {
    const result = await db.delete(vehicles).where(eq(vehicles.id, id));
    return result.rowCount > 0;
  }
  
  async getAvailableVehicles(): Promise<Vehicle[]> {
    return await db.select().from(vehicles).where(eq(vehicles.status, "available"));
  }
  
  // Customer methods
  async getCustomers(): Promise<Customer[]> {
    return await db.select().from(customers);
  }
  
  async getCustomer(id: number): Promise<Customer | undefined> {
    const [customer] = await db.select().from(customers).where(eq(customers.id, id));
    return customer;
  }
  
  async createCustomer(customer: InsertCustomer): Promise<Customer> {
    const [newCustomer] = await db.insert(customers).values({
      ...customer,
      createdAt: new Date()
    }).returning();
    return newCustomer;
  }
  
  async updateCustomer(id: number, customer: Partial<Customer>): Promise<Customer | undefined> {
    const [updatedCustomer] = await db.update(customers)
      .set(customer)
      .where(eq(customers.id, id))
      .returning();
    return updatedCustomer;
  }
  
  async deleteCustomer(id: number): Promise<boolean> {
    const result = await db.delete(customers).where(eq(customers.id, id));
    return result.rowCount > 0;
  }
  
  // Sale methods
  async getSales(): Promise<Sale[]> {
    return await db.select().from(sales);
  }
  
  async getSale(id: number): Promise<Sale | undefined> {
    const [sale] = await db.select().from(sales).where(eq(sales.id, id));
    return sale;
  }
  
  async createSale(sale: InsertSale): Promise<Sale> {
    const [newSale] = await db.insert(sales).values({
      ...sale,
      createdAt: new Date()
    }).returning();
    
    // Update vehicle status to sold
    await db.update(vehicles)
      .set({ status: "sold" })
      .where(eq(vehicles.id, sale.vehicleId));
    
    return newSale;
  }
  
  async updateSale(id: number, sale: Partial<Sale>): Promise<Sale | undefined> {
    const [updatedSale] = await db.update(sales)
      .set(sale)
      .where(eq(sales.id, id))
      .returning();
    return updatedSale;
  }
  
  async deleteSale(id: number): Promise<boolean> {
    const [sale] = await db.select().from(sales).where(eq(sales.id, id));
    
    if (sale) {
      // If we delete a sale, set the vehicle status back to available
      await db.update(vehicles)
        .set({ status: "available" })
        .where(eq(vehicles.id, sale.vehicleId));
    }
    
    const result = await db.delete(sales).where(eq(sales.id, id));
    return result.rowCount > 0;
  }
  
  // Financing methods
  async getFinancings(): Promise<Financing[]> {
    return await db.select().from(financings);
  }
  
  async getFinancing(id: number): Promise<Financing | undefined> {
    const [financing] = await db.select().from(financings).where(eq(financings.id, id));
    return financing;
  }
  
  async createFinancing(financing: InsertFinancing): Promise<Financing> {
    // Verificar se temos um agentName antes de inserir
    console.log("Dados do financiamento a serem inseridos:", financing);
    
    // Inserir o financiamento no banco de dados
    const [newFinancing] = await db.insert(financings).values({
      ...financing,
      createdAt: new Date()
    }).returning();
    
    return newFinancing;
  }
  
  async updateFinancing(id: number, financing: Partial<Financing>): Promise<Financing | undefined> {
    const [updatedFinancing] = await db.update(financings)
      .set(financing)
      .where(eq(financings.id, id))
      .returning();
    return updatedFinancing;
  }
  
  async deleteFinancing(id: number): Promise<boolean> {
    const result = await db.delete(financings).where(eq(financings.id, id));
    return result.rowCount > 0;
  }
  
  // Expense methods
  async getExpenses(): Promise<Expense[]> {
    return await db.select().from(expenses);
  }
  
  async getExpense(id: number): Promise<Expense | undefined> {
    const [expense] = await db.select().from(expenses).where(eq(expenses.id, id));
    return expense;
  }
  
  async createExpense(expense: InsertExpense): Promise<Expense> {
    const [newExpense] = await db.insert(expenses).values({
      ...expense,
      createdAt: new Date()
    }).returning();
    return newExpense;
  }
  
  async updateExpense(id: number, expense: Partial<Expense>): Promise<Expense | undefined> {
    try {
      console.log("Atualizando despesa:", id, "com dados:", JSON.stringify(expense));
      
      // Se expense contém um campo status, verificar e validar
      if ('status' in expense) {
        console.log(`Atualizando status para: ${expense.status}`);
        
        // Construir manualmente a consulta SQL para evitar problemas de tipagem
        const result = await db.execute(
          `UPDATE expenses 
           SET status = $1 
           WHERE id = $2 
           RETURNING *`,
          [expense.status, id]
        );
        
        if (result.rowCount === 0) {
          return undefined;
        }
        
        return result.rows[0] as Expense;
      } else {
        // Para outros campos, usar o builder do Drizzle
        const [updatedExpense] = await db.update(expenses)
          .set(expense)
          .where(eq(expenses.id, id))
          .returning();
        return updatedExpense;
      }
    } catch (error) {
      console.error("Erro ao atualizar despesa:", error);
      throw error;
    }
  }
  
  async deleteExpense(id: number): Promise<boolean> {
    const result = await db.delete(expenses).where(eq(expenses.id, id));
    return result.rowCount > 0;
  }
  
  // Personnel methods
  async getPersonnel(): Promise<Personnel[]> {
    return await db.select().from(personnel);
  }
  
  async getPersonnelByType(type: string): Promise<Personnel[]> {
    return await db.select().from(personnel).where(eq(personnel.type, type as any));
  }
  
  async getPersonnelById(id: number): Promise<Personnel | undefined> {
    const [person] = await db.select().from(personnel).where(eq(personnel.id, id));
    return person;
  }
  
  async createPersonnel(personnelData: InsertPersonnel): Promise<Personnel> {
    const [newPersonnel] = await db.insert(personnel).values({
      ...personnelData,
      createdAt: new Date()
    }).returning();
    return newPersonnel;
  }
  
  async updatePersonnel(id: number, personnelData: Partial<Personnel>): Promise<Personnel | undefined> {
    const [updatedPersonnel] = await db.update(personnel)
      .set(personnelData)
      .where(eq(personnel.id, id))
      .returning();
    return updatedPersonnel;
  }
  
  async deletePersonnel(id: number): Promise<boolean> {
    const result = await db.delete(personnel).where(eq(personnel.id, id));
    return result.rowCount > 0;
  }
  
  // Payment methods
  async getPayments(): Promise<Payment[]> {
    return await db.select().from(payments);
  }
  
  async getPayment(id: string): Promise<Payment | undefined> {
    const [payment] = await db.select().from(payments).where(eq(payments.id, id));
    return payment;
  }
  
  async createPayment(payment: InsertPayment): Promise<Payment> {
    const [newPayment] = await db.insert(payments).values({
      ...payment
    }).returning();
    return newPayment;
  }
  
  async updatePayment(id: string, paymentData: Partial<Payment>): Promise<Payment | undefined> {
    const [updatedPayment] = await db.update(payments)
      .set(paymentData)
      .where(eq(payments.id, id))
      .returning();
    return updatedPayment;
  }
  
  async deletePayment(id: string): Promise<boolean> {
    const result = await db.delete(payments).where(eq(payments.id, id));
    return result.rowCount > 0;
  }
}

// Use the database storage
export const storage = new DatabaseStorage();
