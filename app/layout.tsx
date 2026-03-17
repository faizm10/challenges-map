import type { Metadata } from "next";
import { Fraunces, Space_Grotesk } from "next/font/google";

import "@/app/globals.css";
import { ToasterProvider } from "@/components/ui/toaster";

const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-space-grotesk",
});

const fraunces = Fraunces({
  subsets: ["latin"],
  variable: "--font-fraunces",
});

export const metadata: Metadata = {
  title: "Race to Union",
  description: "A team-based Toronto race to Union Station with HQ controls and a live leaderboard.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${spaceGrotesk.variable} ${fraunces.variable} font-sans antialiased`}>
        <ToasterProvider>{children}</ToasterProvider>
      </body>
    </html>
  );
}
