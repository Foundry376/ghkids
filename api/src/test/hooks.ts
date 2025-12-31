import { closeDatabase, initializeDatabase } from "./setup";

// Mocha Root Hook Plugin
// https://mochajs.org/#root-hook-plugins
export const mochaHooks = {
  async beforeAll(this: Mocha.Context) {
    this.timeout(30000);
    await initializeDatabase();
  },
  async afterAll() {
    await closeDatabase();
  },
};
