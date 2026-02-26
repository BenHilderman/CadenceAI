import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "CadenceAI - Voice-first scheduling",
    template: "%s - CadenceAI",
  },
  description: "Voice AI that checks your real calendar, finds the best slots, and books meetings with a Meet link.",
  openGraph: {
    title: "CadenceAI - Voice-first scheduling",
    description: "Voice AI that checks your real calendar, finds the best slots, and books meetings with a Meet link.",
    type: "website",
  },
  verification: {
    google: "vuCB_12sF_gVV1aJjbENdFSwcRCPrrBhSiWL-ZSWENo",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-background text-foreground grain`}
      >
        {children}
      </body>
    </html>
  );
}
