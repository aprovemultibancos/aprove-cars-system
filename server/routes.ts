import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth } from "./auth";
import { insertVehicleSchema, insertCustomerSchema, insertSaleSchema, insertFinancingSchema, insertExpenseSchema, insertPersonnelSchema } from "@shared/schema";

export async function registerRoutes(app: Express): Promise<Server> {
  // Set up auth routes
  setupAuth(app);

  // Vehicles routes
  app.get("/api/vehicles", async (req, res) => {
    const vehicles = await storage.getVehicles();
    res.json(vehicles);
  });

  app.get("/api/vehicles/available", async (req, res) => {
    const vehicles = await storage.getAvailableVehicles();
    res.json(vehicles);
  });

  app.get("/api/vehicles/:id", async (req, res) => {
    const vehicle = await storage.getVehicle(parseInt(req.params.id));
    if (!vehicle) {
      return res.status(404).json({ message: "Veículo não encontrado" });
    }
    res.json(vehicle);
  });

  app.post("/api/vehicles", async (req, res) => {
    try {
      const vehicleData = insertVehicleSchema.parse(req.body);
      const vehicle = await storage.createVehicle(vehicleData);
      res.status(201).json(vehicle);
    } catch (error) {
      res.status(400).json({ message: "Dados inválidos", error });
    }
  });

  app.patch("/api/vehicles/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const updatedVehicle = await storage.updateVehicle(id, req.body);
      if (!updatedVehicle) {
        return res.status(404).json({ message: "Veículo não encontrado" });
      }
      res.json(updatedVehicle);
    } catch (error) {
      res.status(400).json({ message: "Dados inválidos", error });
    }
  });

  app.delete("/api/vehicles/:id", async (req, res) => {
    const id = parseInt(req.params.id);
    const success = await storage.deleteVehicle(id);
    if (!success) {
      return res.status(404).json({ message: "Veículo não encontrado" });
    }
    res.status(204).end();
  });

  // Customers routes
  app.get("/api/customers", async (req, res) => {
    const customers = await storage.getCustomers();
    res.json(customers);
  });

  app.get("/api/customers/:id", async (req, res) => {
    const customer = await storage.getCustomer(parseInt(req.params.id));
    if (!customer) {
      return res.status(404).json({ message: "Cliente não encontrado" });
    }
    res.json(customer);
  });

  app.post("/api/customers", async (req, res) => {
    try {
      const customerData = insertCustomerSchema.parse(req.body);
      const customer = await storage.createCustomer(customerData);
      res.status(201).json(customer);
    } catch (error) {
      res.status(400).json({ message: "Dados inválidos", error });
    }
  });

  app.patch("/api/customers/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const updatedCustomer = await storage.updateCustomer(id, req.body);
      if (!updatedCustomer) {
        return res.status(404).json({ message: "Cliente não encontrado" });
      }
      res.json(updatedCustomer);
    } catch (error) {
      res.status(400).json({ message: "Dados inválidos", error });
    }
  });

  app.delete("/api/customers/:id", async (req, res) => {
    const id = parseInt(req.params.id);
    const success = await storage.deleteCustomer(id);
    if (!success) {
      return res.status(404).json({ message: "Cliente não encontrado" });
    }
    res.status(204).end();
  });

  // Sales routes
  app.get("/api/sales", async (req, res) => {
    const sales = await storage.getSales();
    res.json(sales);
  });

  app.get("/api/sales/:id", async (req, res) => {
    const sale = await storage.getSale(parseInt(req.params.id));
    if (!sale) {
      return res.status(404).json({ message: "Venda não encontrada" });
    }
    res.json(sale);
  });

  app.post("/api/sales", async (req, res) => {
    try {
      const saleData = insertSaleSchema.parse(req.body);
      const sale = await storage.createSale(saleData);
      res.status(201).json(sale);
    } catch (error) {
      res.status(400).json({ message: "Dados inválidos", error });
    }
  });

  app.patch("/api/sales/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const updatedSale = await storage.updateSale(id, req.body);
      if (!updatedSale) {
        return res.status(404).json({ message: "Venda não encontrada" });
      }
      res.json(updatedSale);
    } catch (error) {
      res.status(400).json({ message: "Dados inválidos", error });
    }
  });

  app.delete("/api/sales/:id", async (req, res) => {
    const id = parseInt(req.params.id);
    const success = await storage.deleteSale(id);
    if (!success) {
      return res.status(404).json({ message: "Venda não encontrada" });
    }
    res.status(204).end();
  });

  // Financings routes
  app.get("/api/financings", async (req, res) => {
    const financings = await storage.getFinancings();
    res.json(financings);
  });

  app.get("/api/financings/:id", async (req, res) => {
    const financing = await storage.getFinancing(parseInt(req.params.id));
    if (!financing) {
      return res.status(404).json({ message: "Financiamento não encontrado" });
    }
    res.json(financing);
  });

  app.post("/api/financings", async (req, res) => {
    try {
      const financingData = insertFinancingSchema.parse(req.body);
      const financing = await storage.createFinancing(financingData);
      res.status(201).json(financing);
    } catch (error) {
      res.status(400).json({ message: "Dados inválidos", error });
    }
  });

  app.patch("/api/financings/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const updatedFinancing = await storage.updateFinancing(id, req.body);
      if (!updatedFinancing) {
        return res.status(404).json({ message: "Financiamento não encontrado" });
      }
      res.json(updatedFinancing);
    } catch (error) {
      res.status(400).json({ message: "Dados inválidos", error });
    }
  });

  app.delete("/api/financings/:id", async (req, res) => {
    const id = parseInt(req.params.id);
    const success = await storage.deleteFinancing(id);
    if (!success) {
      return res.status(404).json({ message: "Financiamento não encontrado" });
    }
    res.status(204).end();
  });

  // Expenses routes
  app.get("/api/expenses", async (req, res) => {
    const expenses = await storage.getExpenses();
    res.json(expenses);
  });

  app.get("/api/expenses/:id", async (req, res) => {
    const expense = await storage.getExpense(parseInt(req.params.id));
    if (!expense) {
      return res.status(404).json({ message: "Despesa não encontrada" });
    }
    res.json(expense);
  });

  app.post("/api/expenses", async (req, res) => {
    try {
      const expenseData = insertExpenseSchema.parse(req.body);
      const expense = await storage.createExpense(expenseData);
      res.status(201).json(expense);
    } catch (error) {
      res.status(400).json({ message: "Dados inválidos", error });
    }
  });

  app.patch("/api/expenses/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const updatedExpense = await storage.updateExpense(id, req.body);
      if (!updatedExpense) {
        return res.status(404).json({ message: "Despesa não encontrada" });
      }
      res.json(updatedExpense);
    } catch (error) {
      res.status(400).json({ message: "Dados inválidos", error });
    }
  });

  app.delete("/api/expenses/:id", async (req, res) => {
    const id = parseInt(req.params.id);
    const success = await storage.deleteExpense(id);
    if (!success) {
      return res.status(404).json({ message: "Despesa não encontrada" });
    }
    res.status(204).end();
  });

  // Personnel routes
  app.get("/api/personnel", async (req, res) => {
    const personnel = await storage.getPersonnel();
    res.json(personnel);
  });

  app.get("/api/personnel/agents", async (req, res) => {
    const agents = await storage.getPersonnelByType("agent");
    res.json(agents);
  });

  app.get("/api/personnel/:id", async (req, res) => {
    const person = await storage.getPersonnelById(parseInt(req.params.id));
    if (!person) {
      return res.status(404).json({ message: "Pessoa não encontrada" });
    }
    res.json(person);
  });

  app.post("/api/personnel", async (req, res) => {
    try {
      const personnelData = insertPersonnelSchema.parse(req.body);
      const person = await storage.createPersonnel(personnelData);
      res.status(201).json(person);
    } catch (error) {
      res.status(400).json({ message: "Dados inválidos", error });
    }
  });

  app.patch("/api/personnel/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const updatedPerson = await storage.updatePersonnel(id, req.body);
      if (!updatedPerson) {
        return res.status(404).json({ message: "Pessoa não encontrada" });
      }
      res.json(updatedPerson);
    } catch (error) {
      res.status(400).json({ message: "Dados inválidos", error });
    }
  });

  app.delete("/api/personnel/:id", async (req, res) => {
    const id = parseInt(req.params.id);
    const success = await storage.deletePersonnel(id);
    if (!success) {
      return res.status(404).json({ message: "Pessoa não encontrada" });
    }
    res.status(204).end();
  });

  // Users/sales
  app.get("/api/users/sales", async (req, res) => {
    const users = await storage.getUsers();
    const salesUsers = users.filter(user => user.role === "sales" || user.role === "admin");
    res.json(salesUsers);
  });

  const httpServer = createServer(app);

  return httpServer;
}
