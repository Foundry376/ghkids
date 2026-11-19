import { MigrationInterface, QueryRunner } from "typeorm";

/**
 * Whether other players may copy a game, chosen when it's published. Games
 * published before this could always be remixed, so they still can.
 */
export class AddWorldAllowCopies1794600000000 implements MigrationInterface {
  name = "AddWorldAllowCopies1794600000000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "worlds" ADD COLUMN "allowCopies" boolean NOT NULL DEFAULT true`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "worlds" DROP COLUMN "allowCopies"`);
  }
}
