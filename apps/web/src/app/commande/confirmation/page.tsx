import Link from "next/link";
import { PartyPopper } from "lucide-react";
import { Button } from "@/components/ui/button";

function dh(value: number) {
  return `${value.toLocaleString("fr-FR")} DH`;
}

export default async function OrderConfirmationPage({ searchParams }: PageProps<"/commande/confirmation">) {
  const sp = await searchParams;
  const orderNumber = typeof sp.orderNumber === "string" ? sp.orderNumber : null;
  const total = typeof sp.total === "string" ? Number(sp.total) : null;

  return (
    <div className="mx-auto max-w-xl px-4 py-10 text-center">
      <PartyPopper className="mx-auto size-14 text-brand-highlight mb-3" />
      <h1 className="font-display text-2xl font-extrabold mb-2">Merci, votre commande est confirmée !</h1>
      <p className="text-sm text-muted-foreground mb-6">
        Un email de confirmation vous a été envoyé. Notre équipe prépare votre colis.
      </p>

      {orderNumber && (
        <div className="rounded-2xl border border-border bg-card p-4 text-start">
          <div className="flex justify-between mb-3.5">
            <span className="text-sm text-muted-foreground">Numéro de commande</span>
            <span className="font-display font-extrabold">{orderNumber}</span>
          </div>
          {total !== null && (
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Montant total</span>
              <span className="font-bold">{dh(total)}</span>
            </div>
          )}
        </div>
      )}

      <div className="flex gap-2.5 mt-6 justify-center flex-wrap">
        <Button asChild>
          <Link href="/compte/commandes">Suivre ma commande</Link>
        </Button>
        <Button asChild variant="ghost">
          <Link href="/">Continuer mes achats</Link>
        </Button>
      </div>
    </div>
  );
}
