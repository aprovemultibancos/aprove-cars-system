import express, { Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import dotenv from "dotenv";

dotenv.config();

const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: false }));

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

// Rota básica de saúde
app.get("/", (_req: Request, res: Response) => {
  res.send("✅ Sistema Aprove Cars está rodando!");
});

(async () => {
  const server = await registerRoutes(app);

  // Middleware de erro
  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";
    res.status(status).json({ message });
    throw err;
  });

  // Ambiente de produção ou desenvolvimento
  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  const port = parseInt(process.env.PORT || "5000", 10);

  // Escuta em 0.0.0.0 para o Railway funcionar
  server.listen(port, '0.0.0.0', () => {
    log(`🚀 Servidor rodando na porta ${port}`);
  });
})();

// Keep-alive para o Railway
setInterval(() => {
  fetch("https://aprove-cars-system-production.up.railway.app/")
    .then(res => console.log(`[Keep-Alive] Ping respondido com status ${res.status}`))
    .catch(err => console.error("[Keep-Alive] Erro ao pingar servidor:", err));
}, 5 * 60 * 1000);
