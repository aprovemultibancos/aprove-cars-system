import type { Express } from "express";
import { createServer, type Server } from "http";
import { WebSocketServer } from 'ws';
import { storage } from "./storage";
import { setupAuth, hashPassword } from "./auth";
import { eq, and, sql, desc, asc, or, not, inArray } from "drizzle-orm";
import { 
  insertVehicleSchema, 
  insertCustomerSchema, 
  insertSaleSchema, 
  insertFinancingSchema, 
  insertExpenseSchema, 
  updateExpenseStatusSchema, 
  insertPersonnelSchema, 
  insertUserSchema, 
  users as usersTable,
  insertWhatsappConnectionSchema,
  insertWhatsappContactSchema,
  insertWhatsappGroupSchema,
  insertWhatsappTemplateSchema,
  insertWhatsappCampaignSchema,
  whatsappConnections,
  whatsappContacts,
  whatsappGroups,
  whatsappTemplates,
  whatsappCampaigns,
  whatsappGroupContacts,
  whatsappCampaignTargets
} from "@shared/schema";
import { db } from "./db";
import { z } from "zod";
import { asaasService, AsaasPaymentRequest, AsaasCustomerRequest, AsaasPaymentResponse, AsaasPaymentMethod, AsaasPaymentStatus } from "./services/asaas";
import { whatsappService } from "./services/whatsapp";
import { wppConnectServerService } from "./services/wppconnect-server";

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
  
  // Rota para definir a empresa atual para o Asaas
  app.post("/api/asaas/set-company", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Autenticação necessária" });
      }
      
      const { companyId } = req.body;
      
      if (!companyId) {
        return res.status(400).json({ message: "ID da empresa é obrigatório" });
      }
      
      const success = await asaasService.setCompany(parseInt(companyId));
      
      if (success) {
        res.json({ success: true, message: "Empresa selecionada com sucesso" });
      } else {
        res.status(404).json({ message: "Empresa não encontrada ou sem integração com Asaas" });
      }
    } catch (error) {
      console.error("Erro ao selecionar empresa:", error);
      res.status(500).json({ message: "Erro ao selecionar empresa para o Asaas" });
    }
  });
  
  // Rota para configurar a API do Asaas (para a empresa atual)
  app.post("/api/asaas/config", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Autenticação necessária" });
      }
      
      // Para segurança, somente administradores podem configurar a API
      if (req.user.role !== 'admin' && req.user.username !== 'administrador') {
        return res.status(403).json({ message: "Apenas administradores podem configurar a API" });
      }
      
      const { apiKey, walletId } = req.body;
      if (!apiKey) {
        return res.status(400).json({ message: "Chave de API é obrigatória" });
      }
      
      // Atualizar a chave de API no serviço para a empresa atual
      const success = await asaasService.updateApiKey(apiKey, undefined, walletId);
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
  
  // Rota para obter a configuração Asaas atual
  app.get("/api/asaas/config", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Autenticação necessária" });
      }
      
      // Verificar se há uma empresa configurada atualmente
      if (!asaasService.currentCompanyId) {
        return res.status(400).json({ message: "Nenhuma empresa selecionada" });
      }
      
      // Para segurança, somente administradores podem visualizar a configuração completa
      const isAdmin = req.user.role === 'admin' || req.user.username === 'administrador';
      
      // Buscar a configuração da empresa atual
      const config = await asaasService.getAsaasConfig(asaasService.currentCompanyId);
      
      if (config) {
        // Se não for admin, não mostrar a apiKey completa
        if (!isAdmin) {
          // Retornar apenas informações limitadas
          return res.json({
            companyId: config.companyId,
            mode: config.mode,
            walletId: config.walletId,
            hasApiKey: !!config.apiKey,
            apiKeyPreview: config.apiKey ? `${config.apiKey.substring(0, 6)}...` : null
          });
        }
        
        // Admin vê tudo
        return res.json(config);
      } else {
        return res.status(404).json({ message: "Configuração não encontrada" });
      }
    } catch (error) {
      console.error("Erro ao buscar configuração Asaas:", error);
      res.status(500).json({ message: "Erro ao buscar configuração do Asaas" });
    }
  });
  
  // Rota para configurar a API do Asaas para uma empresa específica
  app.post("/api/asaas/config/:companyId", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Autenticação necessária" });
      }
      
      // Para segurança, somente administradores podem configurar a API
      if (req.user.role !== 'admin' && req.user.username !== 'administrador') {
        return res.status(403).json({ message: "Apenas administradores podem configurar a API" });
      }
      
      const companyId = parseInt(req.params.companyId);
      const { apiKey, walletId } = req.body;
      
      if (!companyId) {
        return res.status(400).json({ message: "ID da empresa é obrigatório" });
      }
      
      if (!apiKey) {
        return res.status(400).json({ message: "Chave de API é obrigatória" });
      }
      
      // Atualizar a chave de API para a empresa específica, incluindo o walletId se fornecido
      const success = await asaasService.updateApiKey(apiKey, companyId, walletId);
      if (success) {
        return res.json({ success: true, message: "API configurada com sucesso para a empresa" });
      } else {
        return res.status(400).json({ message: "Não foi possível configurar a API para esta empresa" });
      }
    } catch (error) {
      console.error("Erro ao configurar API para empresa específica:", error);
      res.status(500).json({ message: "Erro ao configurar API do Asaas" });
    }
  });
  
  // Rota para obter a configuração Asaas de uma empresa
  app.get("/api/asaas/config/:companyId", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Autenticação necessária" });
      }
      
      // Para segurança, somente administradores podem visualizar a configuração completa
      const isAdmin = req.user.role === 'admin' || req.user.username === 'administrador';
      
      const companyId = parseInt(req.params.companyId);
      
      if (!companyId) {
        return res.status(400).json({ message: "ID da empresa é obrigatório" });
      }
      
      // Buscar a configuração
      const config = await asaasService.getAsaasConfig(companyId);
      
      if (config) {
        // Se não for admin, não mostrar a apiKey completa
        if (!isAdmin) {
          // Retornar apenas informações limitadas
          return res.json({
            companyId: config.companyId,
            mode: config.mode,
            walletId: config.walletId,
            hasApiKey: !!config.apiKey,
            apiKeyPreview: config.apiKey ? `${config.apiKey.substring(0, 6)}...` : null
          });
        }
        
        // Admin vê tudo
        return res.json(config);
      } else {
        return res.status(404).json({ message: "Configuração não encontrada para esta empresa" });
      }
    } catch (error) {
      console.error("Erro ao buscar configuração Asaas:", error);
      res.status(500).json({ message: "Erro ao buscar configuração do Asaas" });
    }
  });

  // Rota para listar clientes do Asaas
  app.get("/api/asaas/customers", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Autenticação necessária" });
      }
      
      const offset = parseInt(req.query.offset as string) || 0;
      const limit = parseInt(req.query.limit as string) || 10;
      const name = req.query.name as string;
      
      const customers = await asaasService.getCustomers(offset, limit, name);
      res.json(customers);
    } catch (error) {
      console.error("Erro ao listar clientes:", error);
      // Criar dados de demonstração
      const demoCustomers = createDemoCustomers(parseInt(req.query.limit as string) || 10);
      res.json({ data: demoCustomers, totalCount: 15 });
    }
  });
  
  // Rota para criar um novo cliente no Asaas
  app.post("/api/asaas/customers", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Autenticação necessária" });
      }
      
      console.log("Recebido no backend (Asaas Customer):", JSON.stringify(req.body, null, 2));
      
      const customerData: AsaasCustomerRequest = {
        name: req.body.name,
        cpfCnpj: req.body.cpfCnpj,
        email: req.body.email,
        phone: req.body.phone,
        mobilePhone: req.body.mobilePhone,
        address: req.body.address,
        addressNumber: req.body.addressNumber,
        complement: req.body.complement,
        province: req.body.province,
        postalCode: req.body.postalCode
      };
      
      // Verificar se já existe um cliente com este CPF/CNPJ
      const existingCustomer = await asaasService.findCustomerByCpfCnpj(customerData.cpfCnpj);
      
      if (existingCustomer) {
        return res.status(400).json({
          message: "Já existe um cliente com este CPF/CNPJ", 
          customer: existingCustomer
        });
      }
      
      // Criar o cliente no Asaas
      const customer = await asaasService.createCustomer(customerData);
      console.log("Cliente criado com sucesso:", customer.id);
      
      res.status(201).json(customer);
    } catch (error) {
      console.error("Erro ao criar cliente:", error);
      
      // Se estiver no modo de demonstração, criar um cliente demo
      if (asaasService.inDemoMode) {
        const demoId = `demo_customer_${Math.floor(Math.random() * 1000)}`;
        const demoCustomer = {
          id: demoId,
          name: req.body.name,
          cpfCnpj: req.body.cpfCnpj,
          email: req.body.email,
          phone: req.body.phone,
          mobilePhone: req.body.mobilePhone,
          address: req.body.address,
          addressNumber: req.body.addressNumber,
          complement: req.body.complement,
          province: req.body.province,
          postalCode: req.body.postalCode,
          deleted: false,
          createdAt: new Date().toISOString()
        };
        
        res.status(201).json(demoCustomer);
      } else {
        res.status(500).json({ message: "Erro ao criar cliente no Asaas", error: String(error) });
      }
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
      // Criar dados de demonstração
      const demoPayments = createDemoPayments(parseInt(req.query.limit as string) || 10);
      res.json({ data: demoPayments, totalCount: 25 });
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

  // Função para criar pagamentos de demonstração
  function createDemoPayments(limit: number): AsaasPaymentResponse[] {
    const payments: AsaasPaymentResponse[] = [];
    const descriptions = [
      "Pagamento do veículo GM Celta",
      "Financiamento Strada Working",
      "Entrada parcial Toyota Corolla",
      "Pagamento do Honda Civic",
      "Parcela financiamento Hyundai HB20",
      "Seguro veicular Fiat Uno",
      "Documentação VW Gol",
      "Entrada Honda Fit",
      "Parcela Nissan Versa",
      "Pagamento do Jeep Renegade"
    ];
    
    const metodos: AsaasPaymentMethod[] = ['BOLETO', 'CREDIT_CARD', 'PIX'];
    const status: AsaasPaymentStatus[] = ['PENDING', 'CONFIRMED', 'RECEIVED', 'OVERDUE', 'REFUNDED', 'CANCELED'];
    
    const hoje = new Date();
    const umMesAtras = new Date(hoje);
    umMesAtras.setMonth(hoje.getMonth() - 1);
    
    for (let i = 0; i < limit; i++) {
      const metodoPagamento = metodos[i % metodos.length];
      const statusPagamento = status[i % status.length];
      const descriptionIndex = i < descriptions.length ? i : i % descriptions.length;
      
      // Data de criação entre -30 e 0 dias
      const dataCriacao = new Date(umMesAtras.getTime() + Math.random() * (hoje.getTime() - umMesAtras.getTime()));
      
      // Data de vencimento entre -15 e +15 dias a partir de hoje
      const dataVencimento = new Date(hoje);
      dataVencimento.setDate(hoje.getDate() - 15 + Math.floor(Math.random() * 30));
      
      // Valor entre R$ 500 e R$ 5000
      const valor = Math.floor(500 + Math.random() * 4500);
      
      const payment: AsaasPaymentResponse = {
        id: `demo_payment_${i + 1}`,
        dateCreated: dataCriacao.toISOString(),
        customer: `demo_customer_${(i % 16) + 1}`,
        value: valor,
        netValue: valor * 0.97, // Valor líquido após taxas
        billingType: metodoPagamento,
        status: statusPagamento,
        dueDate: dataVencimento.toISOString().split('T')[0],
        description: descriptions[descriptionIndex],
        invoiceUrl: `https://sandbox.asaas.com/i/${i}abc123`,
        bankSlipUrl: metodoPagamento === 'BOLETO' ? `https://sandbox.asaas.com/b/${i}abc123` : '',
        invoiceNumber: `${100000 + i}`,
        externalReference: `sale_${i + 1}`,
        deleted: false
      };
      
      // Adicionar informações específicas para PIX
      if (metodoPagamento === 'PIX') {
        payment.pixQrCodeImage = `https://sandbox.asaas.com/pixqrcode/${i}abc123`;
        payment.pixCopiaECola = `00020101021226890014br.gov.bcb.pix2567invoice.asaas.com/pix/abcdefghijklmnopqrst52045802BR5925ASAAS PAGAMENTOS LTDA6009SAO PAULO62070503***63041234`;
      }
      
      payments.push(payment);
    }
    
    return payments;
  }
  
  // Função para criar clientes de demonstração
  function createDemoCustomers(limit: number) {
    const customers = [];
    const nomes = [
      "João Silva", "Maria Oliveira", "Carlos Santos", "Ana Pereira", 
      "Ricardo Ferreira", "Juliana Costa", "Fernando Almeida", "Camila Rodrigues",
      "Pedro Souza", "Mariana Lima", "Luiz Gomes", "Patrícia Ribeiro",
      "André Carvalho", "Bianca Martins", "Marcos Barbosa", "Daniela Teixeira"
    ];
    
    for (let i = 0; i < limit; i++) {
      const id = i < nomes.length ? i : i % nomes.length;
      customers.push({
        id: `demo_customer_${id + 1}`,
        name: nomes[id],
        cpfCnpj: `${100000000 + id}${id.toString().padStart(2, '0')}`,
        email: `${nomes[id].split(' ')[0].toLowerCase()}@email.com`,
        phone: `(11) 9${9000 + id}-${1000 + id}`,
        mobilePhone: `(11) 9${9000 + id}-${1000 + id}`,
        address: `Rua das Flores, ${100 + id}`,
        addressNumber: (100 + id).toString(),
        complement: id % 3 === 0 ? "Apto 10" : "",
        province: "Centro",
        postalCode: `01000-${100 + id}`,
        deleted: false,
        createdAt: new Date(Date.now() - (id * 86400000)).toISOString()
      });
    }
    
    return customers;
  }

  // WhatsApp routes
  // Rotas para conexões WhatsApp
  app.get("/api/whatsapp/connections", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Autenticação necessária" });
      }
      
      const connections = await db.select().from(whatsappConnections);
      res.json(connections);
    } catch (error) {
      console.error("Erro ao buscar conexões WhatsApp:", error);
      res.status(500).json({ message: "Erro ao buscar conexões WhatsApp", error: String(error) });
    }
  });

  app.get("/api/whatsapp/connections/:id", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Autenticação necessária" });
      }
      
      const id = parseInt(req.params.id);
      const [connection] = await db.select().from(whatsappConnections).where(eq(whatsappConnections.id, id));
      
      if (!connection) {
        return res.status(404).json({ message: "Conexão não encontrada" });
      }
      
      // Verificar status atual da conexão no serviço
      const handler = whatsappService.getConnection(id);
      if (handler) {
        // Atualizar os dados com informações em tempo real
        connection.status = handler.getStatus() as any; // Cast para lidar com o tipo
        connection.qrCode = handler.getQrCode();
      }
      
      // Verificar status no WPPConnect Server se estiver disponível
      try {
        const sessionName = `session-${connection.id}`;
        const serverStatus = await wppConnectServerService.getSessionStatus(sessionName);
        
        // Atualizar status se o WPPConnect Server tiver informações mais recentes
        if (serverStatus === 'CONNECTED' && connection.status !== 'connected') {
          connection.status = 'connected';
          // Atualizar no banco de dados
          await db.update(whatsappConnections)
            .set({ status: "connected" })
            .where(eq(whatsappConnections.id, id));
        }
      } catch (e) {
        // Silenciosamente falha se o WPPConnect Server não estiver disponível
        console.log('WPPConnect Server não disponível para verificar status:', e);
      }
      
      res.json(connection);
    } catch (error) {
      console.error("Erro ao buscar conexão WhatsApp:", error);
      res.status(500).json({ message: "Erro ao buscar conexão WhatsApp", error: String(error) });
    }
  });
  
  // Rotas específicas para o WPPConnect Server
  app.get("/api/whatsapp/connections/:id/qrcode", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Autenticação necessária" });
      }
      
      const id = parseInt(req.params.id);
      const [connection] = await db.select().from(whatsappConnections).where(eq(whatsappConnections.id, id));
      
      if (!connection) {
        return res.status(404).json({ message: "Conexão não encontrada" });
      }
      
      // Obtenção do QR code usando o WPPConnect Server
      const sessionName = `session-${connection.id}`;
      const qrCode = await wppConnectServerService.getQrCode(sessionName);
      
      if (!qrCode) {
        // Se não houver QR code, verificar se já está conectado
        const status = await wppConnectServerService.getSessionStatus(sessionName);
        
        if (status === 'CONNECTED') {
          return res.json({ connected: true, message: "Sessão já está conectada" });
        }
        
        return res.status(404).json({ message: "QR Code não disponível. Tente iniciar a sessão primeiro." });
      }
      
      // Atualizar o QR code no banco de dados
      await db.update(whatsappConnections)
        .set({ qrCode })
        .where(eq(whatsappConnections.id, id));
      
      res.json({ qrCode });
    } catch (error) {
      console.error("Erro ao obter QR Code:", error);
      res.status(500).json({ message: "Erro ao obter QR Code", error: String(error) });
    }
  });
  
  app.get("/api/whatsapp/connections/:id/status", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Autenticação necessária" });
      }
      
      const id = parseInt(req.params.id);
      const [connection] = await db.select().from(whatsappConnections).where(eq(whatsappConnections.id, id));
      
      if (!connection) {
        return res.status(404).json({ message: "Conexão não encontrada" });
      }
      
      // Obtenção do status usando o WPPConnect Server
      const sessionName = `session-${connection.id}`;
      const status = await wppConnectServerService.getSessionStatus(sessionName);
      
      // Mapear o status do WPPConnect para o formato do nosso banco
      let mappedStatus: "connected" | "disconnected" | "connecting" = "disconnected";
      
      if (status === 'CONNECTED') {
        mappedStatus = "connected";
      } else if (status === 'QRCODE' || status === 'STARTING') {
        mappedStatus = "connecting";
      }
      
      // Atualizar o status no banco de dados
      await db.update(whatsappConnections)
        .set({ status: mappedStatus })
        .where(eq(whatsappConnections.id, id));
      
      res.json({ 
        status, 
        mappedStatus,
        description: status === 'CONNECTED' ? 'Conectado ao WhatsApp' : 
                    status === 'DISCONNECTED' ? 'Desconectado do WhatsApp' :
                    status === 'QRCODE' ? 'Aguardando escaneamento do QR Code' :
                    status === 'STARTING' ? 'Iniciando conexão' : 'Status desconhecido'
      });
    } catch (error) {
      console.error("Erro ao obter status da sessão:", error);
      res.status(500).json({ message: "Erro ao obter status da sessão", error: String(error) });
    }
  });

  app.post("/api/whatsapp/connections", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Autenticação necessária" });
      }
      
      // Validar dados
      const connectionData = insertWhatsappConnectionSchema.parse(req.body);
      
      // Inserir no banco de dados
      const [newConnection] = await db.insert(whatsappConnections).values(connectionData).returning();
      
      // Registrar no serviço WhatsApp
      whatsappService.registerConnection(newConnection);
      
      res.status(201).json(newConnection);
    } catch (error) {
      console.error("Erro ao criar conexão WhatsApp:", error);
      res.status(400).json({ message: "Dados inválidos", error: String(error) });
    }
  });

  app.delete("/api/whatsapp/connections/:id", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Autenticação necessária" });
      }
      
      const id = parseInt(req.params.id);
      
      // Remover do serviço WhatsApp
      whatsappService.removeConnection(id);
      
      // Remover do banco de dados
      await db.delete(whatsappConnections).where(eq(whatsappConnections.id, id));
      
      res.status(204).end();
    } catch (error) {
      console.error("Erro ao excluir conexão WhatsApp:", error);
      res.status(500).json({ message: "Erro ao excluir conexão WhatsApp", error: String(error) });
    }
  });

  app.post("/api/whatsapp/connections/:id/connect", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Autenticação necessária" });
      }
      
      const id = parseInt(req.params.id);
      const [connection] = await db.select().from(whatsappConnections).where(eq(whatsappConnections.id, id));
      
      if (!connection) {
        return res.status(404).json({ message: "Conexão não encontrada" });
      }
      
      // Configurar nome da sessão para o WPPConnect Server
      const sessionName = `session-${connection.id}`;
      
      // Iniciar a sessão no WPPConnect Server
      const success = await wppConnectServerService.startSession(sessionName);
      
      if (!success) {
        return res.status(500).json({ message: "Erro ao iniciar sessão no WPPConnect Server" });
      }
      
      // Atualizar status no banco de dados
      await db.update(whatsappConnections)
        .set({ status: "connecting" })
        .where(eq(whatsappConnections.id, id));
      
      // Obter ou criar o handler para essa conexão também
      // para compatibilidade com o código existente
      const handler = whatsappService.registerConnection(connection);
      handler.connect();
      
      res.json({ 
        message: "Conexão iniciada", 
        status: "connecting",
        next: "Escaneie o QR code para conectar ao WhatsApp",
        sessionName
      });
    } catch (error) {
      console.error("Erro ao conectar WhatsApp:", error);
      res.status(500).json({ message: "Erro ao conectar WhatsApp", error: String(error) });
    }
  });

  app.post("/api/whatsapp/connections/:id/disconnect", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Autenticação necessária" });
      }
      
      const id = parseInt(req.params.id);
      
      // Obter a conexão do banco de dados
      const [connection] = await db.select().from(whatsappConnections).where(eq(whatsappConnections.id, id));
      
      if (!connection) {
        return res.status(404).json({ message: "Conexão não encontrada" });
      }
      
      // Configurar nome da sessão para o WPPConnect Server
      const sessionName = `session-${connection.id}`;
      
      // Fechar a sessão no WPPConnect Server
      await wppConnectServerService.closeSession(sessionName);
      
      // Para compatibilidade com o código existente, também desconectar pelo handler
      const handler = whatsappService.getConnection(id);
      if (handler) {
        handler.disconnect();
      }
      
      // Atualizar status no banco de dados
      await db.update(whatsappConnections)
        .set({ status: "disconnected" })
        .where(eq(whatsappConnections.id, id));
      
      res.json({ message: "Desconectado com sucesso" });
    } catch (error) {
      console.error("Erro ao desconectar WhatsApp:", error);
      res.status(500).json({ message: "Erro ao desconectar WhatsApp", error: String(error) });
    }
  });

  // Rotas para contatos WhatsApp
  app.get("/api/whatsapp/contacts", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Autenticação necessária" });
      }
      
      const contacts = await db.select().from(whatsappContacts);
      res.json(contacts);
    } catch (error) {
      console.error("Erro ao buscar contatos WhatsApp:", error);
      res.status(500).json({ message: "Erro ao buscar contatos WhatsApp", error: String(error) });
    }
  });

  app.post("/api/whatsapp/contacts", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Autenticação necessária" });
      }
      
      // Validar dados
      const contactData = insertWhatsappContactSchema.parse(req.body);
      
      // Inserir no banco de dados
      const [newContact] = await db.insert(whatsappContacts).values(contactData).returning();
      
      res.status(201).json(newContact);
    } catch (error) {
      console.error("Erro ao criar contato WhatsApp:", error);
      res.status(400).json({ message: "Dados inválidos", error: String(error) });
    }
  });

  app.get("/api/whatsapp/contacts/:id", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Autenticação necessária" });
      }
      
      const id = parseInt(req.params.id);
      const [contact] = await db.select().from(whatsappContacts).where(({ id: contactId }) => contactId.equals(id));
      
      if (!contact) {
        return res.status(404).json({ message: "Contato não encontrado" });
      }
      
      res.json(contact);
    } catch (error) {
      console.error("Erro ao buscar contato WhatsApp:", error);
      res.status(500).json({ message: "Erro ao buscar contato WhatsApp", error: String(error) });
    }
  });

  app.delete("/api/whatsapp/contacts/:id", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Autenticação necessária" });
      }
      
      const id = parseInt(req.params.id);
      
      // Remover do banco de dados
      await db.delete(whatsappContacts).where(({ id: contactId }) => contactId.equals(id));
      
      res.status(204).end();
    } catch (error) {
      console.error("Erro ao excluir contato WhatsApp:", error);
      res.status(500).json({ message: "Erro ao excluir contato WhatsApp", error: String(error) });
    }
  });

  // Rotas para grupos WhatsApp
  app.get("/api/whatsapp/groups", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Autenticação necessária" });
      }
      
      const groups = await db.select().from(whatsappGroups);
      res.json(groups);
    } catch (error) {
      console.error("Erro ao buscar grupos WhatsApp:", error);
      res.status(500).json({ message: "Erro ao buscar grupos WhatsApp", error: String(error) });
    }
  });

  app.post("/api/whatsapp/groups", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Autenticação necessária" });
      }
      
      // Validar dados
      const groupData = insertWhatsappGroupSchema.parse(req.body);
      
      // Inserir no banco de dados
      const [newGroup] = await db.insert(whatsappGroups).values(groupData).returning();
      
      res.status(201).json(newGroup);
    } catch (error) {
      console.error("Erro ao criar grupo WhatsApp:", error);
      res.status(400).json({ message: "Dados inválidos", error: String(error) });
    }
  });

  app.get("/api/whatsapp/groups/:id", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Autenticação necessária" });
      }
      
      const id = parseInt(req.params.id);
      const [group] = await db.select().from(whatsappGroups).where(({ id: groupId }) => groupId.equals(id));
      
      if (!group) {
        return res.status(404).json({ message: "Grupo não encontrado" });
      }
      
      // Buscar os contatos associados a este grupo
      const groupContacts = await db
        .select({
          id: whatsappGroupContacts.id,
          contactId: whatsappGroupContacts.contactId
        })
        .from(whatsappGroupContacts)
        .where(({ groupId: gId }) => gId.equals(id));
      
      // Buscar os detalhes completos dos contatos
      const contactIds = groupContacts.map(gc => gc.contactId);
      const contacts = contactIds.length > 0 
        ? await db.select().from(whatsappContacts).where(({ id: contactId }) => contactId.in(contactIds))
        : [];
      
      res.json({
        ...group,
        contacts
      });
    } catch (error) {
      console.error("Erro ao buscar grupo WhatsApp:", error);
      res.status(500).json({ message: "Erro ao buscar grupo WhatsApp", error: String(error) });
    }
  });

  app.post("/api/whatsapp/groups/:id/contacts", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Autenticação necessária" });
      }
      
      const groupId = parseInt(req.params.id);
      const { contactIds } = req.body;
      
      if (!Array.isArray(contactIds) || contactIds.length === 0) {
        return res.status(400).json({ message: "Lista de IDs de contatos inválida" });
      }
      
      // Verificar se o grupo existe
      const [group] = await db.select().from(whatsappGroups).where(({ id }) => id.equals(groupId));
      if (!group) {
        return res.status(404).json({ message: "Grupo não encontrado" });
      }
      
      // Adicionar cada contato ao grupo
      const insertData = contactIds.map(contactId => ({
        groupId,
        contactId: parseInt(contactId)
      }));
      
      // Inserir as associações
      await db.insert(whatsappGroupContacts).values(insertData);
      
      // Atualizar o contador de contatos do grupo
      const [count] = await db
        .select({ count: db.fn.count() })
        .from(whatsappGroupContacts)
        .where(({ groupId: gId }) => gId.equals(groupId));
      
      await db.update(whatsappGroups)
        .set({ totalContacts: parseInt(count.count.toString()) })
        .where(({ id }) => id.equals(groupId));
      
      res.status(201).json({ message: "Contatos adicionados ao grupo" });
    } catch (error) {
      console.error("Erro ao adicionar contatos ao grupo:", error);
      res.status(500).json({ message: "Erro ao adicionar contatos ao grupo", error: String(error) });
    }
  });

  app.delete("/api/whatsapp/groups/:id", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Autenticação necessária" });
      }
      
      const id = parseInt(req.params.id);
      
      // Remover todas as associações com contatos
      await db.delete(whatsappGroupContacts).where(({ groupId }) => groupId.equals(id));
      
      // Remover o grupo
      await db.delete(whatsappGroups).where(({ id: groupId }) => groupId.equals(id));
      
      res.status(204).end();
    } catch (error) {
      console.error("Erro ao excluir grupo WhatsApp:", error);
      res.status(500).json({ message: "Erro ao excluir grupo WhatsApp", error: String(error) });
    }
  });

  // Rotas para templates WhatsApp
  app.get("/api/whatsapp/templates", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Autenticação necessária" });
      }
      
      const templates = await db.select().from(whatsappTemplates);
      res.json(templates);
    } catch (error) {
      console.error("Erro ao buscar templates WhatsApp:", error);
      res.status(500).json({ message: "Erro ao buscar templates WhatsApp", error: String(error) });
    }
  });

  app.post("/api/whatsapp/templates", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Autenticação necessária" });
      }
      
      // Validar dados
      const templateData = insertWhatsappTemplateSchema.parse(req.body);
      
      // Inserir no banco de dados
      const [newTemplate] = await db.insert(whatsappTemplates).values(templateData).returning();
      
      res.status(201).json(newTemplate);
    } catch (error) {
      console.error("Erro ao criar template WhatsApp:", error);
      res.status(400).json({ message: "Dados inválidos", error: String(error) });
    }
  });

  app.get("/api/whatsapp/templates/:id", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Autenticação necessária" });
      }
      
      const id = parseInt(req.params.id);
      const [template] = await db.select().from(whatsappTemplates).where(({ id: templateId }) => templateId.equals(id));
      
      if (!template) {
        return res.status(404).json({ message: "Template não encontrado" });
      }
      
      res.json(template);
    } catch (error) {
      console.error("Erro ao buscar template WhatsApp:", error);
      res.status(500).json({ message: "Erro ao buscar template WhatsApp", error: String(error) });
    }
  });

  app.delete("/api/whatsapp/templates/:id", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Autenticação necessária" });
      }
      
      const id = parseInt(req.params.id);
      
      // Remover o template
      await db.delete(whatsappTemplates).where(({ id: templateId }) => templateId.equals(id));
      
      res.status(204).end();
    } catch (error) {
      console.error("Erro ao excluir template WhatsApp:", error);
      res.status(500).json({ message: "Erro ao excluir template WhatsApp", error: String(error) });
    }
  });
  
  // Rota para enviar mensagem de texto via WPPConnect Server
  app.post("/api/whatsapp/connections/:id/send-message", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Autenticação necessária" });
      }
      
      const id = parseInt(req.params.id);
      const { phone, message } = req.body;
      
      if (!phone || !message) {
        return res.status(400).json({ message: "Número de telefone e mensagem são obrigatórios" });
      }
      
      // Obter a conexão do banco de dados
      const [connection] = await db.select().from(whatsappConnections).where(eq(whatsappConnections.id, id));
      
      if (!connection) {
        return res.status(404).json({ message: "Conexão não encontrada" });
      }
      
      // Verificar se a conexão está ativa
      const sessionName = `session-${connection.id}`;
      const status = await wppConnectServerService.getSessionStatus(sessionName);
      
      if (status !== 'CONNECTED') {
        return res.status(400).json({ 
          message: "Conexão não está ativa", 
          status,
          suggestion: "Escaneie o QR code para se conectar ao WhatsApp Web"
        });
      }
      
      // Enviar mensagem
      const success = await wppConnectServerService.sendMessage(sessionName, phone, message);
      
      if (!success) {
        return res.status(500).json({ message: "Erro ao enviar mensagem" });
      }
      
      res.json({ success: true, message: "Mensagem enviada com sucesso" });
    } catch (error) {
      console.error("Erro ao enviar mensagem WhatsApp:", error);
      res.status(500).json({ message: "Erro ao enviar mensagem WhatsApp", error: String(error) });
    }
  });
  
  // Rota para enviar arquivo através do WPPConnect Server
  app.post("/api/whatsapp/connections/:id/send-file", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Autenticação necessária" });
      }
      
      const id = parseInt(req.params.id);
      const { phone, path, filename, caption } = req.body;
      
      if (!phone || !path) {
        return res.status(400).json({ message: "Número de telefone e URL do arquivo são obrigatórios" });
      }
      
      // Obter a conexão do banco de dados
      const [connection] = await db.select().from(whatsappConnections).where(eq(whatsappConnections.id, id));
      
      if (!connection) {
        return res.status(404).json({ message: "Conexão não encontrada" });
      }
      
      // Verificar se a conexão está ativa
      const sessionName = `session-${connection.id}`;
      const status = await wppConnectServerService.getSessionStatus(sessionName);
      
      if (status !== 'CONNECTED') {
        return res.status(400).json({ 
          message: "Conexão não está ativa", 
          status,
          suggestion: "Escaneie o QR code para se conectar ao WhatsApp Web"
        });
      }
      
      // Enviar arquivo
      const success = await wppConnectServerService.sendFile(
        sessionName, 
        phone, 
        path, 
        filename || undefined, 
        caption || undefined
      );
      
      if (!success) {
        return res.status(500).json({ message: "Erro ao enviar arquivo" });
      }
      
      res.json({ success: true, message: "Arquivo enviado com sucesso" });
    } catch (error) {
      console.error("Erro ao enviar arquivo WhatsApp:", error);
      res.status(500).json({ message: "Erro ao enviar arquivo WhatsApp", error: String(error) });
    }
  });

  // Rotas para campanhas WhatsApp
  app.get("/api/whatsapp/campaigns", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Autenticação necessária" });
      }
      
      const campaigns = await db.select().from(whatsappCampaigns);
      res.json(campaigns);
    } catch (error) {
      console.error("Erro ao buscar campanhas WhatsApp:", error);
      res.status(500).json({ message: "Erro ao buscar campanhas WhatsApp", error: String(error) });
    }
  });

  app.post("/api/whatsapp/campaigns", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Autenticação necessária" });
      }
      
      // Validar dados
      const campaignData = insertWhatsappCampaignSchema.parse(req.body);
      
      // Inserir no banco de dados
      const [newCampaign] = await db.insert(whatsappCampaigns).values(campaignData).returning();
      
      res.status(201).json(newCampaign);
    } catch (error) {
      console.error("Erro ao criar campanha WhatsApp:", error);
      res.status(400).json({ message: "Dados inválidos", error: String(error) });
    }
  });

  app.get("/api/whatsapp/campaigns/:id", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Autenticação necessária" });
      }
      
      const id = parseInt(req.params.id);
      const [campaign] = await db.select().from(whatsappCampaigns).where(({ id: campaignId }) => campaignId.equals(id));
      
      if (!campaign) {
        return res.status(404).json({ message: "Campanha não encontrada" });
      }
      
      // Buscar os alvos da campanha
      const targets = await db
        .select()
        .from(whatsappCampaignTargets)
        .where(({ campaignId }) => campaignId.equals(id));
      
      // Buscar o template associado
      const [template] = await db
        .select()
        .from(whatsappTemplates)
        .where(({ id: templateId }) => templateId.equals(campaign.templateId));
      
      res.json({
        ...campaign,
        targets,
        template
      });
    } catch (error) {
      console.error("Erro ao buscar campanha WhatsApp:", error);
      res.status(500).json({ message: "Erro ao buscar campanha WhatsApp", error: String(error) });
    }
  });

  app.post("/api/whatsapp/campaigns/:id/start", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Autenticação necessária" });
      }
      
      const id = parseInt(req.params.id);
      
      // Buscar a campanha
      const [campaign] = await db.select().from(whatsappCampaigns).where(({ id: campaignId }) => campaignId.equals(id));
      if (!campaign) {
        return res.status(404).json({ message: "Campanha não encontrada" });
      }
      
      // Verificar se a campanha já está em andamento
      if (campaign.status === 'in_progress') {
        return res.status(400).json({ message: "Campanha já está em andamento" });
      }
      
      // Buscar o template
      const [template] = await db
        .select()
        .from(whatsappTemplates)
        .where(({ id: templateId }) => templateId.equals(campaign.templateId));
      
      if (!template) {
        return res.status(404).json({ message: "Template da campanha não encontrado" });
      }
      
      // Buscar contatos ou grupo
      let contacts: any[] = [];
      
      // Se a campanha tem alvos específicos (contatos individuais ou grupos)
      const targets = await db
        .select()
        .from(whatsappCampaignTargets)
        .where(({ campaignId }) => campaignId.equals(id));
      
      if (targets.length > 0) {
        // Buscar contatos dos grupos referenciados
        const groupIds = targets
          .filter(t => t.groupId)
          .map(t => t.groupId);
        
        if (groupIds.length > 0) {
          // Buscar todos os contatos associados a esses grupos
          const groupContacts = await db
            .select({ contactId: whatsappGroupContacts.contactId })
            .from(whatsappGroupContacts)
            .where(({ groupId }) => groupId.in(groupIds));
          
          const contactIds = groupContacts.map(gc => gc.contactId);
          
          // Buscar detalhes completos dos contatos
          if (contactIds.length > 0) {
            const groupContactsDetails = await db
              .select()
              .from(whatsappContacts)
              .where(({ id }) => id.in(contactIds));
            
            contacts = [...contacts, ...groupContactsDetails];
          }
        }
        
        // Buscar contatos individuais
        const contactIds = targets
          .filter(t => t.contactId)
          .map(t => t.contactId);
        
        if (contactIds.length > 0) {
          const individualContacts = await db
            .select()
            .from(whatsappContacts)
            .where(({ id }) => id.in(contactIds));
          
          contacts = [...contacts, ...individualContacts];
        }
      } else {
        // Se não tem alvos específicos, enviar para todos os contatos
        contacts = await db.select().from(whatsappContacts);
      }
      
      // Verificar se temos contatos para enviar
      if (contacts.length === 0) {
        return res.status(400).json({ message: "Nenhum contato disponível para esta campanha" });
      }
      
      // Iniciar o envio em segundo plano
      const connectionId = campaign.connectionId;
      
      // Atualizar status da campanha
      await db.update(whatsappCampaigns)
        .set({ 
          status: 'in_progress',
          totalContacts: contacts.length
        })
        .where(({ id: campaignId }) => campaignId.equals(id));
      
      // Iniciar o envio em segundo plano (não aguardamos a conclusão)
      whatsappService.sendCampaign(campaign, template, contacts, connectionId);
      
      res.json({ 
        message: "Campanha iniciada", 
        totalContacts: contacts.length 
      });
    } catch (error) {
      console.error("Erro ao iniciar campanha:", error);
      res.status(500).json({ message: "Erro ao iniciar campanha", error: String(error) });
    }
  });

  app.post("/api/whatsapp/campaigns/:id/stop", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Autenticação necessária" });
      }
      
      const id = parseInt(req.params.id);
      
      // Atualizar status da campanha
      await db.update(whatsappCampaigns)
        .set({ status: 'canceled' })
        .where(({ id: campaignId }) => campaignId.equals(id));
      
      // Nota: Precisaríamos implementar um mecanismo para parar o envio em andamento
      // Para isso, seria necessário manter um controle das campanhas em andamento no serviço
      
      res.json({ message: "Campanha interrompida" });
    } catch (error) {
      console.error("Erro ao interromper campanha:", error);
      res.status(500).json({ message: "Erro ao interromper campanha", error: String(error) });
    }
  });

  app.delete("/api/whatsapp/campaigns/:id", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Autenticação necessária" });
      }
      
      const id = parseInt(req.params.id);
      
      // Remover todos os alvos da campanha
      await db.delete(whatsappCampaignTargets).where(({ campaignId }) => campaignId.equals(id));
      
      // Remover a campanha
      await db.delete(whatsappCampaigns).where(({ id: campaignId }) => campaignId.equals(id));
      
      res.status(204).end();
    } catch (error) {
      console.error("Erro ao excluir campanha WhatsApp:", error);
      res.status(500).json({ message: "Erro ao excluir campanha WhatsApp", error: String(error) });
    }
  });

  // Rota para envio direto de mensagem (single)
  app.post("/api/whatsapp/send", async (req, res) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "Autenticação necessária" });
      }
      
      const { connectionId, to, content, type, mediaUrl, caption, filename } = req.body;
      
      if (!connectionId || !to || !content) {
        return res.status(400).json({ message: "Dados incompletos. Forneça connectionId, to e content" });
      }
      
      // Verificar se é uma conexão válida
      const connection = whatsappService.getConnection(connectionId);
      if (!connection) {
        return res.status(404).json({ message: "Conexão não encontrada ou não iniciada" });
      }
      
      let messageId: string | null;
      
      // Enviar mensagem com base no tipo
      if (type === 'image' && mediaUrl) {
        messageId = await whatsappService.sendImageMessage(connectionId, to, mediaUrl, caption || content);
      } else if (type === 'document' && mediaUrl) {
        messageId = await whatsappService.sendDocumentMessage(connectionId, to, mediaUrl, filename || 'documento.pdf');
      } else {
        // Padrão é mensagem de texto
        messageId = await whatsappService.sendTextMessage(connectionId, to, content);
      }
      
      if (!messageId) {
        return res.status(500).json({ message: "Falha ao enviar mensagem" });
      }
      
      res.json({ 
        message: "Mensagem enviada com sucesso",
        messageId
      });
    } catch (error) {
      console.error("Erro ao enviar mensagem:", error);
      res.status(500).json({ message: "Erro ao enviar mensagem", error: String(error) });
    }
  });

  // Configuração do WebSocket Server
  const httpServer = createServer(app);
  const wss = new WebSocketServer({ server: httpServer, path: '/ws' });
  
  // Eventos do WebSocket
  wss.on('connection', (ws) => {
    console.log('Cliente WebSocket conectado');
    
    ws.on('message', (message) => {
      try {
        const data = JSON.parse(message.toString());
        console.log('Mensagem recebida:', data);
        
        // Implementar lógica de processamento de mensagens
        // Poderia ser autenticação, atualização de status, etc.
      } catch (error) {
        console.error('Erro ao processar mensagem WebSocket:', error);
      }
    });
    
    ws.on('close', () => {
      console.log('Cliente WebSocket desconectado');
    });
    
    // Enviar um evento de conexão inicial
    ws.send(JSON.stringify({ type: 'connected', timestamp: Date.now() }));
  });

  return httpServer;
}
