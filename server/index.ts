import express, { Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";

const app = express();

// Middleware para parse de JSON e dados de formulário
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Middleware de logging para todas as rotas da API
app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      log(logLine);
    }
  });

  next();
});

(async () => {
  // Registra todas as rotas da aplicação e retorna o httpServer (necessário para WebSocket)
  const server = await registerRoutes(app);

  // Rota básica de "keep-alive" para o Railway
  app.get("/", (_req: Request, res: Response) => {
    res.send("✅ Sistema Aprove Cars está rodando!");
  });

  // Middleware de tratamento global de erros
  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";
    res.status(status).json({ message });
    throw err;
  });

  // Vite só no modo desenvolvimento
  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app); // Em produção, serve os arquivos da build
  }

  // Porta padrão do Railway
  const port = parseInt(process.env.PORT || "5000", 10);
  server.listen(port, () => {
    log(`🚀 Servidor rodando na porta ${port}`);
  });
})();
