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
      <head>
        {/* Fonts aur Icons yahan se direct load honge bina kisi error ke */}
        <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Atkinson+Hyperlegible+Next:wght@400;600;700&display=swap" />
        <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap" />
      </head>
      <body className="bg-background text-on-background antialiased" suppressHydrationWarning={true}>
        {children}
      </body>
    </html>
  );
}