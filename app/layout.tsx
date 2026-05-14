import type { Metadata } from "next";
import { ClerkProvider } from "@clerk/nextjs";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

import {
  clerkAfterSignInUrl,
  clerkAfterSignUpUrl,
  clerkAppearance,
  clerkSignInUrl,
  clerkSignUpUrl,
} from "@/lib/clerk-appearance";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "GhostAI",
  description: "GhostAI application",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} dark h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <ClerkProvider
          appearance={clerkAppearance}
          signInUrl={clerkSignInUrl}
          signUpUrl={clerkSignUpUrl}
          signInFallbackRedirectUrl={clerkAfterSignInUrl}
          signUpFallbackRedirectUrl={clerkAfterSignUpUrl}
        >
          {children}
        </ClerkProvider>
      </body>
    </html>
  );
}
