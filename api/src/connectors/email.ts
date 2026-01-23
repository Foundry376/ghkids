import { SESClient, SendEmailCommand } from "@aws-sdk/client-ses";
import fs from "fs";
import Handlebars from "handlebars";
import path from "path";
import { User } from "src/db/entity/user";

const FROM_EMAIL = process.env.SES_FROM_EMAIL || "noreply@codako.org";
const FROM_NAME = process.env.SES_FROM_NAME || "Codako";

const ses = new SESClient({});

const templateCache = new Map<string, HandlebarsTemplateDelegate>();

function loadTemplate(templateName: string): HandlebarsTemplateDelegate {
  const cached = templateCache.get(templateName);
  if (cached) {
    return cached;
  }

  const templatePath = path.join(
    __dirname.replace("/dist/", "/src/"),
    "templates",
    `${templateName}.html`,
  );
  const templateSource = fs.readFileSync(templatePath, "utf-8");
  const compiled = Handlebars.compile(templateSource);
  templateCache.set(templateName, compiled);
  return compiled;
}

export interface EmailOptions {
  to: string | string[];
  subject: string;
  template: string;
  data?: Record<string, unknown>;
}

export async function sendEmail(options: EmailOptions): Promise<boolean> {
  const toAddresses = Array.isArray(options.to) ? options.to : [options.to];

  try {
    const template = loadTemplate(options.template);
    const html = template(options.data || {});

    const command = new SendEmailCommand({
      Source: `${FROM_NAME} <${FROM_EMAIL}>`,
      Destination: {
        ToAddresses: toAddresses,
      },
      Message: {
        Subject: {
          Data: options.subject,
          Charset: "UTF-8",
        },
        Body: {
          Html: {
            Data: html,
            Charset: "UTF-8",
          },
        },
      },
    });

    await ses.send(command);
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
  template: string,
  subject: string,
  data: Record<string, unknown> = {},
): Promise<boolean> {
  if (!recipient.email) {
    console.warn(`Cannot send email to user ${recipient.username}: no email address`);
    return false;
  }

  return sendEmail({
    to: recipient.email,
    subject,
    template,
    data: {
      recipientUsername: recipient.username,
      recipientEmail: recipient.email,
      ...data,
    },
  });
}

export interface ForkEmailData {
  forkerUsername: string;
  worldName: string;
  worldId: number;
}

export async function sendForkEmail(recipient: User, data: ForkEmailData): Promise<boolean> {
  return sendTemplateEmail(
    recipient,
    "fork",
    `${data.forkerUsername} forked your world "${data.worldName}"`,
    { ...data },
  );
}
