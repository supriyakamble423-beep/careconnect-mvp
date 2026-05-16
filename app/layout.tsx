import type { Metadata } from "next";

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
        {/* 1. Direct Google Fonts & Icons */}
        <link href="https://fonts.googleapis.com/css2?family=Atkinson+Hyperlegible+Next:wght@400;600;700&display=swap" rel="stylesheet" />
        <link href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap" rel="stylesheet" />

        {/* 2. MANUAL TAILWIND BYPASS (Ye Vercel ke error ko override karega) */}
        <script src="https://cdn.tailwindcss.com"></script>
        <script dangerouslySetInnerHTML={{
          __html: `
            tailwind.config = {
              theme: {
                extend: {
                  colors: {
                    "primary": "#326085",
                    "on-primary": "#ffffff",
                    "primary-container": "#4c799f",
                    "on-primary-container": "#fdfcff",
                    "primary-fixed": "#cde5ff",
                    "secondary": "#4a6549",
                    "secondary-container": "#ccebc7",
                    "on-secondary-container": "#506b4f",
                    "secondary-fixed": "#ccebc7",
                    "tertiary": "#7f5221",
                    "tertiary-fixed": "#ffdcbe",
                    "error": "#ba1a1a",
                    "on-error": "#ffffff",
                    "error-container": "#ffdad6",
                    "on-error-container": "#93000a",
                    "background": "#f8f9fa",
                    "on-background": "#191c1d",
                    "surface": "#f8f9fa",
                    "on-surface": "#191c1d",
                    "surface-variant": "#e1e3e4",
                    "on-surface-variant": "#42474e",
                    "outline-variant": "#c2c7cf",
                    "surface-container-lowest": "#ffffff",
                    "surface-container-low": "#f3f4f5",
                    "surface-container": "#edeeef",
                    "surface-container-high": "#e7e8e9",
                  }
                }
              }
            }
          `
        }}></script>

        {/* 3. Manual CSS Adjustments */}
        <style dangerouslySetInnerHTML={{
          __html: `
            body { font-family: 'Atkinson Hyperlegible Next', sans-serif; background-color: #f8f9fa; color: #191c1d; }
            .material-symbols-outlined { font-family: 'Material Symbols Outlined' !important; font-variation-settings: 'FILL' 0, 'wght' 400, 'GRAD' 0, 'opsz' 24; }
            .no-scrollbar::-webkit-scrollbar { display: none; }
            .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
          `
        }}></style>
      </head>

      <body suppressHydrationWarning={true}>
        {children}
      </body>
    </html>
  );
}