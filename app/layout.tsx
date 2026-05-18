import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "LEPS Admin",
  description: "Frontend admin panel for Licensing Engine for PHP Script",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body>{children}</body>
    </html>
  );
}
