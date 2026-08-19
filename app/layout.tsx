import type { Metadata } from "next";
import { Instrument_Serif } from "next/font/google";
import "./globals.css";

// Editorial New is a licensed font; Instrument Serif is the closest Google
// Font and loads as the webfont. If Editorial New is installed locally it
// takes precedence via the font stack in globals.css.
const instrumentSerif = Instrument_Serif({
  weight: "400",
  subsets: ["latin"],
  variable: "--font-instrument-serif",
});

export const metadata: Metadata = {
  title: "twitternews",
  description: "Daily themed digest of Twitter discussion",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={instrumentSerif.variable}>
      <body className="mx-auto max-w-5xl px-6 py-12 sm:px-10">{children}</body>
    </html>
  );
}
