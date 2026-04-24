import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "LaunchLens — Customer conversations + signals, into sharper positioning",
  description:
    "LaunchLens helps teams turn customer conversations and online signals into sharper positioning, messaging, and growth opportunities.",
  openGraph: {
    title: "LaunchLens",
    description:
      "Turn customer conversations and online signals into sharper positioning and messaging.",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="noise">{children}</body>
    </html>
  );
}
