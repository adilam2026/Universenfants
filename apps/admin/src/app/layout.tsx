import type { Metadata } from "next";
import "./globals.css";

const fontVars = "[--font-family-sans:-apple-system,BlinkMacSystemFont,'Segoe_UI',Roboto,system-ui,sans-serif]";

export const metadata: Metadata = {
  title: {
    default: "UniversEnfants — Back-Office",
    template: "%s · Back-Office UniversEnfants",
  },
  description: "Administration UniversEnfants",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="fr" className={`h-full antialiased ${fontVars}`}>
      <body className="min-h-full flex flex-col font-sans">{children}</body>
    </html>
  );
}
