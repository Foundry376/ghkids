import { DataSource } from "typeorm";
import { logger } from "../logger";
import { User } from "./entity/user";
import { World } from "./entity/world";

//Do not remove this or your migrations will silently run on no database at all
require("dotenv").config();

const url =
  process.env.NODE_ENV === "test" ? process.env.DATABASE_URL_TEST : process.env.DATABASE_URL;

export const AppDataSource = new DataSource({
  url: url,
  type: "postgres",
  synchronize: process.env.NODE_ENV !== "production",
  logging: true,
  maxQueryExecutionTime: 30000,
  entities: [User, World],
  subscribers: [],
  ssl: process.env.NODE_ENV === "production" ? { rejectUnauthorized: false } : false,
  migrations: process.env.NODE_ENV === "test" ? [] : ["dist/db/migrations/*.js"],
  extra: {
    poolSize: process.env.DATABASE_POOL_SIZE || 40,
  },
});

export const initialize =
  !process.env.SEED && process.env.NODE_ENV !== "test"
    ? AppDataSource.initialize().catch(logger.error)
    : null;
