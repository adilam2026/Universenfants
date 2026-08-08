"use client";

import { use, useEffect, useState } from "react";
import { useTranslations, useLocale } from "next-intl";
import { Cake, Gift, Check } from "lucide-react";
import { getSharedBirthdayList, reserveBirthdayListItem, type BirthdayList } from "@/lib/birthday-list-client";
import { localized } from "@/lib/localized";
import { Button } from "@/components/ui/button";

function dh(value: string | number) {
  return `${Number(value).toLocaleString("fr-FR")} DH`;
}

export default function SharedBirthdayListPage({ params }: { params: Promise<{ locale: string; shareToken: string }> }) {
  const { shareToken } = use(params);
  const t = useTranslations("birthdayList");
  const locale = useLocale();
  const [list, setList] = useState<Omit<BirthdayList, "shareToken"> | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [reservingId, setReservingId] = useState<string | null>(null);

  useEffect(() => {
    getSharedBirthdayList(shareToken)
      .then(setList)
      .catch(() => setError(t("notFound")));
  }, [shareToken, t]);

  async function handleReserve(itemId: string) {
    setReservingId(itemId);
    try {
      const updated = await reserveBirthdayListItem(shareToken, itemId);
      setList(updated);
    } catch (e) {
      setError(e instanceof Error ? e.message : t("reserveError"));
    } finally {
      setReservingId(null);
    }
  }

  if (error) return <div className="mx-auto max-w-md px-4 py-16 text-center text-muted-foreground">{error}</div>;
  if (!list) return <div className="mx-auto max-w-2xl px-4 py-16 text-center text-muted-foreground">{t("loading")}</div>;

  return (
    <div className="mx-auto max-w-2xl px-4 md:px-7 py-8">
      <div className="text-center mb-6">
        <Cake className="mx-auto size-10 text-brand-cta mb-2" />
        <h1 className="font-display text-2xl font-extrabold">{t("sharedTitle", { name: list.childName })}</h1>
        <p className="text-sm text-muted-foreground mt-1">
          {new Date(list.eventDate).toLocaleDateString(locale === "ar" ? "ar-MA" : "fr-FR", { day: "numeric", month: "long", year: "numeric" })}
        </p>
        {list.message && <p className="text-sm mt-3 rounded-xl bg-brand-highlight-soft text-brand-highlight-foreground p-3">{list.message}</p>}
      </div>

      {error && <p className="text-sm text-destructive text-center mb-3">{error}</p>}

      <div className="flex flex-col gap-2.5">
        {list.items.map((item) => (
          <div key={item.id} className="rounded-2xl border border-border bg-card p-3.5 flex items-center gap-3">
            <div className="size-14 shrink-0 rounded-xl bg-brand-primary-soft flex items-center justify-center text-2xl">🧸</div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold truncate">{localized(item.product.nameFr, item.product.nameAr, locale)}</p>
              <p className="text-xs text-muted-foreground">{dh(item.product.promoPrice ?? item.product.price)}</p>
            </div>
            {item.reserved ? (
              <span className="flex items-center gap-1.5 rounded-full bg-secondary px-3 py-1.5 text-xs font-bold text-muted-foreground">
                <Check className="size-3.5" /> {t("reservedShort")}
              </span>
            ) : (
              <Button size="sm" variant="cta" onClick={() => handleReserve(item.id)} disabled={reservingId === item.id}>
                <Gift className="size-4" />
                {reservingId === item.id ? t("reserving") : t("reserve")}
              </Button>
            )}
          </div>
        ))}
        {list.items.length === 0 && (
          <p className="text-sm text-muted-foreground py-10 text-center">{t("sharedNoGifts")}</p>
        )}
      </div>
    </div>
  );
}
