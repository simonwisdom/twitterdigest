import type { Metadata } from "next";
import "./globals.css";

const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

export const metadata: Metadata = {
  title: "Weekly Digest",
  description:
    "A weekly digest of practical longevity research and European art residencies",
  alternates: {
    types: { "application/rss+xml": `${basePath}/feed.xml` },
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="mx-auto max-w-5xl px-6 py-12 sm:px-10">{children}</body>
    </html>
  );
}
