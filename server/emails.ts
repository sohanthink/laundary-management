import "server-only";

export function escapeHtml(value: string | number | null | undefined) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

export function appUrl(path = "") {
  return `${process.env.APP_URL ?? "http://localhost:3000"}${path}`;
}

/** Wraps email content in a simple branded layout. `body` must already be escaped. */
export function emailLayout(title: string, body: string) {
  return `<!doctype html>
<html><body style="margin:0;background:#eef3ef;font-family:Arial,Helvetica,sans-serif;color:#14261f">
  <div style="max-width:600px;margin:0 auto;padding:24px">
    <div style="background:#ffffff;border:1px solid #d7e2dc;border-radius:16px;padding:28px">
      <p style="margin:0 0 4px;font-size:22px;font-weight:bold;color:#1d6b5c">an-nafi</p>
      <h1 style="margin:0 0 20px;font-size:20px">${escapeHtml(title)}</h1>
      ${body}
    </div>
    <p style="font-size:12px;color:#5d6f68;text-align:center;margin-top:16px">
      This email was sent by an-nafi laundry management.
    </p>
  </div>
</body></html>`;
}

export function emailTable(head: string[], rows: string[][], alignRightFrom = 1) {
  const cell = (value: string, i: number, tag: "td" | "th") =>
    `<${tag} style="padding:8px;border-bottom:1px solid #d7e2dc;text-align:${i >= alignRightFrom ? "right" : "left"};font-size:13px">${value}</${tag}>`;
  return `<table style="width:100%;border-collapse:collapse;margin:12px 0">
    <tr>${head.map((h, i) => cell(escapeHtml(h), i, "th")).join("")}</tr>
    ${rows.map((r) => `<tr>${r.map((v, i) => cell(v, i, "td")).join("")}</tr>`).join("")}
  </table>`;
}

export function credentialsEmail(input: {
  name: string;
  email: string;
  tempPassword: string;
  reset?: boolean;
}) {
  const subject = input.reset ? "Your an-nafi password was reset" : "Your an-nafi account";
  const html = emailLayout(
    input.reset ? "Your password was reset" : "Welcome to an-nafi",
    `<p>Hello ${escapeHtml(input.name)},</p>
     <p>${input.reset ? "The admin reset your password." : "An account was created for you to view your hotels, deliveries and dues."}</p>
     <p><strong>Login:</strong> <a href="${appUrl("/login")}">${appUrl("/login")}</a><br/>
        <strong>Email:</strong> ${escapeHtml(input.email)}<br/>
        <strong>Temporary password:</strong> <code style="font-size:16px">${escapeHtml(input.tempPassword)}</code></p>
     <p>You will be asked to choose your own password when you sign in.</p>`,
  );
  return { subject, html };
}
