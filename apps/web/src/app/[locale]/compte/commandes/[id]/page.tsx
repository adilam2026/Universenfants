"use client";

import { use, useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { getMyOrder, cancelMyOrder, type OrderDetail } from "@/lib/auth-client";
import { OrderDetailView } from "@/components/order-detail-view";
import { Button } from "@/components/ui/button";
import { useIsLoggedIn } from "@/hooks/use-is-logged-in";

export default function OrderDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const t = useTranslations("orders");
  const [order, setOrder] = useState<OrderDetail | null>(null);
  const loggedIn = useIsLoggedIn();
  const [error, setError] = useState<string | null>(null);
  const [cancelling, setCancelling] = useState(false);
  const [cancelError, setCancelError] = useState<string | null>(null);

  async function handleCancel() {
    if (!window.confirm(t("cancelConfirm"))) return;
    setCancelling(true);
    setCancelError(null);
    try {
      setOrder(await cancelMyOrder(id));
    } catch {
      setCancelError(t("cancelError"));
    } finally {
      setCancelling(false);
    }
  }

  useEffect(() => {
    if (loggedIn !== true) return;
    getMyOrder(id)
      .then(setOrder)
      .catch(() => setError(t("notFound")));
  }, [id, t, loggedIn]);

  if (loggedIn === null) return null;
  if (!loggedIn) {
    return (
      <div className="mx-auto max-w-md px-4 py-16 text-center">
        <p className="text-muted-foreground mb-4">{t("orderDetailLoginPrompt")}</p>
        <Link href="/compte" className="text-primary font-bold text-sm">{t("login")}</Link>
      </div>
    );
  }
  if (error) return <div className="mx-auto max-w-md px-4 py-16 text-center text-muted-foreground">{error}</div>;
  if (!order) return <div className="mx-auto max-w-3xl px-4 py-16 text-center text-muted-foreground">…</div>;

  return (
    <div className="mx-auto max-w-3xl px-4 md:px-7 py-6">
      <p className="text-xs text-muted-foreground mb-1">
        <Link href="/compte/commandes" className="hover:text-foreground">{t("title")}</Link> › {order.orderNumber}
      </p>
      <div className="flex items-center justify-between mb-5 flex-wrap gap-2">
        <h1 className="font-display text-xl font-extrabold">{order.orderNumber}</h1>
        <span className="rounded-full bg-secondary px-3 py-1 text-xs font-bold">{t(`status.${order.status}` as never)}</span>
      </div>

      <OrderDetailView order={order} />

      {["PENDING", "CONFIRMED", "PREPARING"].includes(order.status) && (
        <div className="mt-4">
          {cancelError && <p className="text-sm text-destructive mb-2">{cancelError}</p>}
          <Button variant="outline" onClick={handleCancel} disabled={cancelling}>
            {cancelling ? t("cancelling") : t("cancelOrder")}
          </Button>
        </div>
      )}
    </div>
  );
}
