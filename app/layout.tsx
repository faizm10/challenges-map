import type { Metadata } from "next";
import localFont from "next/font/local";

import "@/app/globals.css";
import { ToasterProvider } from "@/components/ui/toaster";

const departureMono = localFont({
  src: [
    {
      path: "../public/fonts/DepartureMono-Regular.woff2",
      weight: "400",
      style: "normal",
    },
    {
      path: "../public/fonts/DepartureMono-Regular.woff",
      weight: "400",
      style: "normal",
    },
    {
      path: "../public/fonts/DepartureMono-Regular.otf",
      weight: "400",
      style: "normal",
    },
  ],
  variable: "--font-departure-mono",
});

export const metadata: Metadata = {
  metadataBase: new URL("https://converge.city"),
  applicationName: "Converge",
  title: {
    default: "Converge",
    template: "%s | Converge",
  },
  description:
    "Converge is a Toronto team city challenge with live HQ prompts, checkpoint tracking, media proof, and real-time event control.",
  keywords: [
    "Converge",
    "Toronto team challenge",
    "city challenge game",
    "HQ challenge dashboard",
    "team checkpoints",
    "live event leaderboard",
    "Toronto walking game",
  ],
  openGraph: {
    title: "Converge",
    description:
      "A premium Toronto team city challenge with live HQ control, checkpoints, media proof, and convergence gameplay.",
    siteName: "Converge",
    type: "website",
    locale: "en_CA",
  },
  twitter: {
    card: "summary_large_image",
    title: "Converge",
    description:
      "Toronto team city challenge with live HQ prompts, checkpoints, media proof, and a real-time leaderboard.",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${departureMono.variable} font-sans antialiased`}>
        <ToasterProvider>{children}</ToasterProvider>
      </body>
    </html>
  );
}
