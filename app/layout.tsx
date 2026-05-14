import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "CareConnect",
  description: "Stay connected with your loved ones",
  manifest: "/manifest.json", // PWA Install ka jadu yahan se chalega
  themeColor: "#2563eb",      // Mobile me app kholne par top bar blue dikhega
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      {/* suppressHydrationWarning se browser extension wala error fix ho jayega */}
      <body className="bg-gray-50 text-gray-900 antialiased" suppressHydrationWarning={true}>
        {children}
      </body>
    </html>
  );
}