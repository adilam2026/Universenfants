"use client";

import { Suspense, useEffect, useState, type FormEvent } from "react";
import { useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { PackageSearch } from "lucide-react";
import { Button } from "@/components/ui/button";
import { OrderDetailView } from "@/components/order-detail-view";
import {
  requestTrackingOtp,
  verifyTrackingOtp,
  getTrackedOrder,
  getGuestTrackingToken,
  clearGuestTrackingToken,
} from "@/lib/order-tracking-client";
import type { OrderDetail } from "@/lib/auth-client";

const RESEND_COOLDOWN_S = 60;

// useSearchParams() exige une frontière Suspense en page top-level (même
// motif que /checkout et /panier) — reprend le numéro de commande passé
// depuis la page de confirmation ("Suivre ma commande").
export default function OrderTrackingPage() {
  return (
    <Suspense>
      <OrderTrackingPageContent />
    </Suspense>
  );
}

function OrderTrackingPageContent() {
  const t = useTranslations("orderTracking");
  const tOrders = useTranslations("orders");
  const searchParams = useSearchParams();
  const [step, setStep] = useState<"loading" | "request" | "otp" | "result">("loading");
  const [orderNumber, setOrderNumber] = useState(searchParams.get("orderNumber") ?? "");
  const [maskedPhone, setMaskedPhone] = useState<string | null>(null);
  const [code, setCode] = useState("");
  const [order, setOrder] = useState<OrderDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);

  // Reprise de session : un jeton de suivi encore valide (30 min côté API)
  // permet de retrouver directement la commande après un rafraîchissement
  // de page, sans redemander de code.
  useEffect(() => {
    if (!getGuestTrackingToken()) {
      setStep("request");
      return;
    }
    getTrackedOrder()
      .then((o) => {
        setOrder(o);
        setStep("result");
      })
      .catch(() => {
        clearGuestTrackingToken();
        setStep("request");
      });
  }, []);

  useEffect(() => {
    if (resendCooldown <= 0) return;
    const id = setInterval(() => setResendCooldown((s) => Math.max(0, s - 1)), 1000);
    return () => clearInterval(id);
  }, [resendCooldown]);

  async function handleRequestOtp(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setSending(true);
    try {
      const res = await requestTrackingOtp(orderNumber.trim());
      setMaskedPhone(res.maskedPhone);
      setCode("");
      setStep("otp");
      setResendCooldown(RESEND_COOLDOWN_S);
    } catch (err) {
      setError(err instanceof Error ? err.message : t("genericError"));
    } finally {
      setSending(false);
    }
  }

  async function handleResend() {
    if (resendCooldown > 0) return;
    setError(null);
    try {
      const res = await requestTrackingOtp(orderNumber.trim());
      setMaskedPhone(res.maskedPhone);
      setResendCooldown(RESEND_COOLDOWN_S);
    } catch (err) {
      setError(err instanceof Error ? err.message : t("genericError"));
    }
  }

  async function handleVerify(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setVerifying(true);
    try {
      await verifyTrackingOtp(orderNumber.trim(), code.trim());
      setOrder(await getTrackedOrder());
      setStep("result");
    } catch (err) {
      setError(err instanceof Error ? err.message : t("genericError"));
    } finally {
      setVerifying(false);
    }
  }

  function handleTrackAnother() {
    clearGuestTrackingToken();
    setOrder(null);
    setOrderNumber("");
    setCode("");
    setMaskedPhone(null);
    setError(null);
    setStep("request");
  }

  if (step === "loading") {
    return <div className="mx-auto max-w-md px-4 py-16 text-center text-muted-foreground">{t("loading")}</div>;
  }

  if (step === "result" && order) {
    return (
      <div className="mx-auto max-w-3xl px-4 md:px-7 py-6">
        <div className="flex items-center justify-between mb-5 flex-wrap gap-2">
          <h1 className="font-display text-xl font-extrabold">{order.orderNumber}</h1>
          <span className="rounded-full bg-secondary px-3 py-1 text-xs font-bold">
            {tOrders(`status.${order.status}` as never)}
          </span>
        </div>
        <OrderDetailView order={order} />
        <button
          type="button"
          onClick={handleTrackAnother}
          className="mt-4 text-sm font-bold text-primary hover:opacity-80"
        >
          {t("trackAnother")}
        </button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-md px-4 py-10">
      <PackageSearch className="mx-auto size-10 text-primary mb-3" />
      <h1 className="font-display text-2xl font-extrabold text-center mb-1.5">{t("title")}</h1>
      <p className="text-sm text-muted-foreground text-center mb-6">{t("subtitle")}</p>

      {step === "request" && (
        <form onSubmit={handleRequestOtp} className="flex flex-col gap-3.5">
          <div className="flex flex-col gap-1.5">
            <label htmlFor="orderNumber" className="text-xs font-bold text-muted-foreground">
              {t("orderNumberLabel")}
            </label>
            <input
              id="orderNumber"
              value={orderNumber}
              onChange={(e) => setOrderNumber(e.target.value)}
              required
              placeholder={t("orderNumberPlaceholder")}
              className="rounded-lg border border-border px-3 py-2.5 text-sm"
            />
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <Button type="submit" variant="cta" disabled={sending}>
            {sending ? t("sending") : t("sendCode")}
          </Button>
        </form>
      )}

      {step === "otp" && (
        <form onSubmit={handleVerify} className="flex flex-col gap-3.5">
          <p className="text-sm rounded-xl bg-brand-highlight-soft text-brand-highlight-foreground p-3">
            {maskedPhone ? t("otpSentTo", { phone: maskedPhone }) : t("otpSentGeneric")}
          </p>
          <div className="flex flex-col gap-1.5">
            <label htmlFor="otpCode" className="text-xs font-bold text-muted-foreground">
              {t("codeLabel")}
            </label>
            <input
              id="otpCode"
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
              required
              inputMode="numeric"
              autoComplete="one-time-code"
              placeholder={t("codePlaceholder")}
              className="rounded-lg border border-border px-3 py-2.5 text-center text-lg font-bold tracking-[0.3em]"
            />
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <Button type="submit" variant="cta" disabled={verifying || code.length !== 6}>
            {verifying ? t("verifying") : t("verify")}
          </Button>
          <button
            type="button"
            onClick={handleResend}
            disabled={resendCooldown > 0}
            className="text-sm font-bold text-primary disabled:text-muted-foreground disabled:cursor-not-allowed"
          >
            {resendCooldown > 0 ? t("resendIn", { n: resendCooldown }) : t("resend")}
          </button>
          <button
            type="button"
            onClick={() => setStep("request")}
            className="text-xs text-muted-foreground hover:text-foreground"
          >
            {t("changeOrderNumber")}
          </button>
        </form>
      )}
    </div>
  );
}
