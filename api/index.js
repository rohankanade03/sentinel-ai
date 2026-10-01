import { createApp } from "../backend/app.js";
import { connectDatabase } from "../backend/config/db.js";
import { env } from "../backend/config/env.js";

let appPromise;

async function getApp() {
  if (!appPromise) {
    appPromise = (async () => {
      const app = createApp();

      try {
        await connectDatabase();
        app.set("databaseMode", "mongodb");
      } catch {
        app.set("databaseMode", env.allowLocalDevStore ? "local-json" : "unavailable");
      }

      return app;
    })();
  }

  return appPromise;
}

export default async function handler(request, response) {
  const app = await getApp();
  return app(request, response);
}
