import { MigrationInterface, QueryRunner } from "typeorm";

export class AddUserNotificationSettings1735400000000 implements MigrationInterface {
  name = "AddUserNotificationSettings1735400000000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "users"
      ADD COLUMN "notificationSettings" jsonb
      NOT NULL
      DEFAULT '{"announcements": true, "forks": true, "playSummaries": true}'::jsonb
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "users"
      DROP COLUMN "notificationSettings"
    `);
  }
}
