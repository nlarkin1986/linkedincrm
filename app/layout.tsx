import type { Metadata } from "next";
import "../src/styles/globals.css";

export const metadata: Metadata = {
  title: "LinkedIn Connections Tracker",
  description: "Gladly relationship intelligence dashboard for LinkedIn follow-up workflows."
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
