import { MigrationInterface, QueryRunner } from "typeorm";

export class AddSessions1793800000000 implements MigrationInterface {
  name = "AddSessions1793800000000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "sessions" (
        "tokenHash" varchar PRIMARY KEY,
        "userId" varchar NOT NULL,
        "createdAt" timestamptz NOT NULL DEFAULT NOW(),
        "expiresAt" timestamptz NOT NULL
      )
    `);
    await queryRunner.query(`CREATE INDEX "IDX_sessions_userId" ON "sessions" ("userId")`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "sessions"`);
  }
}
