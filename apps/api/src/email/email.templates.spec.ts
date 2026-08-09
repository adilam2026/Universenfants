import { accountCreatedEmail, orderConfirmedEmail } from "./email.templates";

// accountCreatedEmail(firstName) et orderConfirmedEmail(..., lines) concaténaient
// firstName / le nom du produit directement dans le HTML de l'email, sans
// échappement — une valeur contenant des balises HTML se serait retrouvée
// telle quelle dans l'email envoyé (risque XSS/injection de contenu si un tel
// champ provenait un jour d'une source moins fiable qu'aujourd'hui).
describe("email templates HTML-escape user-controlled strings", () => {
  it("escapes HTML in the customer's first name", () => {
    const { html } = accountCreatedEmail('<img src=x onerror="alert(1)">');
    expect(html).not.toContain("<img src=x onerror");
    expect(html).toContain("&lt;img src=x onerror=&quot;alert(1)&quot;&gt;");
  });

  it("escapes HTML in a product line name", () => {
    const { html } = orderConfirmedEmail("CMD-2026-000001", [{ name: "<script>alert(1)</script>", quantity: 1, lineTotal: 10 }], 10);
    expect(html).not.toContain("<script>alert(1)</script>");
    expect(html).toContain("&lt;script&gt;alert(1)&lt;/script&gt;");
  });
});
