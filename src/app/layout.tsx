import type { Metadata } from "next";
import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { site } from "@/lib/seo/site";
import "@/styles/globals.css";

export const metadata: Metadata = {
  metadataBase: new URL(site.url),
  title: { default: "TechIdea — Free Online Tools, Calculators & Public APIs", template: "%s | TechIdea" },
  description: site.description,
  applicationName: site.name,
  robots: { index: site.indexable, follow: site.indexable },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body className="flex min-h-screen flex-col"><a className="skip-link" href="#main-content">Skip to content</a><Header /><main id="main-content" tabIndex={-1} className="flex-1">{children}</main><Footer /></body></html>;
}
