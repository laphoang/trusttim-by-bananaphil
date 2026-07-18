import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "TrustTim — Bệnh viện Tim Hà Nội",
  description:
    "TrustTim — trợ lý chăm sóc khách hàng AI của Bệnh viện Tim Hà Nội (Team BananaPhil, VAIC 2026).",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="vi">
      <body className="antialiased">{children}</body>
    </html>
  );
}
