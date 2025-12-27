import { closeDatabase, initializeDatabase } from "./setup";

export const mochaHooks = {
  async beforeAll() {
    await initializeDatabase();
  },
  async afterAll() {
    await closeDatabase();
  },
};
