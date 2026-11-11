import { MigrationInterface, QueryRunner } from "typeorm";

export class AddWorldVersions1794400000000 implements MigrationInterface {
  name = "AddWorldVersions1794400000000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "world_versions" (
        "id" SERIAL NOT NULL,
        "worldId" integer NOT NULL,
        "data" jsonb NOT NULL,
        "name" text NOT NULL,
        "description" text,
        "thumbnail" text NOT NULL,
        "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
        CONSTRAINT "PK_5aad79a3fd9d3564ca4eedeb7de" PRIMARY KEY ("id")
      )
    `);
    await queryRunner.query(`ALTER TABLE "worlds" ADD "publishedVersionId" integer`);
    await queryRunner.query(`
      ALTER TABLE "world_versions" ADD CONSTRAINT "FK_e077977d9381f4fa5762cd2145c"
      FOREIGN KEY ("worldId") REFERENCES "worlds"("id") ON DELETE CASCADE ON UPDATE NO ACTION
    `);
    await queryRunner.query(`
      ALTER TABLE "worlds" ADD CONSTRAINT "FK_2ecb117dd1d4091fc3bf0cc05c6"
      FOREIGN KEY ("publishedVersionId") REFERENCES "world_versions"("id") ON DELETE SET NULL ON UPDATE NO ACTION
    `);

    // Every published game becomes a snapshot of what players get today: its saved game.
    await queryRunner.query(`
      INSERT INTO "world_versions" ("worldId", "data", "name", "description", "thumbnail", "createdAt")
      SELECT "id", "data", "name", "description", "thumbnail", "updatedAt"
      FROM "worlds" WHERE "published" = true AND "data" IS NOT NULL
    `);
    await queryRunner.query(`
      UPDATE "worlds" SET "publishedVersionId" = v."id"
      FROM "world_versions" v WHERE v."worldId" = "worlds"."id"
    `);
    // A published game that was never saved had nothing to play.
    await queryRunner.query(`
      UPDATE "worlds" SET "published" = false WHERE "published" = true AND "data" IS NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "worlds" DROP CONSTRAINT "FK_2ecb117dd1d4091fc3bf0cc05c6"`,
    );
    await queryRunner.query(`ALTER TABLE "worlds" DROP COLUMN "publishedVersionId"`);
    await queryRunner.query(`DROP TABLE "world_versions"`);
  }
}
