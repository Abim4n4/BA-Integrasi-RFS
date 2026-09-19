/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useCallback } from "react";
import { ThemeMode, User, BeritaAcaraRFS } from "./types.ts";
import { Sidebar } from "./components/Sidebar.tsx";
import { FormRfs } from "./components/FormRfs.tsx";
import { TableRekapan } from "./components/TableRekapan.tsx";
import { AdminPanel } from "./components/AdminPanel.tsx";
import { GasExportModal } from "./components/GasExportModal.tsx";
import { DocumentModal } from "./components/DocumentModal.tsx";
import { LoginModal } from "./components/LoginModal.tsx";
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
  Sparkles
} from "lucide-react";
import { FmkaLogo } from "./components/FmkaHeader.tsx";
import { testFirestoreConnection } from "./lib/firebase.ts";
import {
  fetchRecordsFromFirestore,
  saveRecordToFirestore,
  deleteRecordFromFirestore
} from "./services/firestoreService.ts";

export default function App() {
  // Theme state
  const [theme, setTheme] = useState<ThemeMode>(() => {
    const saved = localStorage.getItem("rfs_theme") as ThemeMode;
    return saved || "day";
  });

  // Auth & Session state
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isCheckingSession, setIsCheckingSession] = useState(true);

  // Tab Navigation state
  const [activeTab, setActiveTab] = useState<"form" | "table" | "admin" | "gas">("form");

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

  // Print Document Modal state
  const [selectedDoc, setSelectedDoc] = useState<BeritaAcaraRFS | null>(null);

  // Toast notification state
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);

  const showToast = (message: string, type: "success" | "error" = "success") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
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

  // Fetch BA RFS Records (with Firestore cloud fallback)
  const fetchRecords = useCallback(async () => {
    setIsLoadingRecords(true);
    try {
      const res = await fetch("/api/rfs/list");
      const data = await res.json();
      if (data.success && Array.isArray(data.data) && data.data.length > 0) {
        setRecords(data.data);
      } else {
        // Fallback or sync from Firestore
        const fsRecords = await fetchRecordsFromFirestore();
        if (fsRecords && fsRecords.length > 0) {
          setRecords(fsRecords);
        } else if (data.success && Array.isArray(data.data)) {
          setRecords(data.data);
        }
      }
    } catch (e) {
      console.warn("Server list API error, trying Firestore:", e);
      try {
        const fsRecords = await fetchRecordsFromFirestore();
        if (fsRecords) setRecords(fsRecords);
      } catch (fsErr) {
        console.error("Gagal mengambil data dari Firestore:", fsErr);
      }
    } finally {
      setIsLoadingRecords(false);
    }
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
        const res = await fetch("/api/auth/session", {
          headers: { Authorization: `Bearer ${savedToken}` }
        });
        const data = await res.json();
        if (data.success && data.user) {
          setCurrentUser(data.user);
        } else {
          localStorage.removeItem("rfs_session_token");
          localStorage.removeItem("rfs_user_data");
        }
      } catch (e) {
        console.warn("Session check offline:", e);
        // Fallback to local stored profile if network offline
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

      {/* Login Modal if not logged in */}
      {!isCheckingSession && !currentUser && (
        <LoginModal onLoginSuccess={handleLoginSuccess} />
      )}

      {/* Vertical Sidebar Navigation */}
      <Sidebar
        currentUser={currentUser}
        activeTab={activeTab}
        onTabChange={setActiveTab}
        currentTheme={theme}
        onThemeChange={handleThemeChange}
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
        <header className="sticky top-0 z-30 surface-card border-b backdrop-blur-md px-4 sm:px-6 h-16 flex items-center justify-between transition-colors duration-200">
          <div className="flex items-center gap-3">
            {/* Mobile Hamburger Button */}
            <button
              onClick={() => setMobileSidebarOpen(true)}
              className="md:hidden p-2 rounded-xl surface-elevated text-main hover:opacity-80 transition-colors"
              aria-label="Buka Menu Navigasi"
            >
              <Menu className="w-5 h-5" />
            </button>

            {/* Desktop Collapse / Expand Button */}
            <button
              onClick={toggleSidebarCollapse}
              className="hidden md:flex p-2 rounded-xl surface-elevated text-main hover:opacity-80 items-center justify-center transition-colors"
              title={isSidebarCollapsed ? "Perluas Sidebar" : "Ciutkan Sidebar"}
            >
              {isSidebarCollapsed ? (
                <PanelLeftOpen className="w-4 h-4 text-muted hover:text-main" />
              ) : (
                <PanelLeftClose className="w-4 h-4 text-muted hover:text-main" />
              )}
            </button>

            <div className="flex items-center gap-2">
              <div className="flex items-center gap-2">
                {activeTab === "form" && (
                  <>
                    <FileText className="w-4 h-4 accent-color shrink-0" />
                    <div>
                      <h2 className="text-sm sm:text-base font-bold text-main leading-tight">
                        Form Input BA RFS
                      </h2>
                    </div>
                  </>
                )}
                {activeTab === "table" && (
                  <>
                    <TableProperties className="w-4 h-4 accent-color shrink-0" />
                    <div>
                      <h2 className="text-sm sm:text-base font-bold text-main leading-tight">
                        Tabel Rekapan DataBA
                      </h2>
                      <p className="text-[10px] text-muted hidden sm:block">
                        Database riwayat Berita Acara RFS, evaluasi throughput & unduh arsip PDF
                      </p>
                    </div>
                  </>
                )}
                {activeTab === "admin" && (
                  <>
                    <ShieldCheck className="w-4 h-4 text-amber-400 shrink-0" />
                    <div>
                      <div className="flex items-center gap-1.5">
                        <h2 className="text-sm sm:text-base font-bold text-main leading-tight">
                          Panel Khusus Administrator
                        </h2>
                        <span className="text-[9px] px-1.5 py-0.2 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 font-bold">
                          PRO
                        </span>
                      </div>
                      <p className="text-[10px] text-muted hidden sm:block">
                        Manajemen kredensial pengguna, audit log keamanan, dan analitik performa
                      </p>
                    </div>
                  </>
                )}
                {activeTab === "gas" && (
                  <>
                    <Code2 className="w-4 h-4 text-sky-400 shrink-0" />
                    <div>
                      <h2 className="text-sm sm:text-base font-bold text-main leading-tight">
                        Eksportir Kode GAS (Code.gs & Index.html)
                      </h2>
                      <p className="text-[10px] text-muted hidden sm:block">
                        Deployment instan ke Google Apps Script dan Google Sheets Spreadsheet
                      </p>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Right Topbar Indicators */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* FMKA Corporate Logo Badge */}
            <div className="hidden lg:flex items-center gap-2 pr-3 border-r border-subtle">
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

            <span className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold surface-elevated border text-muted">
              <span className="w-1.5 h-1.5 rounded-full accent-bg animate-pulse"></span>
              <span className="capitalize">{theme.replace("-", " ")}</span>
            </span>

            {currentUser && (
              <span className="text-[11px] px-2.5 py-1 rounded-full font-bold surface-elevated border text-main hidden md:inline-flex items-center gap-1">
                <span
                  className={`w-1.5 h-1.5 rounded-full ${
                    currentUser.role === "admin" ? "bg-amber-400" : "bg-emerald-400"
                  }`}
                />
                <span>{currentUser.role === "admin" ? "Super Admin" : "Field Engineer"}</span>
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
            />
          )}

          {activeTab === "table" && (
            <TableRekapan
              records={records}
              currentUser={currentUser}
              isLoading={isLoadingRecords}
              onRefresh={fetchRecords}
              onViewPrint={setSelectedDoc}
              onDeleteRecord={handleDeleteRecord}
              onShowToast={showToast}
            />
          )}

          {activeTab === "admin" && currentUser?.role === "admin" && (
            <AdminPanel currentUser={currentUser} />
          )}

          {activeTab === "gas" && <GasExportModal />}
        </main>
      </div>

      {/* Printable Document Modal */}
      {selectedDoc && (
        <DocumentModal
          record={selectedDoc}
          onClose={() => setSelectedDoc(null)}
          onToast={showToast}
        />
      )}
    </div>
  );
}
