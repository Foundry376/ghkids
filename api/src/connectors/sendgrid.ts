import sgMail, { MailDataRequired } from "@sendgrid/mail";
import { User } from "src/db/entity/user";

export interface EmailOptions {
  to: string | string[];
  templateId: string;
  dynamicTemplateData?: Record<string, unknown>;
}

const FROM_EMAIL = process.env.SENDGRID_FROM_EMAIL || "noreply@codako.org";
const FROM_NAME = process.env.SENDGRID_FROM_NAME || "Codako";

let initialized = false;

function init(): void {
  if (initialized) return;

  const apiKey = process.env.SENDGRID_API_KEY;
  if (!apiKey) {
    console.warn("SENDGRID_API_KEY not set, emails will not be sent");
    return;
  }

  sgMail.setApiKey(apiKey);
  initialized = true;
}

export async function sendEmail(options: EmailOptions): Promise<boolean> {
  init();

  if (!initialized) {
    console.warn("SendGrid not initialized, skipping email send");
    return false;
  }

  const msg: MailDataRequired = {
    to: options.to,
    from: {
      email: FROM_EMAIL,
      name: FROM_NAME,
    },
    templateId: options.templateId,
    dynamicTemplateData: options.dynamicTemplateData,
  };

  try {
    await sgMail.send(msg);
    return true;
  } catch (error) {
    console.error("Failed to send email:", error);
    return false;
  }
}

export async function sendEmails(
  emails: EmailOptions[],
): Promise<{ sent: number; failed: number }> {
  const results = await Promise.all(emails.map(sendEmail));
  return {
    sent: results.filter(Boolean).length,
    failed: results.filter((r) => !r).length,
  };
}

/**
 * Sends an email to a user using a template.
 * Automatically includes recipientUsername and recipientEmail in template data.
 */
export async function sendTemplateEmail(
  recipient: User,
  templateId: string,
  data: Record<string, unknown> = {},
): Promise<boolean> {
  if (!recipient.email) {
    console.warn(`Cannot send email to user ${recipient.username}: no email address`);
    return false;
  }

  return sendEmail({
    to: recipient.email,
    templateId,
    dynamicTemplateData: {
      recipientUsername: recipient.username,
      recipientEmail: recipient.email,
      ...data,
    },
  });
}

export type ForkEmailData = {
  forkerUsername: string;
  worldName: string;
  worldId: number;
};

export async function sendForkEmail(recipient: User, data: ForkEmailData): Promise<boolean> {
  const templateId = process.env.SENDGRID_TEMPLATE_FORK;
  if (!templateId) {
    console.warn("SENDGRID_TEMPLATE_FORK not set, skipping fork email");
    return false;
  }

  return sendTemplateEmail(recipient, templateId, data);
}
