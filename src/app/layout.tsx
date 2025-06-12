// src/app/layout.tsx
import type { Metadata } from "next";
import { Figtree } from "next/font/google";
import "./globals.css";
import Script from "next/script";
import { ClerkProvider } from "@clerk/nextjs";
import ConvexClientProvider from "./ConvexClientProvider";
import { Toaster } from "@/components/ui/sonner";

const figtree = Figtree({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  style: ["normal", "italic"],
});

export const metadata: Metadata = {
  title: "T3.1 Chat Clone",
  description: "Building a T3.1 Chat Clone",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <ClerkProvider>
      <html lang="en">
        <head>
          <Script
            data-website-id="684a2754569da665c6b838ca"
            data-domain="t3-clone-hackathon.vercel.app"
            src="/js/script.js"
            strategy="afterInteractive"
          />
        </head>
        <body className={figtree.className}>
          <ConvexClientProvider>{children}</ConvexClientProvider>
          <Toaster />
        </body>
      </html>
    </ClerkProvider>
  );
}
