import type { Metadata } from "next";
import { LandingPage } from "@/components/landing/LandingPage";
import { LANDING_CONTENT } from "@/lib/landing-content";

export const metadata: Metadata = {
  title: LANDING_CONTENT.meta.title,
  description: LANDING_CONTENT.meta.description,
};

export default function Page() {
  return <LandingPage />;
}
