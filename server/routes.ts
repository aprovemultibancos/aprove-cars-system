import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth, hashPassword } from "./auth";
import { insertVehicleSchema, insertCustomerSchema, insertSaleSchema, insertFinancingSchema, insertExpenseSchema, insertPersonnelSchema, insertUserSchema, users as usersTable } from "@shared/schema";
import { db } from "./db";
import { z } from "zod";
import { 
  createOrGetCustomer, 
  createPayment, 
  listPayments, 
  getPaymentById, 
  cancelPayment, 
  formatCustomerForAsaas,
  enrichPaymentWithCustomerInfo
} from "./asaas-service";

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
    
    // Obter a venda antes de excluí-la para recuperar o ID do veículo
    const sale = await storage.getSale(id);
    if (!sale) {
      return res.status(404).json({ message: "Venda não encontrada" });
    }
    
    // Excluir a venda
    const success = await storage.deleteSale(id);
    if (!success) {
      return res.status(404).json({ message: "Erro ao excluir venda" });
    }
    
    // Atualizar o status do veículo para disponível novamente
    if (sale.vehicleId) {
      const vehicle = await storage.getVehicle(sale.vehicleId);
      if (vehicle) {
        await storage.updateVehicle(sale.vehicleId, { status: "available" });
      }
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
      console.log("Recebido no backend:", req.body);
      
      // Converter campos numéricos para números (caso venham como strings)
      const body = {
        ...req.body,
        customerId: req.body.customerId || null,
        assetValue: Number(req.body.assetValue),
        accessoriesPercentage: Number(req.body.accessoriesPercentage || 0),
        feeAmount: Number(req.body.feeAmount || 0),
        releasedAmount: Number(req.body.releasedAmount || 0),
        expectedReturn: Number(req.body.expectedReturn || 0),
        agentCommission: Number(req.body.agentCommission || 0),
        sellerCommission: Number(req.body.sellerCommission || 0),
        agentId: Number(req.body.agentId)
      };
      
      console.log("Dados após conversão para número:", body);
      
      const financingData = insertFinancingSchema.parse(body);
      console.log("Dados após parse do schema:", financingData);
      
      const financing = await storage.createFinancing(financingData);
      console.log("Financiamento criado com sucesso:", financing);
      
      res.status(201).json(financing);
    } catch (error) {
      console.error("Erro ao criar financiamento:", error);
      res.status(400).json({ message: "Dados inválidos", error: String(error) });
    }
  });

  app.patch("/api/financings/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      
      // Converter campos numéricos para números (caso venham como strings)
      const body = {
        ...req.body
      };
      
      // Converter campos específicos para números se estiverem presentes
      if (body.assetValue !== undefined) body.assetValue = Number(body.assetValue);
      if (body.accessoriesPercentage !== undefined) body.accessoriesPercentage = Number(body.accessoriesPercentage);
      if (body.feeAmount !== undefined) body.feeAmount = Number(body.feeAmount);
      if (body.releasedAmount !== undefined) body.releasedAmount = Number(body.releasedAmount);
      if (body.expectedReturn !== undefined) body.expectedReturn = Number(body.expectedReturn);
      if (body.agentCommission !== undefined) body.agentCommission = Number(body.agentCommission);
      if (body.sellerCommission !== undefined) body.sellerCommission = Number(body.sellerCommission);
      if (body.agentId !== undefined) body.agentId = Number(body.agentId);
      
      console.log("Atualizando financiamento com dados:", body);
      
      const updatedFinancing = await storage.updateFinancing(id, body);
      if (!updatedFinancing) {
        return res.status(404).json({ message: "Financiamento não encontrado" });
      }
      res.json(updatedFinancing);
    } catch (error) {
      console.error("Erro ao atualizar financiamento:", error);
      res.status(400).json({ message: "Dados inválidos", error: String(error) });
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

  // Rotas de gerenciamento de usuários (somente para administradores)
  app.get("/api/users", async (req, res) => {
    if (!req.isAuthenticated() || req.user.role !== "admin") {
      return res.status(403).json({ message: "Acesso negado" });
    }
    
    try {
      const users = await db.select().from(usersTable);
      res.json(users);
    } catch (error) {
      console.error("Erro ao buscar usuários:", error);
      res.status(500).json({ message: "Erro ao buscar usuários" });
    }
  });
  
  app.post("/api/users", async (req, res) => {
    if (!req.isAuthenticated() || req.user.role !== "admin") {
      return res.status(403).json({ message: "Acesso negado" });
    }
    
    try {
      // Verificar se o nome de usuário já existe
      const existingUser = await storage.getUserByUsername(req.body.username);
      if (existingUser) {
        return res.status(400).json({ message: "Nome de usuário já existe" });
      }
      
      const userData = insertUserSchema.parse(req.body);
      const hashedPassword = await hashPassword(userData.password);
      
      const newUser = await storage.createUser({
        ...userData,
        password: hashedPassword
      });
      
      res.status(201).json(newUser);
    } catch (error) {
      console.error("Erro ao criar usuário:", error);
      res.status(400).json({ message: "Dados inválidos", error });
    }
  });
  
  app.patch("/api/users/:id/status", async (req, res) => {
    if (!req.isAuthenticated() || req.user.role !== "admin") {
      return res.status(403).json({ message: "Acesso negado" });
    }
    
    const userId = parseInt(req.params.id);
    const { isActive } = req.body;
    
    try {
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: "Usuário não encontrado" });
      }
      
      // Impedir desativação da própria conta do administrador
      if (userId === req.user.id && !isActive) {
        return res.status(400).json({ message: "Não é possível desativar sua própria conta" });
      }
      
      const updatedUser = await storage.updateUser(userId, { isActive });
      res.json(updatedUser);
    } catch (error) {
      console.error("Erro ao atualizar status do usuário:", error);
      res.status(500).json({ message: "Erro ao atualizar status do usuário" });
    }
  });
  
  app.delete("/api/users/:id", async (req, res) => {
    if (!req.isAuthenticated() || req.user.role !== "admin") {
      return res.status(403).json({ message: "Acesso negado" });
    }
    
    const userId = parseInt(req.params.id);
    
    try {
      // Impedir exclusão da própria conta do administrador
      if (userId === req.user.id) {
        return res.status(400).json({ message: "Não é possível excluir sua própria conta" });
      }
      
      const success = await storage.deleteUser(userId);
      if (!success) {
        return res.status(404).json({ message: "Usuário não encontrado" });
      }
      
      res.status(204).end();
    } catch (error) {
      console.error("Erro ao excluir usuário:", error);
      res.status(500).json({ message: "Erro ao excluir usuário" });
    }
  });

  // Users/sales - endpoint para usuários com função de vendas
  app.get("/api/users/sales", async (req, res) => {
    try {
      // Consulta direta da tabela users usando db
      const usersData = await db.select().from(usersTable);
      // Se não houver usuários na tabela (vazia ou não existente), retornar usuário padrão (admin)
      if (!usersData || usersData.length === 0) {
        console.log("Tabela de usuários vazia, retornando usuário padrão");
        // Retorna um usuário padrão (admin) com o ID do usuário autenticado, se existir
        const adminUser = {
          id: req.user?.id || 1,
          name: req.user?.name || "Administrador",
          role: "admin"
        };
        return res.json([adminUser]);
      }
      
      // Filtra usuários com perfil de vendas ou admin
      const salesUsers = usersData.filter(user => user.role === "sales" || user.role === "admin");
      
      // Se não encontrar vendedores, retornar pelo menos o admin
      if (salesUsers.length === 0) {
        const adminUser = usersData.find(user => user.role === "admin") || {
          id: req.user?.id || 1,
          name: req.user?.name || "Administrador",
          role: "admin"
        };
        return res.json([adminUser]);
      }
      
      res.json(salesUsers);
    } catch (error) {
      console.error("Erro ao buscar usuários de vendas:", error);
      // Em caso de erro, retorna o usuário autenticado como vendedor
      if (req.user) {
        return res.json([{
          id: req.user.id,
          name: req.user.name,
          role: req.user.role
        }]);
      }
      
      // Se não houver usuário autenticado ou ocorrer outro erro
      res.status(500).json({ message: "Erro ao buscar usuários" });
    }
  });

  // Schema de validação para pagamentos
  const paymentSchema = z.object({
    customerId: z.string(),
    customerName: z.string().optional(),
    description: z.string(),
    value: z.number().min(0.01),
    dueDate: z.date(),
    billingType: z.enum(["BOLETO", "PIX", "CREDIT_CARD"]),
    relatedSaleId: z.string().optional(),
    notes: z.string().optional(),
  });

  // Rotas de pagamento (integração com Asaas)
  // Listar pagamentos
  app.get("/api/payments", async (req, res) => {
    try {
      const payments = await listPayments();
      res.json(payments);
    } catch (error) {
      console.error("Erro ao listar pagamentos:", error);
      res.status(500).json({ 
        message: "Erro ao listar pagamentos", 
        error: error instanceof Error ? error.message : "Erro desconhecido" 
      });
    }
  });

  // Obter pagamento por ID
  app.get("/api/payments/:id", async (req, res) => {
    try {
      const paymentId = req.params.id;
      const payment = await getPaymentById(paymentId);
      res.json(payment);
    } catch (error) {
      console.error(`Erro ao buscar pagamento ${req.params.id}:`, error);
      res.status(500).json({ 
        message: "Erro ao buscar pagamento", 
        error: error instanceof Error ? error.message : "Erro desconhecido" 
      });
    }
  });

  // Criar novo pagamento
  app.post("/api/payments", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Usuário não autenticado" });
    }

    try {
      // Validar dados do pagamento
      const paymentData = paymentSchema.parse(req.body);
      const { customerId, description, value, dueDate, billingType, relatedSaleId, notes } = paymentData;

      // Buscar o cliente no sistema para obter mais informações
      const customer = await storage.getCustomer(parseInt(customerId));
      if (!customer) {
        return res.status(404).json({ message: "Cliente não encontrado" });
      }

      // Formatar cliente para o Asaas
      const asaasCustomerData = formatCustomerForAsaas(customer);
      
      // Criar ou obter cliente no Asaas
      const asaasCustomer = await createOrGetCustomer(asaasCustomerData);

      // Formatar data para o formato esperado pelo Asaas (YYYY-MM-DD)
      const formattedDueDate = dueDate instanceof Date 
        ? dueDate.toISOString().split('T')[0] 
        : new Date(dueDate).toISOString().split('T')[0];

      // Preparar dados do pagamento para o Asaas
      const asaasPaymentData = {
        customer: asaasCustomer.id,
        billingType: billingType as "BOLETO" | "CREDIT_CARD" | "PIX" | "UNDEFINED",
        value: value,
        dueDate: formattedDueDate,
        description: description,
        externalReference: relatedSaleId || undefined
      };

      // Criar o pagamento no Asaas
      const payment = await createPayment(asaasPaymentData);
      
      // Adicionar informações do cliente ao pagamento
      const enrichedPayment = enrichPaymentWithCustomerInfo(payment, customer);

      res.status(201).json(enrichedPayment);
    } catch (error) {
      console.error("Erro ao criar pagamento:", error);
      res.status(400).json({ 
        message: "Dados inválidos", 
        error: error instanceof Error ? error.message : "Erro desconhecido" 
      });
    }
  });

  // Cancelar pagamento
  app.delete("/api/payments/:id", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Usuário não autenticado" });
    }

    try {
      const paymentId = req.params.id;
      const result = await cancelPayment(paymentId);
      res.json(result);
    } catch (error) {
      console.error(`Erro ao cancelar pagamento ${req.params.id}:`, error);
      res.status(500).json({ 
        message: "Erro ao cancelar pagamento", 
        error: error instanceof Error ? error.message : "Erro desconhecido" 
      });
    }
  });

  const httpServer = createServer(app);

  return httpServer;
}
