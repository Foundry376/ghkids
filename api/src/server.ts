// The common service utils must be imported first

import { Express } from "express";
import throng from "throng";
import { AppDataSource } from "./db/data-source";
import { logger } from "./logger";

if (!process.env.TS_NODE_DEV && !process.env.TS_NODE) {
  require("module-alias/register");
  require("source-map-support").install();
}

const PORT = process.env.PORT || 8080;
const WORKERS = Number(process.env.WORKERS || "1");

function startService(run: () => void) {
  const start = async (pid: number) => {
    logger.info("Initializing database connections");
    await Promise.all([AppDataSource.initialize]);

    logger.info("Starting service...");
    void run();
  };

  if (process.env.NODE_ENV === "development" && WORKERS === 1) {
    void start(1);
  } else {
    void throng({
      workers: WORKERS,
      lifetime: Infinity,
      start: start,
    });
  }
}

startService(() => {
  logger.info("Initializing app routes");
  const app = require("./app").default as Express;

  logger.info(`Calling listen on ${PORT}`);
  const server = app.listen(PORT, async () => {
    logger.info(`Listening on ${PORT}: ${app.get("env")}`);
    logger.info(`  Press CTRL-C to stop\n`);
  });

  server.keepAliveTimeout = Number(process.env.EPA_KEEPALIVE_TIMEOUT ?? 63000);
  server.headersTimeout = Number(process.env.EPA_HEADERS_TIMEOUT ?? 67000);

  return server;
});
