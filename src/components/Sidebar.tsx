import React, { useState, useEffect } from "react";
import {
  FileText,
  TableProperties,
  ShieldCheck,
  Code2,
  Clock,
  LogOut,
  X,
  ChevronRight,
  Activity,
  Layers,
  PackageCheck,
  Gauge
} from "lucide-react";
import { User, ThemeMode, FontSizeMode } from "../types.ts";
import { ThemeSwitcher } from "./ThemeSwitcher.tsx";

interface SidebarProps {
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

export const Sidebar: React.FC<SidebarProps> = ({
  currentUser,
  activeTab,
  onTabChange,
  currentTheme,
  onThemeChange,
  fontSize = "waspang",
  onFontSizeChange,
  onLogout,
  isCollapsed = false,
  onToggleCollapse,
  mobileOpen = false,
  onCloseMobile
}) => {
  const [currentTime, setCurrentTime] = useState<string>("");

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      const timeStr = now.toLocaleTimeString("id-ID", {
        hour12: false,
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit"
      });
      const dateStr = now.toLocaleDateString("id-ID", {
        weekday: "short",
        day: "numeric",
        month: "short"
      });
      setCurrentTime(`${dateStr} • ${timeStr} WIB`);
    };

    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  const handleNavClick = (tab: "form" | "table" | "po" | "linkbudget" | "admin" | "gas") => {
    onTabChange(tab);
    if (onCloseMobile) {
      onCloseMobile();
    }
  };

  return (
    <>
      {/* Mobile Backdrop Overlay */}
      {mobileOpen && (
        <div
          onClick={onCloseMobile}
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm md:hidden transition-opacity duration-300"
          aria-hidden="true"
        />
      )}

      {/* Vertical Sidebar Container */}
      <aside
        className={`fixed top-0 bottom-0 left-0 z-50 flex flex-col surface-card border-r transition-all duration-300 ease-in-out shadow-xl md:shadow-none ${
          isCollapsed ? "md:w-20" : "md:w-64"
        } ${
          mobileOpen ? "translate-x-0 w-72" : "-translate-x-full md:translate-x-0"
        }`}
      >
        {/* Brand Header: Bima Waluya Apps */}
        <div className="p-3.5 border-b border-subtle flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5 overflow-hidden">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-600 to-teal-800 text-white flex items-center justify-center font-extrabold text-xs shadow-md shrink-0 tracking-wider">
              BWA
            </div>
            {(!isCollapsed || mobileOpen) && (
              <div className="min-w-0">
                <h1 className="text-xs font-extrabold text-main tracking-tight truncate">
                  Bima Waluya Apps
                </h1>
                <p className="text-[9.5px] text-muted truncate">
                  Telecom &amp; Network Portal
                </p>
              </div>
            )}
          </div>
          {mobileOpen && (
            <button
              onClick={onCloseMobile}
              className="p-1.5 rounded-lg text-muted hover:text-main hover:surface-elevated transition-colors md:hidden shrink-0"
              aria-label="Tutup Menu"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Navigation Menu List */}
        <div className="flex-1 overflow-y-auto px-3 py-4 space-y-6 no-scrollbar">
          {/* Section: Menu Utama */}
          <div className="space-y-1.5">
            {(!isCollapsed || mobileOpen) && (
              <p className="px-3 text-[10px] font-bold uppercase tracking-wider text-muted">
                Menu Utama
              </p>
            )}

            {/* 1. Form BA-RFS */}
            <button
              id="tab-btn-form"
              onClick={() => handleNavClick("form")}
              title="Form BA-RFS"
              className={`w-full relative flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold transition-all group ${
                activeTab === "form"
                  ? "surface-elevated text-main font-bold border border-subtle shadow-sm neon-glow"
                  : "text-muted hover:text-main hover:surface-elevated"
              }`}
            >
              {/* Active Indicator Line on the left */}
              {activeTab === "form" && (
                <span className="absolute left-0 top-2 bottom-2 w-1 rounded-r-full accent-bg shadow-[0_0_10px_var(--accent)]" />
              )}
              <div
                className={`p-1.5 rounded-lg transition-colors ${
                  activeTab === "form"
                    ? "accent-bg text-white shadow-sm"
                    : "surface-muted text-muted group-hover:text-main"
                }`}
              >
                <FileText className="w-4 h-4 shrink-0" />
              </div>
              {(!isCollapsed || mobileOpen) && (
                <span className="truncate flex-1 text-left">Form BA-RFS</span>
              )}
              {(!isCollapsed || mobileOpen) && activeTab === "form" && (
                <ChevronRight className="w-3.5 h-3.5 accent-color shrink-0 ml-auto" />
              )}
            </button>

            {/* 2. Tbl Rek BA */}
            <button
              id="tab-btn-table"
              onClick={() => handleNavClick("table")}
              title="Tbl Rek BA"
              className={`w-full relative flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold transition-all group ${
                activeTab === "table"
                  ? "surface-elevated text-main font-bold border border-subtle shadow-sm neon-glow"
                  : "text-muted hover:text-main hover:surface-elevated"
              }`}
            >
              {activeTab === "table" && (
                <span className="absolute left-0 top-2 bottom-2 w-1 rounded-r-full accent-bg shadow-[0_0_10px_var(--accent)]" />
              )}
              <div
                className={`p-1.5 rounded-lg transition-colors ${
                  activeTab === "table"
                    ? "accent-bg text-white shadow-sm"
                    : "surface-muted text-muted group-hover:text-main"
                }`}
              >
                <TableProperties className="w-4 h-4 shrink-0" />
              </div>
              {(!isCollapsed || mobileOpen) && (
                <span className="truncate flex-1 text-left">Tbl Rek BA</span>
              )}
              {(!isCollapsed || mobileOpen) && activeTab === "table" && (
                <ChevronRight className="w-3.5 h-3.5 accent-color shrink-0 ml-auto" />
              )}
            </button>

            {/* 3. PO Material */}
            <button
              id="tab-btn-po"
              onClick={() => handleNavClick("po")}
              title="PO Material"
              className={`w-full relative flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold transition-all group ${
                activeTab === "po"
                  ? "surface-elevated text-main font-bold border border-subtle shadow-sm neon-glow"
                  : "text-muted hover:text-main hover:surface-elevated"
              }`}
            >
              {activeTab === "po" && (
                <span className="absolute left-0 top-2 bottom-2 w-1 rounded-r-full accent-bg shadow-[0_0_10px_var(--accent)]" />
              )}
              <div
                className={`p-1.5 rounded-lg transition-colors ${
                  activeTab === "po"
                    ? "accent-bg text-white shadow-sm"
                    : "surface-muted text-muted group-hover:text-main"
                }`}
              >
                <PackageCheck className="w-4 h-4 shrink-0" />
              </div>
              {(!isCollapsed || mobileOpen) && (
                <span className="truncate flex-1 text-left">PO Material</span>
              )}
              {(!isCollapsed || mobileOpen) && activeTab === "po" && (
                <ChevronRight className="w-3.5 h-3.5 accent-color shrink-0 ml-auto" />
              )}
            </button>

            {/* 4. LinkB & TesCom */}
            <button
              id="tab-btn-linkbudget"
              onClick={() => handleNavClick("linkbudget")}
              title="LinkB & TesCom"
              className={`w-full relative flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold transition-all group ${
                activeTab === "linkbudget"
                  ? "surface-elevated text-main font-bold border border-subtle shadow-sm neon-glow"
                  : "text-muted hover:text-main hover:surface-elevated"
              }`}
            >
              {activeTab === "linkbudget" && (
                <span className="absolute left-0 top-2 bottom-2 w-1 rounded-r-full accent-bg shadow-[0_0_10px_var(--accent)]" />
              )}
              <div
                className={`p-1.5 rounded-lg transition-colors ${
                  activeTab === "linkbudget"
                    ? "accent-bg text-white shadow-sm"
                    : "surface-muted text-teal-400 group-hover:text-teal-300"
                }`}
              >
                <Gauge className="w-4 h-4 shrink-0" />
              </div>
              {(!isCollapsed || mobileOpen) && (
                <div className="flex items-center justify-between flex-1 truncate">
                  <span className="truncate">LinkB &amp; TesCom</span>
                  <span className="text-[8.5px] px-1.5 py-0.2 rounded-full bg-teal-500/20 text-teal-300 border border-teal-500/30 font-bold ml-1.5 shrink-0">
                    OPM
                  </span>
                </div>
              )}
              {(!isCollapsed || mobileOpen) && activeTab === "linkbudget" && (
                <ChevronRight className="w-3.5 h-3.5 accent-color shrink-0 ml-auto" />
              )}
            </button>
          </div>

          {/* Section: Sistem & Integrasi */}
          <div className="space-y-1.5">
            {(!isCollapsed || mobileOpen) && (
              <p className="px-3 text-[10px] font-bold uppercase tracking-wider text-muted">
                Admin & Integrasi
              </p>
            )}

            {/* 3. Panel Admin (with PRO Badge) */}
            {currentUser?.role === "admin" && (
              <button
                id="tab-btn-admin"
                onClick={() => handleNavClick("admin")}
                title="Panel Admin (PRO)"
                className={`w-full relative flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold transition-all group ${
                  activeTab === "admin"
                    ? "surface-elevated text-main font-bold border border-subtle shadow-sm neon-glow"
                    : "text-muted hover:text-main hover:surface-elevated"
                }`}
              >
                {activeTab === "admin" && (
                  <span className="absolute left-0 top-2 bottom-2 w-1 rounded-r-full accent-bg shadow-[0_0_10px_var(--accent)]" />
                )}
                <div
                  className={`p-1.5 rounded-lg transition-colors ${
                    activeTab === "admin"
                      ? "bg-amber-500 text-white shadow-sm"
                      : "surface-muted text-amber-400 group-hover:text-amber-300"
                  }`}
                >
                  <ShieldCheck className="w-4 h-4 shrink-0" />
                </div>
                {(!isCollapsed || mobileOpen) && (
                  <div className="flex items-center justify-between flex-1 truncate">
                    <span className="truncate">Panel Admin</span>
                    <span className="text-[9px] px-1.5 py-0.2 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 font-bold ml-1.5 shrink-0">
                      PRO
                    </span>
                  </div>
                )}
              </button>
            )}

            {/* 4. Ekspor Kode GAS (Code.gs) */}
            <button
              id="tab-btn-gas"
              onClick={() => handleNavClick("gas")}
              title="Ekspor Kode GAS (Code.gs)"
              className={`w-full relative flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold transition-all group ${
                activeTab === "gas"
                  ? "surface-elevated text-main font-bold border border-subtle shadow-sm neon-glow"
                  : "text-muted hover:text-main hover:surface-elevated"
              }`}
            >
              {activeTab === "gas" && (
                <span className="absolute left-0 top-2 bottom-2 w-1 rounded-r-full accent-bg shadow-[0_0_10px_var(--accent)]" />
              )}
              <div
                className={`p-1.5 rounded-lg transition-colors ${
                  activeTab === "gas"
                    ? "accent-bg text-white shadow-sm"
                    : "surface-muted text-sky-400 group-hover:text-sky-300"
                }`}
              >
                <Code2 className="w-4 h-4 shrink-0" />
              </div>
              {(!isCollapsed || mobileOpen) && (
                <span className="truncate flex-1 text-left">Ekspor Kode GAS (Code.gs)</span>
              )}
              {(!isCollapsed || mobileOpen) && activeTab === "gas" && (
                <ChevronRight className="w-3.5 h-3.5 accent-color shrink-0 ml-auto" />
              )}
            </button>
          </div>

          {/* Section: Tools & Status */}
          <div className="space-y-2 pt-2 border-t border-subtle">
            {(!isCollapsed || mobileOpen) && (
              <p className="px-3 text-[9px] font-bold uppercase tracking-wider text-muted">
                Option
              </p>
            )}

            {/* Theme Switcher in Sidebar */}
            <div className={`px-1 ${isCollapsed && !mobileOpen ? "flex justify-center" : ""}`}>
              <ThemeSwitcher currentTheme={currentTheme} onThemeChange={onThemeChange} />
            </div>

            {/* Font Size Mode (Ramah Waspang Lapangan) */}
            {(!isCollapsed || mobileOpen) && onFontSizeChange && (
              <div className="mx-1 p-2.5 rounded-xl surface-elevated border space-y-1.5">
                <div className="flex items-center justify-between text-[11px] font-bold text-main">
                  <span className="flex items-center gap-1.5">
                    <span>👓</span>
                    <span>Ukuran Huruf (Waspang)</span>
                  </span>
                  <span className="text-[10px] text-emerald-500 font-bold font-mono">
                    {fontSize === "normal" ? "Normal" : fontSize === "waspang" ? "Besar (+16%)" : "Ekstra (+28%)"}
                  </span>
                </div>
                <div className="grid grid-cols-3 gap-1 pt-0.5">
                  <button
                    type="button"
                    onClick={() => onFontSizeChange("normal")}
                    className={`py-1 rounded-lg text-xs font-bold transition-all text-center cursor-pointer ${
                      fontSize === "normal"
                        ? "bg-slate-700 text-white shadow-xs"
                        : "surface-card text-muted hover:text-main"
                    }`}
                    title="Ukuran Standar (100%)"
                  >
                    A Normal
                  </button>
                  <button
                    type="button"
                    onClick={() => onFontSizeChange("waspang")}
                    className={`py-1 rounded-lg text-xs font-bold transition-all text-center cursor-pointer ${
                      fontSize === "waspang"
                        ? "bg-emerald-600 text-white shadow-xs"
                        : "surface-card text-muted hover:text-main"
                    }`}
                    title="Mode Nyaman Waspang (Disarankan)"
                  >
                    A+ Besar
                  </button>
                  <button
                    type="button"
                    onClick={() => onFontSizeChange("extra")}
                    className={`py-1 rounded-lg text-xs font-bold transition-all text-center cursor-pointer ${
                      fontSize === "extra"
                        ? "bg-amber-600 text-white shadow-xs"
                        : "surface-card text-muted hover:text-main"
                    }`}
                    title="Mode Ekstra Jelas (Kacamata)"
                  >
                    A++ Ekstra
                  </button>
                </div>
              </div>
            )}

            {/* Real-time Clock Indicator */}
            {(!isCollapsed || mobileOpen) && (
              <div
                id="realtime-clock"
                className="mx-1 flex items-center gap-2 px-3 py-2 rounded-xl surface-elevated text-[11px] font-mono text-main border"
              >
                <div className="relative flex h-2 w-2 shrink-0">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                </div>
                <Clock className="w-3.5 h-3.5 text-muted shrink-0" />
                <span className="font-semibold truncate">{currentTime || "--:--:-- WIB"}</span>
              </div>
            )}
          </div>
        </div>

        {/* Sidebar Footer / User Profile & Logout */}
        {currentUser && (
          <div className="p-3 border-t border-subtle surface-elevated shrink-0">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2.5 overflow-hidden">
                <div
                  className={`w-9 h-9 rounded-xl flex items-center justify-center text-xs font-bold shrink-0 ${
                    currentUser.role === "admin"
                      ? "bg-amber-500/20 text-amber-500 border border-amber-500/40"
                      : currentUser.role === "waspang"
                        ? "bg-indigo-500/20 text-indigo-400 border border-indigo-500/40"
                        : "bg-emerald-500/20 text-emerald-500 border border-emerald-500/40"
                  }`}
                  title={`${currentUser.name} (${currentUser.position})`}
                >
                  {currentUser.name.charAt(0)}
                </div>

                {(!isCollapsed || mobileOpen) && (
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-main truncate leading-tight">
                      {currentUser.name}
                    </p>
                    <p className="text-[10px] text-muted flex items-center gap-1 truncate">
                      <span
                        className={`inline-block w-1.5 h-1.5 rounded-full shrink-0 ${
                          currentUser.role === "admin"
                            ? "bg-amber-400"
                            : currentUser.role === "waspang"
                              ? "bg-indigo-400"
                              : "bg-emerald-400"
                        }`}
                      />
                      <span className="uppercase font-semibold tracking-wider truncate">
                        {currentUser.role === "admin"
                          ? "Super Admin"
                          : currentUser.role === "waspang"
                            ? "Waspang Lapangan"
                            : "Field Engineer"}
                      </span>
                    </p>
                  </div>
                )}
              </div>

              {/* Logout Button */}
              <button
                id="btn-logout"
                onClick={onLogout}
                className="p-2 rounded-xl text-muted hover:text-rose-500 hover:surface-card transition-colors shrink-0"
                title="Keluar Sesi"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </aside>
    </>
  );
};
