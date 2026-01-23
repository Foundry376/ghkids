import { MigrationInterface, QueryRunner } from "typeorm";

export class Published1735336800001 implements MigrationInterface {
  name = "Published1735336800001";

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Convert the data column from text to jsonb
    // The USING clause parses existing text as JSON
    await queryRunner.query(`
      ALTER TABLE "worlds" ADD COLUMN published boolean DEFAULT false;
      ALTER TABLE "worlds" ADD COLUMN description text DEFAULT null;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {}
}
