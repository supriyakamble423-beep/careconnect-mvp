import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "SafeCircle",
  description: "Family Routine Guardian",
  manifest: "/manifest.json",
  themeColor: "#326085",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="bg-background text-on-background antialiased" suppressHydrationWarning={true}>
        {children}
      </body>
    </html>
  );
}