/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useCallback } from "react";
import { ThemeMode, User, BeritaAcaraRFS, WorkNoteEntry, FontSizeMode } from "./types.ts";
import { Sidebar } from "./components/Sidebar.tsx";
import { FormRfs } from "./components/FormRfs.tsx";
import { TableRekapan } from "./components/TableRekapan.tsx";
import { AdminPanel } from "./components/AdminPanel.tsx";
import { GasExportModal } from "./components/GasExportModal.tsx";
import { DocumentModal } from "./components/DocumentModal.tsx";
import { LoginModal } from "./components/LoginModal.tsx";
import { PoMaterialPanel } from "./components/PoMaterialPanel.tsx";
import {
  CheckCircle2,
  AlertCircle,
  Menu,
  PanelLeftClose,
  PanelLeftOpen,
  FileText,
  TableProperties,
  ShieldCheck,
  Code2,
  Cloud,
  Sparkles,
  PackageCheck
} from "lucide-react";
import { FmkaLogo } from "./components/FmkaHeader.tsx";
import { testFirestoreConnection } from "./lib/firebase.ts";
import {
  fetchRecordsFromFirestore,
  saveRecordToFirestore,
  deleteRecordFromFirestore
} from "./services/firestoreService.ts";
import { verifySession } from "./services/authService.ts";

export default function App() {
  // Theme state
  const [theme, setTheme] = useState<ThemeMode>(() => {
    const saved = localStorage.getItem("rfs_theme") as ThemeMode;
    return saved || "day";
  });

  // Font Size Accessibility State (Mode Ramah Waspang Senior Lapangan)
  const [fontSize, setFontSize] = useState<FontSizeMode>(() => {
    return (localStorage.getItem("rfs_font_size") as FontSizeMode) || "waspang";
  });

  useEffect(() => {
    document.documentElement.setAttribute("data-font-size", fontSize);
    localStorage.setItem("rfs_font_size", fontSize);
  }, [fontSize]);

  // Auth & Session state
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isCheckingSession, setIsCheckingSession] = useState(true);

  // Tab Navigation state
  const [activeTab, setActiveTab] = useState<"form" | "table" | "po" | "admin" | "gas">("form");

  // Sidebar Collapse & Mobile Drawer state
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState<boolean>(() => {
    return localStorage.getItem("rfs_sidebar_collapsed") === "true";
  });
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState<boolean>(false);

  const toggleSidebarCollapse = () => {
    setIsSidebarCollapsed(prev => {
      const next = !prev;
      localStorage.setItem("rfs_sidebar_collapsed", String(next));
      return next;
    });
  };

  // BA-RFS Records state
  const [records, setRecords] = useState<BeritaAcaraRFS[]>([]);
  const [isLoadingRecords, setIsLoadingRecords] = useState(false);
  const [cloningRecord, setCloningRecord] = useState<BeritaAcaraRFS | null>(null);

  // Print Document Modal state
  const [selectedDoc, setSelectedDoc] = useState<BeritaAcaraRFS | null>(null);

  // Toast notification state
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);

  const showToast = (message: string, type: "success" | "error" = "success") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  const handleCloneRecord = (record: BeritaAcaraRFS) => {
    setCloningRecord(record);
    setActiveTab("form");
    showToast(`Data dokumen ${record.locationName || record.noBa} siap di-clone sebagai draft baru!`, "success");
  };

  // Sync theme changes to document attributes and localStorage
  const handleThemeChange = (newTheme: ThemeMode) => {
    setTheme(newTheme);
    localStorage.setItem("rfs_theme", newTheme);
    document.documentElement.setAttribute("data-theme", newTheme);
    document.body.setAttribute("data-theme", newTheme);
  };

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    document.body.setAttribute("data-theme", theme);
  }, [theme]);

  // Fetch BA RFS Records (Clean: Keep Paradise Serpong II & User records, remove old mocks)
  const fetchRecords = useCallback(async () => {
    setIsLoadingRecords(true);
    let loadedRecords: BeritaAcaraRFS[] = [];
    const oldMockIds = new Set(["RFS-20260917-001", "RFS-20260916-002", "RFS-20260915-003"]);

    try {
      const res = await fetch("/api/rfs/list");
      const contentType = res.headers.get("content-type") || "";
      if (res.ok && contentType.includes("application/json")) {
        const data = await res.json();
        if (data && data.success && Array.isArray(data.data) && data.data.length > 0) {
          loadedRecords = data.data;
        }
      }
    } catch (_e) {
      // Backend unavailable
    }

    if (loadedRecords.length === 0) {
      try {
        const fsRecords = await fetchRecordsFromFirestore();
        if (fsRecords && fsRecords.length > 0) {
          loadedRecords = fsRecords;
        }
      } catch (fsErr) {
        console.error("Gagal mengambil data dari Firestore:", fsErr);
      }
    }

    // Merge from local storage if any
    try {
      const rawLocal = localStorage.getItem("rfs_local_records");
      if (rawLocal) {
        const parsed = JSON.parse(rawLocal);
        if (Array.isArray(parsed)) {
          const map = new Map<string, BeritaAcaraRFS>();
          parsed.forEach((r: BeritaAcaraRFS) => {
            if (r?.id && !oldMockIds.has(r.id)) map.set(r.id, r);
          });
          loadedRecords.forEach((r: BeritaAcaraRFS) => {
            if (r?.id && !map.has(r.id) && !oldMockIds.has(r.id)) map.set(r.id, r);
          });
          loadedRecords = Array.from(map.values());
        }
      }
    } catch (_err) {}

    // Exclude old mock demo records to keep cleanly to today's template
    const cleanRecords = loadedRecords.filter(r => !oldMockIds.has(r.id));
    setRecords(cleanRecords);
    setIsLoadingRecords(false);
  }, []);

  // Validate Firestore Connection on App Init
  useEffect(() => {
    testFirestoreConnection().then(connected => {
      if (connected) {
        console.log("Firebase Firestore terhubung secara aman.");
      }
    });
  }, []);

  // Verify Active Session on Mount
  useEffect(() => {
    const checkSession = async () => {
      const savedToken = localStorage.getItem("rfs_session_token");
      if (!savedToken) {
        setIsCheckingSession(false);
        return;
      }

      try {
        const user = await verifySession(savedToken);
        if (user) {
          setCurrentUser(user);
        } else {
          localStorage.removeItem("rfs_session_token");
          localStorage.removeItem("rfs_user_data");
        }
      } catch (e) {
        console.warn("Session check offline:", e);
        const localUser = localStorage.getItem("rfs_user_data");
        if (localUser) {
          try {
            setCurrentUser(JSON.parse(localUser));
          } catch (_) {}
        }
      } finally {
        setIsCheckingSession(false);
      }
    };

    checkSession();
    fetchRecords();
  }, [fetchRecords]);

  // Handle Login Success
  const handleLoginSuccess = (user: User) => {
    setCurrentUser(user);
    showToast(`Selamat datang, ${user.name}! Sesi Anda telah aktif.`, "success");
    fetchRecords();
  };

  // Handle Logout
  const handleLogout = () => {
    localStorage.removeItem("rfs_session_token");
    localStorage.removeItem("rfs_user_data");
    setCurrentUser(null);
    showToast("Anda telah keluar dari sesi.", "success");
  };

  // Handle New RFS Submitted
  const handleSuccessSubmit = async (newRecord: BeritaAcaraRFS) => {
    setRecords(prev => [newRecord, ...prev]);
    // Sync to Firestore Cloud Database
    try {
      await saveRecordToFirestore(newRecord);
    } catch (fsErr) {
      console.warn("Firestore sync notification:", fsErr);
    }
    showToast("Berita Acara RFS berhasil diterbitkan & disimpan ke Firebase!", "success");
    // Open print preview modal right away for convenience
    setSelectedDoc(newRecord);
  };

  // Delete Record (Admin)
  const handleDeleteRecord = async (id: string) => {
    try {
      await fetch(`/api/rfs/${id}`, { method: "DELETE" });
      try {
        await deleteRecordFromFirestore(id);
      } catch (fsErr) {
        console.warn("Firestore delete warning:", fsErr);
      }
      setRecords(prev => prev.filter(r => r.id !== id));
      showToast("Dokumen BA berhasil dihapus dari sistem & Firebase.", "success");
    } catch (err: any) {
      showToast(err.message, "error");
    }
  };

  // Add Field Work Note to Record & Sync
  const handleAddWorkNote = async (recordId: string, noteData: {
    note: string;
    author: string;
    role: string;
    category: WorkNoteEntry['category'];
  }) => {
    let updatedRecord: BeritaAcaraRFS | null = null;

    // 1. Try backend API first
    try {
      const res = await fetch("/api/rfs/add-note", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: recordId, ...noteData })
      });
      const contentType = res.headers.get("content-type") || "";
      if (res.ok && contentType.includes("application/json")) {
        const data = await res.json();
        if (data.success && data.data) {
          updatedRecord = data.data;
        }
      }
    } catch (_e) {
      // Backend not running (e.g. Vercel)
    }

    // 2. Client-side update fallback
    if (!updatedRecord) {
      const target = records.find(r => r.id === recordId);
      if (!target) throw new Error("Dokumen tidak ditemukan.");
      const newEntry: WorkNoteEntry = {
        id: `note-${Date.now()}`,
        timestamp: new Date().toISOString(),
        author: noteData.author,
        role: noteData.role,
        category: noteData.category,
        content: noteData.note
      };
      updatedRecord = {
        ...target,
        workNotesHistory: [...(target.workNotesHistory || []), newEntry],
        generalNotes: noteData.note
      };
    }

    setRecords(prev => prev.map(r => r.id === recordId ? updatedRecord! : r));
    if (selectedDoc && selectedDoc.id === recordId) {
      setSelectedDoc(updatedRecord);
    }

    // Sync to Firestore & localStorage
    try {
      await saveRecordToFirestore(updatedRecord);
    } catch (fsErr) {
      console.warn("Firestore sync notification on add note:", fsErr);
    }
    try {
      const existing = localStorage.getItem("rfs_local_records");
      const list: BeritaAcaraRFS[] = existing ? JSON.parse(existing) : [];
      const idx = list.findIndex(r => r.id === recordId);
      if (idx >= 0) {
        list[idx] = updatedRecord;
      } else {
        list.unshift(updatedRecord);
      }
      localStorage.setItem("rfs_local_records", JSON.stringify(list));
    } catch (_lsErr) {}
  };

  return (
    <div className="min-h-screen app-bg text-main transition-colors duration-200">
      {/* Toast Notification */}
      {toast && (
        <div className="fixed bottom-6 right-6 z-50 animate-in slide-in-from-bottom-5 duration-200">
          <div
            className={`flex items-center gap-2.5 px-4 py-3 rounded-2xl border shadow-xl text-xs font-semibold ${
              toast.type === "success"
                ? "bg-emerald-600 text-white border-emerald-500"
                : "bg-rose-600 text-white border-rose-500"
            }`}
          >
            {toast.type === "success" ? (
              <CheckCircle2 className="w-4 h-4 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 shrink-0" />
            )}
            <span>{toast.message}</span>
          </div>
        </div>
      )}

      {/* 1. Splash Loader while verifying session */}
      {isCheckingSession && (
        <div className="fixed inset-0 z-[100] surface-base flex flex-col items-center justify-center p-4">
          <div className="w-12 h-12 rounded-2xl bg-slate-950 flex items-center justify-center p-2 border border-slate-700 shadow-xl mb-3 animate-pulse">
            <FmkaLogo className="w-8 h-8" />
          </div>
          <p className="text-xs font-semibold text-main">Memuat portal BA Integrasi RFS...</p>
        </div>
      )}

      {/* 2. Pristine Full-Page Login if logged out (Zero sidebar leak!) */}
      {!isCheckingSession && !currentUser ? (
        <LoginModal
          onLoginSuccess={handleLoginSuccess}
          currentTheme={theme}
          onThemeChange={handleThemeChange}
          fontSize={fontSize}
          onFontSizeChange={setFontSize}
        />
      ) : (
        <>
          {/* Vertical Sidebar Navigation - ONLY rendered when authenticated */}
          <Sidebar
            currentUser={currentUser}
            activeTab={activeTab}
            onTabChange={setActiveTab}
            currentTheme={theme}
            onThemeChange={handleThemeChange}
            fontSize={fontSize}
            onFontSizeChange={setFontSize}
            onLogout={handleLogout}
            isCollapsed={isSidebarCollapsed}
            onToggleCollapse={toggleSidebarCollapse}
            mobileOpen={mobileSidebarOpen}
            onCloseMobile={() => setMobileSidebarOpen(false)}
          />

          {/* Main Content Area (Safely offset by sidebar width) */}
          <div
            className={`flex-1 flex flex-col min-w-0 transition-all duration-300 ${
              isSidebarCollapsed ? "md:pl-20" : "md:pl-64"
            }`}
          >
        {/* Top Header Bar for Content Area */}
        <header className="sticky top-0 z-30 surface-card border-b backdrop-blur-md px-4 sm:px-6 h-16 flex items-center justify-between gap-3 transition-colors duration-200">
          <div className="flex items-center gap-3 min-w-0">
            {/* Mobile Hamburger Button */}
            <button
              onClick={() => setMobileSidebarOpen(true)}
              className="md:hidden p-2 rounded-xl surface-elevated text-main hover:opacity-80 transition-colors shrink-0"
              aria-label="Buka Menu Navigasi"
            >
              <Menu className="w-5 h-5" />
            </button>

            {/* Desktop Collapse / Expand Button */}
            <button
              onClick={toggleSidebarCollapse}
              className="hidden md:flex p-2 rounded-xl surface-elevated text-main hover:opacity-80 items-center justify-center transition-colors shrink-0"
              title={isSidebarCollapsed ? "Perluas Sidebar" : "Ciutkan Sidebar"}
            >
              {isSidebarCollapsed ? (
                <PanelLeftOpen className="w-4 h-4 text-muted hover:text-main" />
              ) : (
                <PanelLeftClose className="w-4 h-4 text-muted hover:text-main" />
              )}
            </button>

            <div className="flex items-center gap-2 min-w-0">
              {activeTab === "form" && (
                <div className="flex items-center gap-2 min-w-0">
                  <FileText className="w-4 h-4 accent-color shrink-0" />
                  <h2 className="text-sm sm:text-base font-bold text-main leading-tight truncate">
                    Form Input BA RFS
                  </h2>
                </div>
              )}
              {activeTab === "table" && (
                <div className="flex items-center gap-2 min-w-0">
                  <TableProperties className="w-4 h-4 accent-color shrink-0" />
                  <h2 className="text-sm sm:text-base font-bold text-main leading-tight truncate">
                    Tabel Rekapan DataBA
                  </h2>
                </div>
              )}
              {activeTab === "po" && (
                <div className="flex items-center gap-2 min-w-0">
                  <PackageCheck className="w-4 h-4 accent-color shrink-0" />
                  <h2 className="text-sm sm:text-base font-bold text-main leading-tight truncate">
                    Permohonan PO Pengadaan Material
                  </h2>
                </div>
              )}
              {activeTab === "admin" && (
                <div className="flex items-center gap-2 min-w-0">
                  <ShieldCheck className="w-4 h-4 text-amber-400 shrink-0" />
                  <div className="flex items-center gap-1.5 min-w-0">
                    <h2 className="text-sm sm:text-base font-bold text-main leading-tight truncate">
                      Panel Administrator
                    </h2>
                    <span className="text-[9px] px-1.5 py-0.2 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 font-bold shrink-0">
                      PRO
                    </span>
                  </div>
                </div>
              )}
              {activeTab === "gas" && (
                <div className="flex items-center gap-2 min-w-0">
                  <Code2 className="w-4 h-4 text-sky-400 shrink-0" />
                  <h2 className="text-sm sm:text-base font-bold text-main leading-tight truncate">
                    Eksportir Kode GAS
                  </h2>
                </div>
              )}
            </div>
          </div>

          {/* Right Topbar Indicators */}
          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            {/* Quick Font Size Switcher for Field Waspang */}
            <div 
              className="flex items-center gap-0.5 surface-elevated border border-subtle rounded-full p-0.5 text-xs shadow-xs shrink-0" 
              title="Pengatur Ukuran Huruf (Ramah Pengawas Lapangan/Waspang Senior)"
            >
              <span className="text-[11px] font-bold text-muted px-1.5 hidden md:inline-flex items-center gap-1 select-none">
                <span>👓</span>
                <span className="hidden xl:inline">Font Waspang:</span>
              </span>
              <button
                type="button"
                onClick={() => setFontSize("normal")}
                className={`px-2 py-0.5 rounded-full font-bold transition-all text-xs cursor-pointer ${
                  fontSize === "normal"
                    ? "bg-slate-700 text-white shadow-xs"
                    : "text-muted hover:text-main hover:bg-slate-200 dark:hover:bg-slate-800"
                }`}
                title="Ukuran Standar Normal (100%)"
              >
                A
              </button>
              <button
                type="button"
                onClick={() => setFontSize("waspang")}
                className={`px-2 py-0.5 rounded-full font-bold transition-all text-xs cursor-pointer ${
                  fontSize === "waspang"
                    ? "bg-emerald-600 text-white shadow-xs"
                    : "text-muted hover:text-main hover:bg-slate-200 dark:hover:bg-slate-800"
                }`}
                title="Mode Nyaman Waspang (+16% - Sangat Disarankan untuk Lapangan)"
              >
                A+
              </button>
              <button
                type="button"
                onClick={() => setFontSize("extra")}
                className={`px-2 py-0.5 rounded-full font-bold transition-all text-xs cursor-pointer ${
                  fontSize === "extra"
                    ? "bg-amber-600 text-white shadow-xs"
                    : "text-muted hover:text-main hover:bg-slate-200 dark:hover:bg-slate-800"
                }`}
                title="Mode Ekstra Jelas (+28% - Tulisan Besar)"
              >
                A++
              </button>
            </div>

            {/* FMKA Corporate Logo Badge */}
            <div className="hidden xl:flex items-center gap-2 pr-3 border-r border-subtle shrink-0">
              <div className="w-7 h-7 rounded-full bg-slate-950 flex items-center justify-center p-0.5 border border-slate-700 shadow-sm">
                <FmkaLogo className="w-6 h-6" />
              </div>
              <div className="flex flex-col text-left">
                <span className="text-[10.5px] font-black tracking-tight text-main leading-none uppercase">
                  PT. FAJAR MITRA KRIDA ABADI
                </span>
                <span className="text-[9px] italic font-serif text-muted">
                  Telecommunication &amp; Civil Contractor
                </span>
              </div>
            </div>

            <span className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold surface-elevated border text-muted shrink-0">
              <span className="w-1.5 h-1.5 rounded-full accent-bg animate-pulse"></span>
              <span className="capitalize">{theme.replace("-", " ")}</span>
            </span>

            {currentUser && (
              <span className="text-[11px] px-2.5 py-1 rounded-full font-bold surface-elevated border text-main hidden md:inline-flex items-center gap-1 shrink-0">
                <span
                  className={`w-1.5 h-1.5 rounded-full ${
                    currentUser.role === "admin"
                      ? "bg-amber-400"
                      : currentUser.role === "waspang"
                        ? "bg-indigo-400"
                        : "bg-emerald-400"
                  }`}
                />
                <span>
                  {currentUser.role === "admin"
                    ? "Super Admin"
                    : currentUser.role === "waspang"
                      ? "Waspang Lapangan"
                      : "Field Engineer"}
                </span>
              </span>
            )}
          </div>
        </header>

        {/* Main Tab Content */}
        <main className="px-4 sm:px-6 py-6 pb-16 flex-1 max-w-7xl mx-auto w-full">
          {activeTab === "form" && (
            <FormRfs
              currentUser={currentUser}
              onSuccessSubmit={handleSuccessSubmit}
              onViewPrintDoc={setSelectedDoc}
              cloneRecord={cloningRecord}
              onClearClone={() => setCloningRecord(null)}
            />
          )}

          {activeTab === "table" && (
            <TableRekapan
              records={records}
              currentUser={currentUser}
              isLoading={isLoadingRecords}
              onRefresh={fetchRecords}
              onViewPrint={setSelectedDoc}
              onCloneRecord={handleCloneRecord}
              onDeleteRecord={handleDeleteRecord}
              onShowToast={showToast}
              onAddWorkNote={handleAddWorkNote}
            />
          )}

          {activeTab === "po" && (
            <PoMaterialPanel currentUser={currentUser} onShowToast={showToast} />
          )}

          {activeTab === "admin" && currentUser?.role === "admin" && (
            <AdminPanel currentUser={currentUser} />
          )}

          {activeTab === "gas" && <GasExportModal />}
        </main>
      </div>
    </>
  )}

      {/* Printable Document Modal */}
      {selectedDoc && (
        <DocumentModal
          record={selectedDoc}
          onClose={() => setSelectedDoc(null)}
          onToast={showToast}
          onCloneRecord={handleCloneRecord}
        />
      )}
    </div>
  );
}
