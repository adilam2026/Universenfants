function baseLayout(title: string, bodyHtml: string): string {
  return `<!doctype html>
<html lang="fr">
<head><meta charset="utf-8" /><title>${title}</title></head>
<body style="margin:0;padding:0;background:#f3f1fb;font-family:Arial,Helvetica,sans-serif;color:#2a2438;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f3f1fb;padding:24px 0;">
    <tr><td align="center">
      <table role="presentation" width="480" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:16px;overflow:hidden;">
        <tr><td style="background:#6c5ce7;padding:20px 28px;">
          <span style="font-size:20px;font-weight:800;color:#ffffff;">🧸 UniversEnfants</span>
        </td></tr>
        <tr><td style="padding:28px;">
          ${bodyHtml}
        </td></tr>
        <tr><td style="padding:16px 28px;background:#f7f6fc;font-size:12px;color:#8a83a3;">
          UniversEnfants — Jouets pour enfants, livraison partout au Maroc.
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

function button(href: string, label: string): string {
  return `<a href="${href}" style="display:inline-block;margin-top:16px;background:#ff6b81;color:#ffffff;text-decoration:none;font-weight:700;padding:12px 24px;border-radius:999px;">${label}</a>`;
}

export function accountCreatedEmail(firstName: string | null) {
  const subject = "Bienvenue chez UniversEnfants !";
  const html = baseLayout(
    subject,
    `<h1 style="font-size:20px;margin:0 0 12px;">Bonjour ${firstName ?? ""} 👋</h1>
     <p style="font-size:14px;line-height:1.6;">Votre compte UniversEnfants a bien été créé. Vous pouvez dès maintenant parcourir notre catalogue de jouets, suivre vos commandes et profiter de notre programme de fidélité.</p>`,
  );
  return { subject, html };
}

export function passwordResetEmail(resetUrl: string) {
  const subject = "Réinitialisation de votre mot de passe";
  const html = baseLayout(
    subject,
    `<h1 style="font-size:20px;margin:0 0 12px;">Réinitialisation du mot de passe</h1>
     <p style="font-size:14px;line-height:1.6;">Vous avez demandé la réinitialisation de votre mot de passe. Ce lien est valable 1 heure. Si vous n'êtes pas à l'origine de cette demande, ignorez cet email.</p>
     ${button(resetUrl, "Réinitialiser mon mot de passe")}`,
  );
  return { subject, html };
}

export interface OrderEmailLine {
  name: string;
  quantity: number;
  lineTotal: number;
}

function dh(n: number) {
  return `${Number(n).toLocaleString("fr-FR")} DH`;
}

function linesTable(lines: OrderEmailLine[]) {
  const rows = lines
    .map(
      (l) => `<tr>
        <td style="padding:6px 0;font-size:13px;">${l.name} <span style="color:#8a83a3;">× ${l.quantity}</span></td>
        <td style="padding:6px 0;font-size:13px;text-align:right;">${dh(l.lineTotal)}</td>
      </tr>`,
    )
    .join("");
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top:12px;border-top:1px solid #eee;padding-top:8px;">${rows}</table>`;
}

export function orderConfirmedEmail(orderNumber: string, lines: OrderEmailLine[], total: number) {
  const subject = `Commande ${orderNumber} confirmée`;
  const html = baseLayout(
    subject,
    `<h1 style="font-size:20px;margin:0 0 12px;">Merci pour votre commande !</h1>
     <p style="font-size:14px;line-height:1.6;">Votre commande <strong>${orderNumber}</strong> a bien été enregistrée et sera préparée sous peu. Paiement à la livraison.</p>
     ${linesTable(lines)}
     <p style="font-size:15px;font-weight:800;text-align:right;margin-top:10px;">Total : ${dh(total)}</p>`,
  );
  return { subject, html };
}

const STATUS_LABELS: Record<string, string> = {
  CONFIRMED: "confirmée",
  PREPARING: "en préparation",
  SHIPPED: "expédiée",
  DELIVERED: "livrée",
  CANCELLED: "annulée",
};

export function orderStatusChangedEmail(orderNumber: string, status: string) {
  const label = STATUS_LABELS[status] ?? status.toLowerCase();
  const subject = `Commande ${orderNumber} : ${label}`;
  const html = baseLayout(
    subject,
    `<h1 style="font-size:20px;margin:0 0 12px;">Votre commande a été mise à jour</h1>
     <p style="font-size:14px;line-height:1.6;">Votre commande <strong>${orderNumber}</strong> est maintenant <strong>${label}</strong>.</p>`,
  );
  return { subject, html };
}
