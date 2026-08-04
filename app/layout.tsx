import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL("https://after-now.com"),
  title: "After Now / 此刻之后",
  description:
    "After Now is an independent creative practice exploring identity, digital experience, space, and emerging technology.",
  applicationName: "After Now",
  keywords: [
    "After Now",
    "此刻之后",
    "creative practice",
    "design",
    "digital experience",
    "AI",
  ],
  openGraph: {
    title: "After Now / 此刻之后",
    description: "Designing What Comes Next.",
    url: "/",
    siteName: "After Now",
    locale: "zh_CN",
    type: "website",
  },
};

export const viewport: Viewport = {
  themeColor: "#080908",
  colorScheme: "dark",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      <body>{children}</body>
    </html>
  );
}
