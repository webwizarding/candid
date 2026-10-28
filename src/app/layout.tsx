import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import { AppShell } from "@/components/shell/app-shell";
import { Providers } from "@/components/providers";
import "./globals.css";
const geist = localFont({
  src: [
    {
      path: "../../assets/og/Geist-Medium.ttf",
      weight: "400 500",
      style: "normal",
    },
    {
      path: "../../assets/og/Geist-SemiBold.ttf",
      weight: "600 800",
      style: "normal",
    },
  ],
  variable: "--font-geist-sans",
  display: "swap",
});
export const metadata: Metadata = {
  title: {
    default: "Candid · Your semester, in focus",
    template: "%s · Candid",
  },
  description:
    "A private, local calendar and study planner for students and university clubs.",
  applicationName: "Candid",
  robots: { index: false, follow: false },
};
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#f8f8f8",
};
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${geist.variable} h-full`}
    >
      <body className="h-full overflow-hidden">
        <Providers>
          <AppShell>{children}</AppShell>
        </Providers>
      </body>
    </html>
  );
}
