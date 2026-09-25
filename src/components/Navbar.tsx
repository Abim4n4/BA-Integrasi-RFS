import React from "react";
import { Sidebar } from "./Sidebar.tsx";
import { User, ThemeMode, FontSizeMode } from "../types.ts";

interface NavbarProps {
  currentUser: User | null;
  activeTab: "form" | "table" | "po" | "linkbudget" | "admin" | "gas";
  onTabChange: (tab: "form" | "table" | "po" | "linkbudget" | "admin" | "gas") => void;
  currentTheme: ThemeMode;
  onThemeChange: (theme: ThemeMode) => void;
  fontSize?: FontSizeMode;
  onFontSizeChange?: (mode: FontSizeMode) => void;
  onLogout: () => void;
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
  mobileOpen?: boolean;
  onCloseMobile?: () => void;
}

/**
 * Backward-compatible wrapper that renders the new Vertical Sidebar Navigation
 */
export const Navbar: React.FC<NavbarProps> = (props) => {
  return <Sidebar {...props} />;
};

export { Sidebar };
