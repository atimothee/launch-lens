import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "LaunchLens — Turn customer noise into insight",
  description:
    "AI-powered research workflow for marketing teams. Go from vague idea to validated insight in minutes.",
  openGraph: {
    title: "LaunchLens",
    description: "Turn customer noise into insight.",
    url: "https://launchlens.app",
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
