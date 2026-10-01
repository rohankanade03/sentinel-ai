import { createServer } from "node:http";
import { Server } from "socket.io";
import { createApp } from "./app.js";
import { connectDatabase } from "./config/db.js";
import { env } from "./config/env.js";
import { registerSockets } from "./sockets/index.js";

const app = createApp();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: env.frontendUrl,
    credentials: true,
  },
});

app.set("io", io);
registerSockets(io);

try {
  await connectDatabase();
  app.set("databaseMode", "mongodb");
  httpServer.listen(env.port, () => {
    console.log(`CivicFlow API running on ${env.backendUrl}`);
  });
} catch (error) {
  app.set("databaseMode", env.allowLocalDevStore ? "local-json" : "unavailable");
  console.warn(
    env.allowLocalDevStore
      ? "MongoDB is not reachable. CivicFlow API is using local development persistence."
      : "MongoDB is not reachable. CivicFlow API will stay online and return 503 for database-backed routes.",
  );
  console.error(error.message);
  httpServer.listen(env.port, () => {
    console.log(`CivicFlow API running on ${env.backendUrl}`);
  });
}
