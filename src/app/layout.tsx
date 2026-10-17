import { Atkinson_Hyperlegible_Next } from "next/font/google";
import type { Metadata } from "next";
import "./globals.css";

const chatFont = Atkinson_Hyperlegible_Next({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-atkinson",
});

export const metadata: Metadata = {
  title: "Aperture",
  description: "Describe the week you want; get back the legal course choices that produce it.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={chatFont.variable}>
      <body className="antialiased">{children}</body>
    </html>
  );
}
