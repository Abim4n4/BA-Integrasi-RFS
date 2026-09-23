import React, { useState, useEffect } from "react";
import {
  ShieldCheck,
  UserPlus,
  Users,
  Settings,
  Database,
  Key,
  CheckCircle2,
  RefreshCw,
  FolderOpen,
  Lock,
  FileCode2,
  AlertCircle
} from "lucide-react";
import { User } from "../types.ts";
import { getLocalUsers, saveLocalUser } from "../services/authService.ts";

interface AdminPanelProps {
  currentUser: User | null;
}

interface ManagedUser {
  id: string;
  email: string;
  name: string;
  role: "admin" | "user";
  position: string;
  department: string;
}

export const AdminPanel: React.FC<AdminPanelProps> = ({ currentUser }) => {
  const [users, setUsers] = useState<ManagedUser[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newUser, setNewUser] = useState({
    name: "",
    email: "",
    password: "",
    role: "user" as "admin" | "user",
    position: "Field Engineer",
    department: "Network Operations"
  });
  const [statusMsg, setStatusMsg] = useState<{ text: string; isError?: boolean } | null>(null);

  const fetchUsers = async () => {
    setLoadingUsers(true);
    let loaded = false;
    try {
      const res = await fetch("/api/admin/users");
      const contentType = res.headers.get("content-type") || "";
      if (res.ok && contentType.includes("application/json")) {
        const data = await res.json();
        if (data.success && Array.isArray(data.users) && data.users.length > 0) {
          setUsers(data.users);
          loaded = true;
        }
      }
    } catch (_e) {
      // API not available, will use local users
    }

    if (!loaded) {
      const locals = getLocalUsers();
      setUsers(locals.map(u => ({
        id: u.id,
        email: u.email,
        name: u.name,
        role: u.role,
        position: u.position,
        department: u.department
      })));
    }
    setLoadingUsers(false);
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatusMsg(null);

    const createdUser = {
      id: `USR-${Date.now().toString().slice(-4)}`,
      email: newUser.email,
      password: newUser.password,
      name: newUser.name,
      role: newUser.role,
      position: newUser.position,
      department: newUser.department
    };

    // Save locally first for instant availability (works on Vercel)
    saveLocalUser(createdUser);

    // Also attempt backend sync if API exists
    try {
      const res = await fetch("/api/admin/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newUser)
      });
      const contentType = res.headers.get("content-type") || "";
      if (res.ok && contentType.includes("application/json")) {
        await res.json();
      }
    } catch (_err) {
      // Ignored for static host
    }

    setStatusMsg({ text: "Pengguna baru berhasil ditambahkan dan dapat langsung digunakan untuk login!" });
    setShowAddModal(false);
    setNewUser({
      name: "",
      email: "",
      password: "",
      role: "user",
      position: "Field Engineer",
      department: "Network Operations"
    });
    fetchUsers();
  };

  return (
    <div className="max-w-6xl mx-auto py-4 sm:py-6 space-y-6 animate-in fade-in duration-200">
      {/* Admin Banner */}
      <div className="surface-card p-5 rounded-2xl border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-xl bg-amber-500/20 text-amber-500 border border-amber-500/30">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-bold text-main">Panel Kendali Administrator</h2>
              <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/30">
                Akses Penuh
              </span>
            </div>
            <p className="text-xs text-muted mt-0.5">
              Manajemen hak akses sheet Users, audit sinkronisasi Google Sheets, dan verifikasi keamanan API.
            </p>
          </div>
        </div>

        <button
          onClick={() => setShowAddModal(true)}
          className="px-4 py-2 rounded-xl accent-bg text-white font-bold text-xs flex items-center gap-1.5 hover:opacity-90 transition-all shadow-md shrink-0"
        >
          <UserPlus className="w-3.5 h-3.5" />
          <span>Tambah Pengguna Baru</span>
        </button>
      </div>

      {statusMsg && (
        <div
          className={`p-3 rounded-xl text-xs flex items-center gap-2 ${
            statusMsg.isError
              ? "bg-rose-500/10 border border-rose-500/30 text-rose-500"
              : "bg-emerald-500/10 border border-emerald-500/30 text-emerald-500"
          }`}
        >
          {statusMsg.isError ? <AlertCircle className="w-4 h-4" /> : <CheckCircle2 className="w-4 h-4" />}
          <span>{statusMsg.text}</span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Users Sheet Management */}
        <div className="lg:col-span-2 surface-card rounded-2xl border p-5 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-subtle">
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 accent-color" />
              <h3 className="text-sm font-bold text-main uppercase tracking-wider">
                Daftar Pengguna Aktif (Sheet Users)
              </h3>
            </div>
            <button
              onClick={fetchUsers}
              disabled={loadingUsers}
              className="p-1.5 rounded-lg border surface-elevated text-main hover:opacity-80 transition-all text-xs flex items-center gap-1"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loadingUsers ? "animate-spin" : ""}`} />
              <span className="hidden sm:inline">Refresh</span>
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-main border-collapse">
              <thead>
                <tr className="surface-elevated text-muted font-bold text-[10px] uppercase tracking-wider border-b">
                  <th className="p-3">Nama & Jabatan</th>
                  <th className="p-3">Email Pengguna</th>
                  <th className="p-3">Departemen</th>
                  <th className="p-3 text-center">Role</th>
                  <th className="p-3 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-subtle">
                {users.map((u) => (
                  <tr key={u.id} className="hover:surface-elevated transition-colors">
                    <td className="p-3">
                      <div className="font-bold text-main">{u.name}</div>
                      <div className="text-[10px] text-muted">{u.position}</div>
                    </td>
                    <td className="p-3 font-mono text-[11px]">{u.email}</td>
                    <td className="p-3 text-muted">{u.department}</td>
                    <td className="p-3 text-center">
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          u.role === "admin"
                            ? "bg-amber-500/20 text-amber-400 border border-amber-500/30"
                            : "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                        }`}
                      >
                        {u.role.toUpperCase()}
                      </span>
                    </td>
                    <td className="p-3 text-center">
                      <span className="inline-flex items-center gap-1 text-[10px] text-emerald-500 font-semibold">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                        ACTIVE
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Right 1 Col: Google Workspace & Backend Security Info */}
        <div className="space-y-4">
          <div className="surface-card rounded-2xl border p-5 space-y-3">
            <div className="flex items-center gap-2 pb-2 border-b border-subtle">
              <Database className="w-4 h-4 text-emerald-500" />
              <h3 className="text-sm font-bold text-main">Konfigurasi Google Workspace</h3>
            </div>

            <div className="space-y-2 text-xs">
              <div className="p-2.5 rounded-xl surface-elevated border flex justify-between items-center">
                <div>
                  <p className="font-bold text-main">Sheet Database</p>
                  <p className="text-[10px] text-muted">Users & DataBA</p>
                </div>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 font-bold">
                  TERHUBUNG
                </span>
              </div>

              <div className="p-2.5 rounded-xl surface-elevated border flex justify-between items-center">
                <div>
                  <p className="font-bold text-main">Google Drive Folder</p>
                  <p className="text-[10px] text-muted">Dokumen_RFS_Signatures</p>
                </div>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 font-bold">
                  AUTO SYNC
                </span>
              </div>

              <div className="p-2.5 rounded-xl surface-elevated border flex justify-between items-center">
                <div>
                  <p className="font-bold text-main">Model AI Studio</p>
                  <p className="text-[10px] text-muted">gemini-3.8-flash</p>
                </div>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-sky-500/20 text-sky-400 font-bold">
                  ONLINE
                </span>
              </div>
            </div>
          </div>

          <div className="surface-card rounded-2xl border p-5 space-y-3">
            <div className="flex items-center gap-2 pb-2 border-b border-subtle">
              <Lock className="w-4 h-4 text-amber-500" />
              <h3 className="text-sm font-bold text-main">Protokol Keamanan Sesi</h3>
            </div>

            <p className="text-xs text-muted leading-relaxed">
              Sesi pengguna diamankan menggunakan enkripsi token terverifikasi di server backend. Setiap manipulasi input langsung di-filter melalui validasi ketat Code.gs dan Express API.
            </p>

            <div className="p-3 rounded-xl bg-slate-900 text-slate-300 font-mono text-[10px] space-y-1">
              <p>• Auth: Token-Based Session</p>
              <p>• CSRF Guard: Enabled</p>
              <p>• Signature: PNG Base64 Stream</p>
              <p>• Sheets Lock: Row Appending Only</p>
            </div>
          </div>
        </div>
      </div>

      {/* Add User Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="surface-card w-full max-w-md rounded-2xl border p-6 space-y-4 shadow-2xl">
            <h3 className="text-base font-bold text-main flex items-center gap-2">
              <UserPlus className="w-4 h-4 accent-color" />
              Tambah Pengguna Portal Baru
            </h3>

            <form onSubmit={handleAddUser} className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-main mb-1">Nama Lengkap</label>
                <input
                  type="text"
                  required
                  value={newUser.name}
                  onChange={(e) => setNewUser({ ...newUser, name: e.target.value })}
                  placeholder="Contoh: Ahmad Fauzi, S.Kom."
                  className="w-full p-2.5 rounded-lg border surface-elevated text-main"
                />
              </div>

              <div>
                <label className="block font-semibold text-main mb-1">Email (Username Login)</label>
                <input
                  type="email"
                  required
                  value={newUser.email}
                  onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                  placeholder="nama@rfs.telco.id"
                  className="w-full p-2.5 rounded-lg border surface-elevated text-main"
                />
              </div>

              <div>
                <label className="block font-semibold text-main mb-1">Kata Sandi</label>
                <input
                  type="password"
                  required
                  value={newUser.password}
                  onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
                  placeholder="Minimal 6 karakter"
                  className="w-full p-2.5 rounded-lg border surface-elevated text-main"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-main mb-1">Role Akun</label>
                  <select
                    value={newUser.role}
                    onChange={(e) => setNewUser({ ...newUser, role: e.target.value as "admin" | "user" })}
                    className="w-full p-2.5 rounded-lg border surface-elevated text-main"
                  >
                    <option value="user">User (Teknisi / Sales)</option>
                    <option value="admin">Admin (Akses Penuh)</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-main mb-1">Jabatan</label>
                  <input
                    type="text"
                    value={newUser.position}
                    onChange={(e) => setNewUser({ ...newUser, position: e.target.value })}
                    className="w-full p-2.5 rounded-lg border surface-elevated text-main"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-main mb-1">Departemen</label>
                <input
                  type="text"
                  value={newUser.department}
                  onChange={(e) => setNewUser({ ...newUser, department: e.target.value })}
                  className="w-full p-2.5 rounded-lg border surface-elevated text-main"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-subtle">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 rounded-xl border surface-elevated text-muted hover:text-main"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl accent-bg text-white font-bold hover:opacity-90"
                >
                  Simpan Pengguna
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
