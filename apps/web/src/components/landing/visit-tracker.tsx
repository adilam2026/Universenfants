"use client";

import { useEffect } from "react";
import { trackLandingPageVisit } from "@/lib/landing-pages-client";

export function VisitTracker({ slug }: { slug: string }) {
  useEffect(() => {
    trackLandingPageVisit(slug);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return null;
}
