// src/app/layout.tsx
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { ClerkProvider } from "@clerk/nextjs";
import ConvexClientProvider from "./ConvexClientProvider";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "T3 Chat Clone",
  description: "Building a T3 Chat Clone",
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
          <script
            defer
            data-website-id="684a2754569da665c6b838ca"
            data-domain="t3-clone-hackathon.vercel.app"
            src="https://datafa.st/js/script.js"
          ></script>
        </head>
        <body className={inter.className}>
          <ConvexClientProvider>{children}</ConvexClientProvider>
        </body>
      </html>
    </ClerkProvider>
  );
}
