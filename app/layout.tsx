import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "ราคาทองวันนี้ | Gold Price Thailand",
  description:
    "ราคาทองคำแท่งและทองรูปพรรณวันนี้ อัพเดตล่าสุดจากสมาคมค้าทองคำ",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="th">
      <body style={{ fontFamily: "'DB Helvethaica X', sans-serif" }}>{children}</body>
    </html>
  );
}