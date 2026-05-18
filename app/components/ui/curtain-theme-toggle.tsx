"use client";

import {
  useState,
  useCallback,
  useRef,
  useEffect,
  type ReactNode,
  type CSSProperties,
} from "react";

// ─── Types ────────────────────────────────────────────────────────────────────

export type Theme = "light" | "dark";

export interface AppBarProps {
  logo?: ReactNode;
  appName?: string;
  onSearch?: (query: string) => void;
  userAvatar?: ReactNode;
  userName?: string;
}

export interface ThemeToggleProps {
  variant?: "default" | "appbar" | "icon";
  appBarProps?: AppBarProps;
  defaultTheme?: Theme;
  barHeight?: number;
  buttonSize?: number;
  duration?: number;
  onThemeChange?: (theme: Theme) => void;
  children?: ReactNode;
}

// ─── Design tokens ────────────────────────────────────────────────────────────

const TOKENS: Record<Theme, Record<string, string>> = {
  light: {
    pageBg:    "#f3ede1",
    pageText:  "#1a1a1a",
    barBg:     "#1a1a1a",
    barText:   "#ffffff",
    barBorder: "rgba(255,255,255,0.07)",
    btnBg:     "#f3ede1",
    btnText:   "#1a1a1a",
    btnRing:   "rgba(255,255,255,0.15)",
    inputBg:   "rgba(255,255,255,0.1)",
    inputText: "#ffffff",
  },
  dark: {
    pageBg:    "#0e0e0e",
    pageText:  "#dfd8c6",
    barBg:     "#dfd8c6",
    barText:   "#1a1a1a",
    barBorder: "rgba(0,0,0,0.10)",
    btnBg:     "#0e0e0e",
    btnText:   "#dfd8c6",
    btnRing:   "rgba(0,0,0,0.25)",
    inputBg:   "rgba(0,0,0,0.08)",
    inputText: "#1a1a1a",
  },
};

// ─── Icons ────────────────────────────────────────────────────────────────────

function MoonIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
    </svg>
  );
}

function SunIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="4" />
      <line x1="12" y1="1"     x2="12" y2="3"     />
      <line x1="12" y1="21"    x2="12" y2="23"    />
      <line x1="4.22"  y1="4.22"  x2="5.64"  y2="5.64"  />
      <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
      <line x1="1"     y1="12"    x2="3"     y2="12"    />
      <line x1="21"    y1="12"    x2="23"    y2="12"    />
      <line x1="4.22"  y1="19.78" x2="5.64"  y2="18.36" />
      <line x1="18.36" y1="5.64"  x2="19.78" y2="4.22"  />
    </svg>
  );
}

// ─── Component ────────────────────────────────────────────────────────────────

type CurtainPhase = "idle" | "falling" | "rising";
const EASING = "cubic-bezier(0.76, 0, 0.24, 1)";

export function ThemeToggle({
  variant      = "default",
  appBarProps,
  defaultTheme = "light",
  barHeight: explicitBarHeight,
  buttonSize   = 36,
  duration     = 550,
  onThemeChange,
  children,
}: ThemeToggleProps) {
  const isAppBar = variant === "appbar";
  const isIcon = variant === "icon";
  const barHeight = explicitBarHeight ?? (isAppBar ? 60 : 44);

  const [theme, setTheme]     = useState<Theme>(defaultTheme);
  const [phase, setPhase]     = useState<CurtainPhase>("idle");
  const [hovered, setHovered] = useState(false);
  const [pressed, setPressed] = useState(false);
  const curtainColorRef       = useRef<string>("");
  const t                     = TOKENS[theme];

  useEffect(() => {
    if (typeof document !== "undefined") {
      const isDark = document.documentElement.classList.contains("dark");
      if (isDark && theme !== "dark") setTheme("dark");
      else if (!isDark && theme !== "light") setTheme("light");
    }
  }, []);

  const toggle = useCallback(() => {
    if (phase !== "idle") return;
    const next: Theme = theme === "light" ? "dark" : "light";
    curtainColorRef.current = TOKENS[next].pageBg;
    setPhase("falling");

    setTimeout(() => {
      setTheme(next);
      onThemeChange?.(next);
      
      if (typeof document !== "undefined") {
        if (next === "dark") document.documentElement.classList.add("dark");
        else document.documentElement.classList.remove("dark");
      }

      setPhase("rising");
      setTimeout(() => setPhase("idle"), duration + 60);
    }, duration);
  }, [phase, theme, duration, onThemeChange]);

  const btnScale = pressed ? 0.96 : hovered ? 1.1 : 1;
  const btnStyle: CSSProperties = {
    position: "relative",
    width: buttonSize,
    height: buttonSize,
    borderRadius: "50%",
    border: "none",
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    background: t.btnBg,
    color: t.btnText,
    boxShadow: `0 0 0 1.5px ${t.btnRing}`,
    zIndex: 9999,
    outline: "none",
    transform: `scale(${btnScale})`,
    transition: "background 0.3s ease, color 0.3s ease, transform 0.15s ease",
  };

  const curtainStyle: CSSProperties = {
    position: "fixed",
    inset: 0,
    background: curtainColorRef.current,
    transformOrigin: "top",
    transform: phase === "falling" ? "scaleY(1)" : "scaleY(0)",
    transition: phase !== "idle" ? `transform ${duration}ms ${EASING}` : "none",
    zIndex: 9997,
    pointerEvents: "none",
  };

  return (
    <>
      <div aria-hidden="true" style={curtainStyle} />
      <button
        style={btnStyle}
        onClick={toggle}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => { setHovered(false); setPressed(false); }}
        onMouseDown={() => setPressed(true)}
        onMouseUp={() => setPressed(false)}
      >
        {theme === "light" ? <MoonIcon /> : <SunIcon />}
      </button>
    </>
  );
}