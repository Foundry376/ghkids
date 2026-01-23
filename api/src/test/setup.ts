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
