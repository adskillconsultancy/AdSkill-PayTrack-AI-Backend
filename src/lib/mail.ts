import nodemailer from "nodemailer";
import config from "../config";
import prisma from "./prisma";

interface SendMailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
  templateName?: string;
  metadata?: Record<string, unknown>;
}

// Reusable singleton transporter
let cachedTransporter: ReturnType<typeof nodemailer.createTransport> | null | undefined = undefined;

const getTransporter = () => {
  if (cachedTransporter !== undefined) {
    return cachedTransporter;
  }

  if (!config.smtp.user || !config.smtp.pass) {
    cachedTransporter = null;
    return null;
  }

  cachedTransporter = nodemailer.createTransport({
    host: config.smtp.host,
    port: config.smtp.port,
    secure: config.smtp.secure,
    auth: {
      user: config.smtp.user,
      pass: config.smtp.pass,
    },
    pool: true,
    maxConnections: 3,
    maxMessages: 100,
  });

  return cachedTransporter;
};

/**
 * Base email layout wrapper with AdSkill PayTrack branding
 */
export const wrapEmailLayout = (title: string, contentHtml: string): string => {
  const portalUrl = config.client_url || "https://paytrack.adskillconsultancy.com";

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
  <style>
    body {
      margin: 0;
      padding: 0;
      background-color: #F8F7F4;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      color: #171717;
      line-height: 1.6;
    }
    .wrapper {
      max-width: 600px;
      margin: 30px auto;
      background: #FFFFFF;
      border-radius: 16px;
      overflow: hidden;
      border: 1px solid #EAE6DF;
      box-shadow: 0 4px 20px rgba(0, 0, 0, 0.05);
    }
    .header {
      background: #0E1318;
      padding: 30px 40px;
      text-align: left;
      border-bottom: 3px solid #F3A712;
    }
    .header-logo {
      font-size: 20px;
      font-weight: 800;
      letter-spacing: -0.5px;
      color: #FFFFFF;
      text-decoration: none;
    }
    .header-tag {
      display: inline-block;
      margin-left: 8px;
      padding: 2px 8px;
      border-radius: 4px;
      background: rgba(243, 167, 18, 0.2);
      color: #F3A712;
      font-size: 11px;
      font-weight: 700;
      text-transform: uppercase;
    }
    .body-content {
      padding: 36px 40px;
    }
    .badge {
      display: inline-block;
      padding: 4px 10px;
      border-radius: 6px;
      font-size: 12px;
      font-weight: 600;
      margin-bottom: 16px;
    }
    .badge-info { background: #EBF5FF; color: #1E40AF; }
    .badge-success { background: #DEF7EC; color: #03543F; }
    .badge-warning { background: #FEF08A; color: #854D0E; }
    .h1 {
      font-size: 22px;
      font-weight: 700;
      color: #0E1318;
      margin: 0 0 16px 0;
    }
    .card-detail {
      background: #FAF8F5;
      border: 1px solid #EAE6DF;
      border-radius: 12px;
      padding: 20px;
      margin: 20px 0;
    }
    .detail-row {
      display: flex;
      justify-content: space-between;
      padding: 8px 0;
      border-bottom: 1px solid #EFECE6;
      font-size: 14px;
    }
    .detail-row:last-child {
      border-bottom: none;
    }
    .detail-label {
      color: #737373;
      font-weight: 500;
    }
    .detail-value {
      color: #0E1318;
      font-weight: 600;
    }
    .btn {
      display: inline-block;
      background: #0E1318;
      color: #FFFFFF !important;
      padding: 12px 28px;
      border-radius: 8px;
      font-weight: 600;
      text-decoration: none;
      font-size: 14px;
      margin-top: 10px;
    }
    .btn:hover {
      background: #262626;
    }
    .footer {
      background: #FAF8F5;
      border-top: 1px solid #EAE6DF;
      padding: 24px 40px;
      text-align: center;
      font-size: 12px;
      color: #8C8C8C;
    }
    .footer a {
      color: #737373;
      text-decoration: underline;
    }
  </style>
</head>
<body>
  <div class="wrapper">
    <div class="header">
      <span class="header-logo">AdSkill PayTrack AI</span>
      <span class="header-tag">Official Notice</span>
    </div>
    <div class="body-content">
      ${contentHtml}
    </div>
    <div class="footer">
      <p>This is an automated notification from <strong>AdSkill Consultancy Inc.</strong></p>
      <p>Need support? Visit your <a href="${portalUrl}/support">Client Support Desk</a> or reply directly.</p>
      <p style="margin-top: 8px; font-size: 11px;">Confidentiality Notice: This email and any attachments are intended solely for the designated recipient.</p>
    </div>
  </div>
</body>
</html>
`;
};

/**
 * Universal mail dispatch function with fallback logging & audit tracking
 */
export const sendMail = async ({
  to,
  subject,
  html,
  text,
  templateName = "CUSTOM",
  metadata,
}: SendMailOptions): Promise<boolean> => {
  try {
    const transporter = getTransporter();

    if (!transporter) {
      console.log(`[MAIL_DEV_LOG] SMTP not configured. Simulating email to: ${to} | Subject: "${subject}"`);
      await prisma.emailAuditLog.create({
        data: {
          recipient: to,
          subject,
          templateName,
          status: "LOGGED_DEV",
          metadata: metadata as any,
        },
      });
      return true;
    }

    const info = await transporter.sendMail({
      from: `"${config.smtp.from_name}" <${config.smtp.from_email}>`,
      to,
      subject,
      html,
      text: text || subject,
    });

    console.log(`[MAIL_SENT] Successfully delivered email to ${to} (MessageId: ${info.messageId})`);

    await prisma.emailAuditLog.create({
      data: {
        recipient: to,
        subject,
        templateName,
        status: "SENT",
        metadata: { messageId: info.messageId, ...metadata } as any,
      },
    });

    return true;
  } catch (error: any) {
    console.error(`[MAIL_ERROR] Failed sending email to ${to}:`, error?.message || error);

    try {
      await prisma.emailAuditLog.create({
        data: {
          recipient: to,
          subject,
          templateName,
          status: "FAILED",
          errorMessage: error?.message || "Unknown error sending mail",
          metadata: metadata as any,
        },
      });
    } catch (logErr) {
      console.error("[MAIL_AUDIT_LOG_ERROR] Could not record email audit log:", logErr);
    }

    return false;
  }
};
