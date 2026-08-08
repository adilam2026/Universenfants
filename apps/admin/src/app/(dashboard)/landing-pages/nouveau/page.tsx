"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { LandingPageForm } from "@/components/landing-page-form";

function NewLandingPageInner() {
  const productId = useSearchParams().get("productId") ?? undefined;
  return <LandingPageForm initialProductId={productId} />;
}

export default function NewLandingPage() {
  return (
    <div>
      <h1 className="text-xl font-bold mb-5">Nouvelle landing page</h1>
      <Suspense>
        <NewLandingPageInner />
      </Suspense>
    </div>
  );
}
