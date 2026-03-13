import { MigrationInterface, QueryRunner } from "typeorm";

export class AddPasswordResetFields1741200000000 implements MigrationInterface {
  name = "AddPasswordResetFields1741200000000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "users"
      ADD COLUMN "passwordResetToken" varchar NULL,
      ADD COLUMN "passwordResetExpiry" timestamp NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "users"
      DROP COLUMN "passwordResetToken",
      DROP COLUMN "passwordResetExpiry"
    `);
  }
}
