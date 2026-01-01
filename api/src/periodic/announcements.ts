import { sendTemplateEmail } from "src/connectors/email";
import { AppDataSource } from "src/db/data-source";
import { User } from "src/db/entity/user";

interface Announcement {
  title: string;
  body: string;
}

/**
 * Delivers announcement emails to users who have announcements enabled.
 * Checks for pending announcements and sends them to eligible users.
 */
export async function deliverAnnouncements(): Promise<void> {
  // TODO: Check for pending announcements that need to be sent
  // For now, this is a placeholder that would be triggered when
  // there's a new announcement to deliver
  const pendingAnnouncement: Announcement | null = null; // await getPendingAnnouncement();

  if (!pendingAnnouncement) {
    console.log("[Announcements] No pending announcements to deliver");
    return;
  }

  // Find users with announcements enabled and an email address
  const users = await AppDataSource.getRepository(User)
    .createQueryBuilder("user")
    .where("user.email IS NOT NULL")
    .andWhere("user.notificationSettings->>'announcements' = :enabled", {
      enabled: "true",
    })
    .getMany();

  console.log(
    `[Announcements] Found ${users.length} users with announcements enabled`
  );

  for (const user of users) {
    try {
      await sendTemplateEmail(user, "announcement", pendingAnnouncement.title, {
        title: pendingAnnouncement.title,
        body: pendingAnnouncement.body,
      });

      console.log(`[Announcements] Sent announcement to ${user.username}`);
    } catch (err) {
      console.error(
        `[Announcements] Failed to send announcement to ${user.username}:`,
        err
      );
    }
  }

  // TODO: Mark announcement as sent
}
