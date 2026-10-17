import type { Metadata } from "next";
import { SlidesDeck } from "./SlidesDeck";

export const metadata: Metadata = {
  title: "Aperture · Pitch",
  description: "The week chooses the courses. A six-slide Aperture pitch.",
  robots: { index: false, follow: false },
};

export default function SlidesPage() {
  return <SlidesDeck />;
}
