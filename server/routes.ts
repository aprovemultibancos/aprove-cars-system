import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth, hashPassword } from "./auth";
import { insertVehicleSchema, insertCustomerSchema, insertSaleSchema, insertFinancingSchema, insertExpenseSchema, insertPersonnelSchema, insertUserSchema, users as usersTable, InsertPayment } from "@shared/schema";
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
      
      const financing = await storage.createFinancing(financingData);
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

  // Schema de validação para pagamentos com coerção de tipos
  const paymentSchema = z.object({
    customerId: z.string(),
    customerName: z.string().optional(),
    description: z.string(),
    value: z.coerce.number().min(0.01),
    dueDate: z.coerce.date(),
    billingType: z.enum(["BOLETO", "PIX", "CREDIT_CARD"]),
    relatedSaleId: z.string().optional(),
    notes: z.string().optional(),
  });

  // Rotas de pagamento (integração com Asaas)
  // Listar pagamentos
  app.get("/api/payments", async (req, res) => {
    try {
      // Primeiro tenta buscar do Asaas
      try {
        const payments = await listPayments();
        res.json(payments);
      } catch (asaasError) {
        // Se falhar com Asaas, busca do banco de dados local
        console.error("Erro ao listar pagamentos do Asaas:", asaasError);
        console.log("Buscando pagamentos do banco de dados local");
        
        const localPayments = await storage.getPayments();
        res.json(localPayments);
      }
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
      console.log("Recebido no backend (pagamento):", JSON.stringify(req.body, null, 2));
      
      // Validação manual para debug
      console.log("Tipos dos campos recebidos:");
      Object.entries(req.body).forEach(([key, value]) => {
        console.log(`${key}: ${typeof value} => ${value}`);
      });
      
      // Validar dados do pagamento
      const paymentData = paymentSchema.parse(req.body);
      console.log("Dados após parse do schema:", JSON.stringify(paymentData, null, 2));
      
      const { customerId, description, value, dueDate, billingType, relatedSaleId, notes } = paymentData;

      // Preparar dados do cliente para o Asaas
      let asaasCustomerData: any;
      
      if (customerId === "manual") {
        // Cliente manual - usar nome fornecido no formulário
        const { customerName } = paymentData;
        if (!customerName) {
          return res.status(400).json({ message: "Nome do cliente é obrigatório para cliente manual" });
        }
        
        // Criar cliente temporário para o Asaas com dados mínimos
        asaasCustomerData = {
          name: customerName,
          cpfCnpj: "00000000000", // CPF genérico
        };
      } else {
        // Cliente do sistema - buscar dados completos
        const customer = await storage.getCustomer(parseInt(customerId));
        if (!customer) {
          return res.status(404).json({ message: "Cliente não encontrado" });
        }
        
        // Formatar cliente para o Asaas
        asaasCustomerData = formatCustomerForAsaas(customer);
      }
      
      // Formatar data para o formato esperado (YYYY-MM-DD)
      const formattedDueDate = dueDate instanceof Date 
        ? dueDate.toISOString().split('T')[0] 
        : new Date(dueDate).toISOString().split('T')[0];
      
      let payment;
      
      try {
        // Tentar criar ou obter cliente no Asaas
        const asaasCustomer = await createOrGetCustomer(asaasCustomerData);
  
        // Preparar dados do pagamento para o Asaas
        const asaasPaymentData = {
          customer: asaasCustomer.id,
          billingType: billingType as "BOLETO" | "CREDIT_CARD" | "PIX" | "UNDEFINED",
          value: value,
          dueDate: formattedDueDate,
          description: description,
          externalReference: relatedSaleId || undefined
        };
        
        console.log("Dados para o Asaas:", JSON.stringify(asaasPaymentData, null, 2));
  
        // Criar o pagamento no Asaas
        payment = await createPayment(asaasPaymentData);
        console.log("Pagamento criado com sucesso no Asaas:", payment);
      } catch (error) {
        console.log("Erro ao criar pagamento no Asaas. Criando pagamento local:", error);
        
        // Criar um pagamento local, já que o Asaas falhou
        payment = {
          id: `local-${Date.now()}`,
          customer: "local",
          value: value,
          netValue: value,
          description: description,
          billingType: billingType,
          status: "PENDING",
          dueDate: formattedDueDate,
          createdAt: new Date().toISOString(),
        };
      }
      
      // Adicionar informações do cliente ao pagamento
      let enrichedPayment;
      
      if (customerId === "manual") {
        // Para cliente manual, apenas adicionar o nome fornecido
        enrichedPayment = {
          ...payment,
          customerName: paymentData.customerName,
          customerDocumentNumber: "00000000000"
        };
      } else {
        // Para cliente do sistema, enriquecer com todos os dados
        const customer = await storage.getCustomer(parseInt(customerId));
        if (customer) {
          enrichedPayment = enrichPaymentWithCustomerInfo(payment, customer);
        } else {
          // Se não encontrar o cliente, apenas retornar o pagamento
          enrichedPayment = {
            ...payment,
            customerName: "Cliente não encontrado",
            customerDocumentNumber: ""
          };
        }
      }
      
      // Se o pagamento foi criado localmente, salve-o no banco de dados
      if (payment.id.startsWith('local-')) {
        try {
          // Prepare the payment data for the database
          const dbPayment: InsertPayment = {
            id: payment.id,
            customer: payment.customer,
            customerName: enrichedPayment.customerName,
            customerDocumentNumber: enrichedPayment.customerDocumentNumber || "00000000000",
            value: payment.value.toString(),
            netValue: payment.netValue.toString(),
            description: payment.description,
            billingType: payment.billingType,
            status: payment.status,
            dueDate: payment.dueDate,
            createdAt: payment.createdAt,
            isExternal: false,
            relatedSaleId: relatedSaleId
          };
          
          console.log("Salvando pagamento local no banco de dados:", dbPayment);
          const savedPayment = await storage.createPayment(dbPayment);
          console.log("Pagamento local salvo com sucesso:", savedPayment);
          enrichedPayment = savedPayment;
        } catch (dbError) {
          console.error("Erro ao salvar pagamento local no banco de dados:", dbError);
          // Continue with the response even if database saving fails
        }
      }

      res.status(201).json(enrichedPayment);
    } catch (error) {
      console.error("Erro ao criar pagamento:", error);
      if (error instanceof Error) {
        console.error("Detalhes do erro:", error.message);
        if (error.cause) console.error("Causa:", error.cause);
        if (error.stack) console.error("Stack:", error.stack);
      }
      res.status(400).json({ 
        message: "Dados inválidos", 
        error: error instanceof Error ? error.message : String(error) 
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
