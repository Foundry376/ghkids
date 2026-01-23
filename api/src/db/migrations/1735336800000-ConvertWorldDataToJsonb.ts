import { MigrationInterface, QueryRunner } from "typeorm";

export class ConvertWorldDataToJsonb1735336800000 implements MigrationInterface {
  name = "ConvertWorldDataToJsonb1735336800000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Convert the data column from text to jsonb
    // The USING clause parses existing text as JSON
    await queryRunner.query(`
      ALTER TABLE "worlds"
      ALTER COLUMN "data" TYPE jsonb
      USING CASE
        WHEN "data" IS NULL THEN NULL
        WHEN "data" = '' THEN NULL
        ELSE "data"::jsonb
      END
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Revert jsonb back to text
    await queryRunner.query(`
      ALTER TABLE "worlds"
      ALTER COLUMN "data" TYPE text
      USING "data"::text
    `);
  }
}
