import "~/styles/globals.css";

import { type Metadata } from "next";
import { Inter, Outfit } from "next/font/google";
import { ClerkProvider } from "@clerk/nextjs";

import { TRPCReactProvider } from "~/trpc/react";
import { Toaster } from "sonner";

export const metadata: Metadata = {
  title: "Ask Your Repo | AI-Powered Repository Intelligence",
  description: "Chat with your codebase, visualize dependencies, and maintain your streak with AI-powered commits.",
  icons: [{ rel: "icon", url: "/gitgodlogo.jpg" }],
};

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

const outfit = Outfit({
  subsets: ["latin"],
  variable: "--font-outfit",
});

import { ThemeProvider } from "~/components/theme-provider";

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <ClerkProvider>
      <html lang="en" className={`${inter.variable} ${outfit.variable} font-sans`} suppressHydrationWarning>
        <body>
          <ThemeProvider
            attribute="class"
            defaultTheme="system"
            enableSystem
            disableTransitionOnChange
          >
            <TRPCReactProvider>{children}</TRPCReactProvider>
          </ThemeProvider>
          <Toaster />
        </body>
      </html>
    </ClerkProvider>
  );
}
