"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Star, Loader2 } from "lucide-react";
import { useIsLoggedIn } from "@/hooks/use-is-logged-in";
import { getReviewEligibility, submitReview } from "@/lib/reviews-client";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type Status = "checking" | "hidden" | "already-reviewed" | "can-review" | "submitted";

export function WriteReviewForm({ productId }: { productId: string }) {
  const t = useTranslations("product");
  const loggedIn = useIsLoggedIn();
  const [status, setStatus] = useState<Status>("checking");
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // "checking" et "hidden" sont rendus de façon identique (rien) — pas besoin
  // de distinguer "pas connecté" via un setState, le statut reste "checking".
  useEffect(() => {
    if (loggedIn !== true) return;
    getReviewEligibility(productId)
      .then((e) => setStatus(e.alreadyReviewed ? "already-reviewed" : e.canReview ? "can-review" : "hidden"))
      .catch(() => setStatus("hidden"));
  }, [productId, loggedIn]);

  async function handleSubmit() {
    if (rating === 0) return;
    setSubmitting(true);
    setError(null);
    try {
      await submitReview(productId, rating, comment.trim());
      setStatus("submitted");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Une erreur est survenue");
    } finally {
      setSubmitting(false);
    }
  }

  if (status === "checking" || status === "hidden") return null;

  if (status === "already-reviewed") {
    return <p className="text-sm text-muted-foreground rounded-xl bg-secondary p-3">{t("alreadyReviewed")}</p>;
  }

  if (status === "submitted") {
    return <p className="text-sm text-brand-success rounded-xl bg-brand-primary-soft p-3">{t("reviewSubmitted")}</p>;
  }

  return (
    <div className="rounded-2xl border border-border bg-card p-4">
      <h3 className="font-bold text-sm mb-2.5">{t("writeReview")}</h3>
      <div className="flex items-center gap-1 mb-3">
        {Array.from({ length: 5 }).map((_, i) => {
          const value = i + 1;
          return (
            <button
              key={value}
              type="button"
              onClick={() => setRating(value)}
              onMouseEnter={() => setHoverRating(value)}
              onMouseLeave={() => setHoverRating(0)}
              aria-label={t("ratingStars", { n: value })}
            >
              <Star
                className={cn("size-6 text-brand-highlight", value <= (hoverRating || rating) ? "fill-current" : "")}
              />
            </button>
          );
        })}
      </div>
      <textarea
        value={comment}
        onChange={(e) => setComment(e.target.value)}
        placeholder={t("reviewPlaceholder")}
        rows={3}
        className="w-full rounded-lg border border-border px-3 py-2 text-sm mb-2.5"
      />
      {error && <p className="text-sm text-destructive mb-2">{error}</p>}
      <Button onClick={handleSubmit} disabled={rating === 0 || submitting} variant="cta" size="sm">
        {submitting && <Loader2 className="size-4 animate-spin" />}
        {t("submitReview")}
      </Button>
    </div>
  );
}
