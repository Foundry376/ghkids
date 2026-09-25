import "reflect-metadata";
import { AppDataSource } from "../db/data-source";

// Ensure we're in test mode
process.env.NODE_ENV = "test";

/**
 * Resets the database by truncating all tables.
 * Call this in beforeEach() to ensure a clean state for each test.
 * Note: Database must be initialized via initializeDatabase() before calling this.
 */
export async function resetDatabase(): Promise<void> {
  if (!AppDataSource.isInitialized) {
    throw new Error(
      "Database not initialized. Ensure initializeDatabase() is called in beforeAll.",
    );
  }

  const entities = AppDataSource.entityMetadatas;

  for (const entity of entities) {
    const repository = AppDataSource.getRepository(entity.name);
    await repository.query(`TRUNCATE TABLE "${entity.tableName}" RESTART IDENTITY CASCADE`);
  }
}

/**
 * Initializes the database connection.
 * Call this once before running tests.
 */
export async function initializeDatabase(): Promise<void> {
  // Every test starts by truncating every table, so never connect to anything
  // but a test database - an unset DATABASE_URL_TEST, or a data source that
  // was imported before NODE_ENV was "test", would otherwise point it at a
  // real one.
  const url = AppDataSource.options.type === "postgres" ? AppDataSource.options.url : undefined;
  const database = url ? new URL(url).pathname.replace(/^\//, "") : "";
  if (!database.endsWith("_test")) {
    throw new Error(
      `Refusing to run the tests against "${database || "(no DATABASE_URL_TEST)"}": ` +
        `set DATABASE_URL_TEST to a database whose name ends in "_test".`,
    );
  }
  if (!AppDataSource.isInitialized) {
    await AppDataSource.initialize();
  }
}

/**
 * Closes the database connection.
 * Call this after all tests are done.
 */
export async function closeDatabase(): Promise<void> {
  if (AppDataSource.isInitialized) {
    await AppDataSource.destroy();
  }
}
