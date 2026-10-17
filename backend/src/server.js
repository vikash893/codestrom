import app from './app.js';
import { config } from './config/env.js';
import { connectDB } from './config/db.js';

const startServer = async () => {
  await connectDB();

  const server = app.listen(config.port, () => {
    console.log(`[MediResQ Backend] Server running on port ${config.port} (${config.env})`);
    console.log(`[MediResQ Backend] Health endpoint: http://localhost:${config.port}/health`);
  });

  const gracefulShutdown = () => {
    console.log('[MediResQ Backend] Shutting down gracefully...');
    server.close(() => {
      console.log('[MediResQ Backend] HTTP server closed.');
      process.exit(0);
    });
  };

  process.on('SIGTERM', gracefulShutdown);
  process.on('SIGINT', gracefulShutdown);
};

startServer();
