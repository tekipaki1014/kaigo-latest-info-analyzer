import { Resend } from "resend";

function getResend() {
  return new Resend(process.env.RESEND_API_KEY);
}

interface NotificationParams {
  volNumber: number;
  title: string;
  summary: string;
  appUrl: string;
}

export async function sendNewInfoNotification(params: NotificationParams) {
  const { volNumber, title, summary, appUrl } = params;

  const toEmail = process.env.NOTIFICATION_EMAIL;
  if (!toEmail) {
    console.warn("NOTIFICATION_EMAIL not set, skipping email notification");
    return;
  }

  await getResend().emails.send({
    from: "介護保険最新情報 <onboarding@resend.dev>",
    to: toEmail,
    subject: `【新着】介護保険最新情報 Vol.${volNumber}`,
    html: `
      <h2>介護保険最新情報 Vol.${volNumber}</h2>
      <p><strong>${title}</strong></p>
      <h3>AI要約</h3>
      <p>${summary}</p>
      <hr />
      <p><a href="${appUrl}">ツールで詳細を確認する</a></p>
    `,
  });
}
