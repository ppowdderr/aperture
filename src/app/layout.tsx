import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Aperture",
  description: "Describe the week you want; get back the legal course choices that produce it.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="antialiased">{children}</body>
    </html>
  );
}
