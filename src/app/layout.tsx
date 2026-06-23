import type { Metadata, Viewport } from "next";
import { Audiowide, Inter } from "next/font/google";
import "./globals.css";

// Art-deco italic display font for headers (GTA 6 logo vibe)
const display = Audiowide({
  subsets: ["latin"],
  weight: "400",
  variable: "--font-display",
  display: "swap",
});

// Clean readable sans for body
const body = Inter({
  subsets: ["latin"],
  variable: "--font-body",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Cousins Game Night",
  description: "Casual multiplayer party games for the whole crew.",
};

// Mobile-first: lock to portrait, no zoom on input focus
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
  themeColor: "#0B0420",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${display.variable} ${body.variable} font-body antialiased`}
      >
        <div className="app-shell">{children}</div>
      </body>
    </html>
  );
}
