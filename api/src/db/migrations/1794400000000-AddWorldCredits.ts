import { MigrationInterface, QueryRunner } from "typeorm";

/**
 * Who made a game, as its author wants them named ("Ben and Marcus"). Shown
 * on the game's page above the account that published it.
 */
export class AddWorldCredits1794400000000 implements MigrationInterface {
  name = "AddWorldCredits1794400000000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "worlds" ADD COLUMN "credits" text DEFAULT null`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "worlds" DROP COLUMN "credits"`);
  }
}
