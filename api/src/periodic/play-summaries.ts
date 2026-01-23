import { sendTemplateEmail } from "src/connectors/email";
import { AppDataSource } from "src/db/data-source";
import { User } from "src/db/entity/user";

/**
 * Delivers weekly play summary emails to users who have playSummaries enabled.
 * Summarizes play counts and engagement for their published worlds.
 */
export async function deliverPlaySummaries(): Promise<void> {
  // Find users with playSummaries enabled and an email address
  const users = await AppDataSource.getRepository(User)
    .createQueryBuilder("user")
    .where("user.email IS NOT NULL")
    .andWhere("user.notificationSettings->>'playSummaries' = :enabled", {
      enabled: "true",
    })
    .getMany();

  console.log(
    `[PlaySummaries] Found ${users.length} users with play summaries enabled`
  );

  for (const user of users) {
    try {
      // TODO: Aggregate play counts for user's worlds over the past week
      const totalPlays = 0;

      await sendTemplateEmail(
        user,
        "play-summary",
        "Your Weekly Codako Play Summary",
        { totalPlays }
      );

      console.log(`[PlaySummaries] Sent summary to ${user.username}`);
    } catch (err) {
      console.error(
        `[PlaySummaries] Failed to send summary to ${user.username}:`,
        err
      );
    }
  }
}
