import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth, hashPassword } from "./auth";
import { insertVehicleSchema, insertCustomerSchema, insertSaleSchema, insertFinancingSchema, insertExpenseSchema, updateExpenseStatusSchema, insertPersonnelSchema, insertUserSchema, users as usersTable } from "@shared/schema";
import { db } from "./db";
import { z } from "zod";
import { asaasService, AsaasPaymentRequest, AsaasCustomerRequest } from "./services/asaas";

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
    
    // Enriquecer os financiamentos com informações adicionais
    const enrichedFinancings = await Promise.all(financings.map(async (financing) => {
      let enriched = { ...financing };
      
      // Se o financiamento estiver associado a um agente, buscar o nome do agente
      if (financing.agentId) {
        try {
          const agent = await storage.getPersonnelById(financing.agentId);
          if (agent) {
            enriched.agentName = agent.name;
          }
        } catch (error) {
          console.error(`Erro ao buscar agente ${financing.agentId}:`, error);
        }
      }
      
      return enriched;
    }));
    
    res.json(enrichedFinancings);
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
      console.log("Recebido no backend:", JSON.stringify(req.body, null, 2));
      
      // Validação manual para debug
      console.log("Tipos dos campos recebidos:");
      Object.entries(req.body).forEach(([key, value]) => {
        console.log(`${key}: ${typeof value} => ${value}`);
      });
      
      // Tentar converter manualmente
      const preprocessedData = {
        ...req.body,
        customerId: req.body.customerId ? Number(req.body.customerId) : null,
        assetValue: Number(req.body.assetValue),
        accessoriesPercentage: Number(req.body.accessoriesPercentage || 0),
        feeAmount: Number(req.body.feeAmount || 0),
        releasedAmount: Number(req.body.releasedAmount || 0),
        expectedReturn: Number(req.body.expectedReturn || 0),
        agentCommission: Number(req.body.agentCommission || 0),
        sellerCommission: Number(req.body.sellerCommission || 0),
        agentId: Number(req.body.agentId)
      };
      
      console.log("Dados pré-processados:", JSON.stringify(preprocessedData, null, 2));
      
      // Usar o schema para validar os dados pré-processados
      const financingData = insertFinancingSchema.parse(preprocessedData);
      console.log("Dados após parse do schema:", JSON.stringify(financingData, null, 2));
      
      // Garantir que o campo agentName seja preservado
      const dataWithAgentName = {
        ...financingData,
        agentName: preprocessedData.agentName || null
      };
      
      const financing = await storage.createFinancing(dataWithAgentName);
      console.log("Financiamento criado com sucesso:", financing);
      
      res.status(201).json(financing);
    } catch (error) {
      console.error("Erro ao criar financiamento:", error);
      if (error instanceof Error) {
        console.error("Detalhes do erro:", error.message);
        if (error.cause) console.error("Causa:", error.cause);
        if (error.stack) console.error("Stack:", error.stack);
      }
      res.status(400).json({ message: "Dados inválidos", error: String(error) });
    }
  });

  app.patch("/api/financings/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      console.log("Recebido para atualização:", req.body);
      
      // Validar dados parciais usando o schema, permitindo atualização parcial
      // Só faremos a coerção dos campos numéricos presentes no corpo da requisição
      const partialSchema = z.object({
        customerId: z.number().nullable().optional(),
        customerName: z.string().optional(),
        bank: z.string().optional(),
        assetValue: z.union([z.string(), z.coerce.string()]).optional(),
        returnType: z.enum(["R0", "R1", "R2", "R3", "R4", "R6", "RF"]).optional(),
        accessoriesPercentage: z.union([z.string(), z.coerce.string()]).optional(),
        feeAmount: z.union([z.string(), z.coerce.string()]).optional(),
        releasedAmount: z.union([z.string(), z.coerce.string()]).optional(),
        expectedReturn: z.union([z.string(), z.coerce.string()]).optional(),
        agentCommission: z.union([z.string(), z.coerce.string()]).optional(),
        sellerCommission: z.union([z.string(), z.coerce.string()]).optional(),
        status: z.enum(["analysis", "approved", "paid", "rejected"]).optional(),
        agentId: z.coerce.number().optional(),
        notes: z.string().optional(),
      });
      
      const body = partialSchema.parse(req.body);
      console.log("Dados após validação:", body);
      
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

  // Rota específica para atualização de status do financiamento
  app.patch("/api/financings/:id/status", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const { status } = req.body;
      
      console.log(`Atualizando status do financiamento ${id} para: ${status}`);
      
      if (!status || !["paid", "analysis"].includes(status)) {
        return res.status(400).json({ message: "Status inválido. Use 'paid' ou 'analysis'" });
      }
      
      const updatedFinancing = await storage.updateFinancing(id, { status });
      
      if (!updatedFinancing) {
        return res.status(500).json({ message: "Erro ao atualizar status do financiamento" });
      }
      
      res.json(updatedFinancing);
    } catch (error) {
      console.error("Erro ao atualizar status do financiamento:", error);
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
      console.log("Recebido no backend (despesa):", JSON.stringify(req.body, null, 2));
      
      // Validação manual para debug
      console.log("Tipos dos campos recebidos:");
      Object.entries(req.body).forEach(([key, value]) => {
        console.log(`${key}: ${typeof value} => ${value}`);
      });
      
      // Usar o schema para validar e converter os tipos dos dados
      const expenseData = insertExpenseSchema.parse(req.body);
      console.log("Dados após parse do schema:", JSON.stringify(expenseData, null, 2));
      
      const expense = await storage.createExpense(expenseData);
      console.log("Despesa criada com sucesso:", expense);
      
      res.status(201).json(expense);
    } catch (error) {
      console.error("Erro ao criar despesa:", error);
      if (error instanceof Error) {
        console.error("Detalhes do erro:", error.message);
        if (error.cause) console.error("Causa:", error.cause);
        if (error.stack) console.error("Stack:", error.stack);
      }
      res.status(400).json({ message: "Dados inválidos", error: String(error) });
    }
  });

  // Rota específica para atualizar o status da despesa
  app.patch("/api/expenses/:id/status", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const expense = await storage.getExpense(id);
      
      if (!expense) {
        return res.status(404).json({ message: "Despesa não encontrada" });
      }
      
      // Validar o status usando schema específico
      const { status } = updateExpenseStatusSchema.parse(req.body);
      
      console.log(`Atualizando status da despesa ${id} para: ${status}`);
      
      // Atualizar apenas o campo status
      const updatedExpense = await storage.updateExpense(id, { status });
      
      if (!updatedExpense) {
        return res.status(500).json({ message: "Erro ao atualizar status da despesa" });
      }
      
      res.json(updatedExpense);
    } catch (error) {
      console.error("Erro ao atualizar status da despesa:", error);
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
      console.log("Recebido no backend (pessoal):", JSON.stringify(req.body, null, 2));
      
      // Validação manual para debug
      console.log("Tipos dos campos recebidos:");
      Object.entries(req.body).forEach(([key, value]) => {
        console.log(`${key}: ${typeof value} => ${value}`);
      });
      
      // Usar o schema para validar e converter os tipos
      const personnelData = insertPersonnelSchema.parse(req.body);
      console.log("Dados após parse do schema:", JSON.stringify(personnelData, null, 2));
      
      const person = await storage.createPersonnel(personnelData);
      console.log("Pessoa criada com sucesso:", person);
      
      res.status(201).json(person);
    } catch (error) {
      console.error("Erro ao criar pessoa:", error);
      if (error instanceof Error) {
        console.error("Detalhes do erro:", error.message);
        if (error.cause) console.error("Causa:", error.cause);
        if (error.stack) console.error("Stack:", error.stack);
      }
      res.status(400).json({ message: "Dados inválidos", error: String(error) });
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



  // Rotas do Asaas Payment Gateway
  
  // Rota para configurar a API do Asaas
  app.post("/api/asaas/config", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Autenticação necessária" });
      }
      
      // Para segurança, somente administradores podem configurar a API
      if (req.user.role !== 'admin' && req.user.username !== 'administrador') {
        return res.status(403).json({ message: "Apenas administradores podem configurar a API" });
      }
      
      const { apiKey } = req.body;
      if (!apiKey) {
        return res.status(400).json({ message: "Chave de API é obrigatória" });
      }
      
      // Atualizar a chave de API no serviço
      const success = await asaasService.updateApiKey(apiKey);
      if (success) {
        return res.json({ success: true, message: "API configurada com sucesso" });
      } else {
        return res.status(400).json({ message: "Não foi possível configurar a API" });
      }
    } catch (error) {
      console.error("Erro ao configurar API:", error);
      res.status(500).json({ message: "Erro ao configurar API do Asaas" });
    }
  });

  // Rota para buscar o saldo da conta Asaas
  app.get("/api/asaas/balance", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Autenticação necessária" });
      }
      
      const balance = await asaasService.getBalance();
      res.json(balance);
    } catch (error) {
      console.error("Erro ao buscar saldo:", error);
      // Mesmo com erro, retornamos 200 com um valor padrão para manter a interface funcionando
      res.json({ balance: 0 });
    }
  });
  
  // Rota para listar pagamentos do Asaas
  app.get("/api/asaas/payments", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Autenticação necessária" });
      }
      
      const offset = parseInt(req.query.offset as string) || 0;
      const limit = parseInt(req.query.limit as string) || 10;
      const status = req.query.status as string;
      
      const payments = await asaasService.getPayments(offset, limit, status);
      res.json(payments);
    } catch (error) {
      console.error("Erro ao listar pagamentos:", error);
      // Mesmo com erro, retornamos 200 com lista vazia para manter a interface funcionando
      res.json({ data: [], totalCount: 0 });
    }
  });
  
  // Rota para consultar um pagamento específico
  app.get("/api/asaas/payments/:id", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Autenticação necessária" });
      }
      
      const paymentId = req.params.id;
      const payment = await asaasService.getPayment(paymentId);
      res.json(payment);
    } catch (error) {
      console.error("Erro ao buscar pagamento:", error);
      
      // Para pagamentos que não iniciam com "demo", retornamos um erro
      // Se fosse um pagamento demo, já teria sido tratado pelo serviço
      res.status(404).json({
        message: "Pagamento não encontrado ou serviço indisponível",
        error: String(error)
      });
    }
  });
  
  // Criar uma nova cobrança Asaas
  app.post("/api/asaas/payments", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Autenticação necessária" });
      }
      
      console.log("Recebido no backend (Asaas Payment):", JSON.stringify(req.body, null, 2));
      
      const { 
        customerName, 
        customerCpfCnpj, 
        customerEmail,
        customerPhone,
        billingType,
        value,
        dueDate,
        description,
        externalReference,
        creditCardData,
        addressInfo
      } = req.body;
      
      // 1. Verificar se o cliente já existe ou criar um novo
      let customerId;
      
      // Buscar cliente pelo CPF/CNPJ
      const existingCustomer = await asaasService.findCustomerByCpfCnpj(customerCpfCnpj);
      
      if (existingCustomer) {
        console.log("Cliente encontrado no Asaas:", existingCustomer.id);
        customerId = existingCustomer.id;
      } else {
        // Cliente não existe, criar um novo
        const customerData: AsaasCustomerRequest = {
          name: customerName,
          cpfCnpj: customerCpfCnpj,
          email: customerEmail,
          phone: customerPhone,
          mobilePhone: customerPhone,
          postalCode: addressInfo?.postalCode,
          address: addressInfo?.address,
          addressNumber: addressInfo?.addressNumber,
          complement: addressInfo?.complement,
          province: addressInfo?.province  // Bairro
        };
        
        console.log("Criando novo cliente no Asaas:", customerData);
        const newCustomer = await asaasService.createCustomer(customerData);
        customerId = newCustomer.id;
        console.log("Novo cliente criado:", newCustomer.id);
      }
      
      // 2. Criar o pagamento com as taxas customizadas
      const paymentData: AsaasPaymentRequest = {
        customer: customerId,
        billingType: billingType,
        value: parseFloat(value),
        dueDate: dueDate,
        description: description,
        externalReference: externalReference
      };
      
      // Adicionar dados do cartão de crédito quando for pagamento por cartão
      if (billingType === 'CREDIT_CARD' && creditCardData) {
        paymentData.creditCard = {
          holderName: creditCardData.holderName,
          number: creditCardData.number,
          expiryMonth: creditCardData.expiryMonth,
          expiryYear: creditCardData.expiryYear,
          ccv: creditCardData.ccv
        };
        
        paymentData.creditCardHolderInfo = {
          name: customerName,
          email: customerEmail || '',
          cpfCnpj: customerCpfCnpj,
          postalCode: addressInfo?.postalCode || '',
          addressNumber: addressInfo?.addressNumber || '',
          addressComplement: addressInfo?.complement,
          phone: customerPhone || ''
        };
      }
      
      console.log("Criando pagamento no Asaas:", JSON.stringify(paymentData, null, 2));
      const payment = await asaasService.createPayment(paymentData);
      console.log("Pagamento criado com sucesso:", payment.id);
      
      // 3. Se for uma venda, atualizar o registro da venda com o ID do pagamento
      if (externalReference && externalReference.startsWith('sale_')) {
        const saleId = externalReference.replace('sale_', '');
        if (saleId) {
          try {
            console.log(`Atualizando venda ${saleId} com ID de pagamento ${payment.id}`);
            await storage.updateSale(parseInt(saleId), { 
              asaasPaymentId: payment.id 
            });
          } catch (error) {
            console.warn(`Erro ao atualizar venda ${saleId} com ID de pagamento:`, error);
            // Continuar mesmo com erro na atualização da venda
          }
        }
      }
      
      res.status(201).json(payment);
    } catch (error) {
      console.error("Erro ao criar cobrança:", error);
      if (error instanceof Error) {
        console.error("Detalhes do erro:", error.message);
        if (error.cause) console.error("Causa:", error.cause);
        if (error.stack) console.error("Stack:", error.stack);
      }
      res.status(500).json({ message: "Erro ao criar cobrança no Asaas", error: String(error) });
    }
  });
  
  // Cancelar um pagamento
  app.delete("/api/asaas/payments/:id", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Autenticação necessária" });
      }
      
      const paymentId = req.params.id;
      const result = await asaasService.cancelPayment(paymentId);
      
      if (result.deleted) {
        res.status(200).json({ message: "Pagamento cancelado com sucesso" });
      } else {
        res.status(500).json({ message: "Não foi possível cancelar o pagamento" });
      }
    } catch (error) {
      console.error("Erro ao cancelar pagamento:", error);
      res.status(500).json({ message: "Erro ao cancelar pagamento no Asaas", error: String(error) });
    }
  });

  const httpServer = createServer(app);

  return httpServer;
}
