import "server-only";
import nodemailer, { type Transporter } from "nodemailer";

let transporter: Transporter | null | undefined;

function getTransporter() {
  if (transporter !== undefined) return transporter;
  const user = process.env.GMAIL_USER;
  const pass = process.env.GMAIL_APP_PASSWORD;
  transporter =
    user && pass
      ? nodemailer.createTransport({
          host: "smtp.gmail.com",
          port: 465,
          secure: true,
          auth: { user, pass },
        })
      : null;
  return transporter;
}

export function isEmailConfigured() {
  return Boolean(process.env.GMAIL_USER && process.env.GMAIL_APP_PASSWORD);
}

type Email = { to: string; subject: string; html: string };

/**
 * The only place that sends email. To move from Gmail to Resend or SES later,
 * change this function. Failures are logged and never break the calling action.
 */
export async function sendEmail({ to, subject, html }: Email) {
  const transport = getTransporter();
  if (!transport) {
    console.info(`[email skipped: GMAIL_USER not set] to=${to} subject="${subject}"`);
    return false;
  }
  try {
    await transport.sendMail({
      from: `"an-nafi" <${process.env.GMAIL_USER}>`,
      to,
      subject,
      html,
    });
    return true;
  } catch (error) {
    console.error(`[email failed] to=${to} subject="${subject}"`, error);
    return false;
  }
}
