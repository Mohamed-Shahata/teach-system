import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { LandingPage } from "@/components/landing/landing-page";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("landing");
  return {
    title: t("metaTitle"),
    description: t("metaDescription"),
  };
}

export default function HomePage() {
  return <LandingPage />;
}
