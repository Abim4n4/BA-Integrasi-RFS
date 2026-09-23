import React, { useState, useRef, useEffect } from "react";
import { Palette, Check, Sparkles, ChevronDown } from "lucide-react";
import { ThemeMode } from "../types.ts";

interface ThemeSwitcherProps {
  currentTheme: ThemeMode;
  onThemeChange: (theme: ThemeMode) => void;
}

interface ThemeOption {
  id: ThemeMode;
  name: string;
  tag: string;
  desc: string;
  colors: string[];
  glow?: boolean;
}

const THEMES: ThemeOption[] = [
  {
    id: "day",
    name: "Day Mode",
    tag: "Terang",
    desc: "Nuansa putih bersih korporat",
    colors: ["#ffffff", "#2563eb", "#0f172a"]
  },
  {
    id: "night",
    name: "Night Mode",
    tag: "Gelap",
    desc: "Slate gelap elegan & nyaman di mata",
    colors: ["#111827", "#38bdf8", "#f9fafb"]
  },
  {
    id: "metrik",
    name: "Metrik Theme",
    tag: "Hijau Korporat",
    desc: "Nuansa hijau korporat bersih standar telekomunikasi",
    colors: ["#062b1e", "#10b981", "#ecfdf5"]
  },
  {
    id: "electric-neon",
    name: "Electric Neon",
    tag: "Cyber Cyan",
    desc: "Pendar cyan futuristik & border berpendar",
    colors: ["#071322", "#00f0ff", "#38bdf8"],
    glow: true
  },
  {
    id: "purple-neon",
    name: "Purple Neon",
    tag: "Luminous Violet",
    desc: "Aura magenta & ungu neon bercahaya",
    colors: ["#180829", "#d946ef", "#c084fc"],
    glow: true
  },
  {
    id: "blue-neon",
    name: "Blue Neon",
    tag: "Deep Cobalt",
    desc: "Cobalt blue neon dengan aksen futuristik",
    colors: ["#07152b", "#3b82f6", "#60a5fa"],
    glow: true
  }
];

export const ThemeSwitcher: React.FC<ThemeSwitcherProps> = ({
  currentTheme,
  onThemeChange
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const activeThemeObj = THEMES.find((t) => t.id === currentTheme) || THEMES[0];

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className="relative w-full" ref={dropdownRef} id="theme-switcher-container">
      <button
        id="theme-switcher-trigger"
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between gap-2 px-3 py-2 rounded-xl border text-xs font-semibold transition-all surface-card hover:surface-elevated active:scale-98 shadow-xs cursor-pointer"
        title="Ganti Tema Tampilan"
      >
        <div className="flex items-center gap-2 min-w-0">
          <Palette className="w-3.5 h-3.5 accent-color shrink-0" />
          <span className="truncate">{activeThemeObj.name}</span>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <span
            className="w-2.5 h-2.5 rounded-full border border-black/20"
            style={{
              backgroundColor: activeThemeObj.colors[1],
              boxShadow: activeThemeObj.glow ? `0 0 6px ${activeThemeObj.colors[1]}` : undefined
            }}
          />
          <ChevronDown
            className={`w-3.5 h-3.5 text-muted transition-transform duration-200 ${
              isOpen ? "rotate-180" : ""
            }`}
          />
        </div>
      </button>

      {isOpen && (
        <div
          id="theme-dropdown-menu"
          className="absolute left-0 right-0 mt-1.5 w-full rounded-xl p-1.5 z-50 surface-card shadow-xl backdrop-blur-md animate-in fade-in zoom-in-95 duration-150 border"
        >
          <div className="px-2 py-1.5 mb-1 border-b border-subtle flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-muted flex items-center gap-1.5">
              <Sparkles className="w-3 h-3 text-amber-400 shrink-0" />
              Tema Tampilan
            </span>
            <span className="text-[9px] text-dim font-medium">6 Preset</span>
          </div>

          <div className="space-y-1">
            {THEMES.map((theme) => {
              const isSelected = theme.id === currentTheme;
              return (
                <button
                  key={theme.id}
                  id={`theme-btn-${theme.id}`}
                  onClick={() => {
                    onThemeChange(theme.id);
                    setIsOpen(false);
                  }}
                  className={`w-full flex items-center justify-between px-2.5 py-2 rounded-lg text-left text-xs transition-all cursor-pointer ${
                    isSelected
                      ? "surface-elevated font-semibold ring-1 accent-border"
                      : "hover:surface-elevated text-muted hover:text-main"
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span
                      className="w-3.5 h-3.5 rounded-full shrink-0 border border-black/20 shadow-xs"
                      style={{
                        backgroundColor: theme.colors[1],
                        boxShadow: theme.glow ? `0 0 7px ${theme.colors[1]}` : undefined
                      }}
                    />
                    <span className="font-medium text-main text-xs truncate">{theme.name}</span>
                  </div>
                  {isSelected && <Check className="w-3.5 h-3.5 accent-color shrink-0 ml-1.5" />}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
