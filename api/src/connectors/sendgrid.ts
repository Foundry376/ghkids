import sgMail, { MailDataRequired } from "@sendgrid/mail";

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
  emails: EmailOptions[]
): Promise<{ sent: number; failed: number }> {
  const results = await Promise.all(emails.map(sendEmail));
  return {
    sent: results.filter(Boolean).length,
    failed: results.filter((r) => !r).length,
  };
}
