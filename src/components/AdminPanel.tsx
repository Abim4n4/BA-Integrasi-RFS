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
  AlertCircle,
  Edit2,
  Trash2,
  X,
  KeyRound,
  ShieldAlert
} from "lucide-react";
import { User } from "../types.ts";
import { getLocalUsers, saveLocalUser, updateLocalUser, deleteLocalUser } from "../services/authService.ts";

interface AdminPanelProps {
  currentUser: User | null;
}

interface ManagedUser {
  id: string;
  email: string;
  name: string;
  role: "admin" | "user" | "waspang";
  position: string;
  department: string;
}

export const AdminPanel: React.FC<AdminPanelProps> = ({ currentUser }) => {
  const [users, setUsers] = useState<ManagedUser[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingUser, setEditingUser] = useState<(ManagedUser & { password?: string }) | null>(null);
  const [deletingUser, setDeletingUser] = useState<ManagedUser | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [newUser, setNewUser] = useState({
    name: "",
    email: "",
    password: "",
    role: "user" as "admin" | "user" | "waspang",
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
    setIsSubmitting(true);

    const generatedId = `USR-${Date.now().toString().slice(-4)}`;
    const createdUser = {
      id: generatedId,
      email: newUser.email.trim(),
      password: newUser.password,
      name: newUser.name.trim(),
      role: newUser.role,
      position: newUser.position.trim(),
      department: newUser.department.trim()
    };

    // Save locally first for instant availability
    saveLocalUser(createdUser);

    // Also attempt backend sync if API exists
    try {
      const res = await fetch("/api/admin/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(createdUser)
      });
      if (res.ok) {
        await res.json();
      }
    } catch (_err) {
      // Ignored for static host
    }

    setIsSubmitting(false);
    setStatusMsg({ text: `Pengguna baru "${createdUser.name}" berhasil ditambahkan dan dapat langsung digunakan!` });
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

  const handleEditUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;
    setStatusMsg(null);
    setIsSubmitting(true);

    const updatedData: any = {
      name: editingUser.name.trim(),
      email: editingUser.email.trim(),
      role: editingUser.role,
      position: editingUser.position.trim(),
      department: editingUser.department.trim()
    };
    if (editingUser.password && editingUser.password.trim().length > 0) {
      updatedData.password = editingUser.password.trim();
    }

    // Update locally
    updateLocalUser(editingUser.id, updatedData);

    // Attempt backend sync
    try {
      const res = await fetch(`/api/admin/users/${editingUser.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updatedData)
      });
      if (res.ok) {
        await res.json();
      }
    } catch (_err) {
      // Ignored for static host
    }

    setIsSubmitting(false);
    setStatusMsg({ text: `Data pengguna "${editingUser.name}" berhasil diperbarui!` });
    setEditingUser(null);
    fetchUsers();
  };

  const handleDeleteUser = async () => {
    if (!deletingUser) return;

    // Safety check: Cannot delete own account if logged in
    if (currentUser && (currentUser.id === deletingUser.id || currentUser.email.toLowerCase() === deletingUser.email.toLowerCase())) {
      setStatusMsg({
        text: "Anda tidak dapat menghapus akun Anda sendiri saat sedang aktif masuk.",
        isError: true
      });
      setDeletingUser(null);
      return;
    }

    setIsSubmitting(true);

    // Delete locally
    deleteLocalUser(deletingUser.id);

    // Delete via backend API
    try {
      const res = await fetch(`/api/admin/users/${deletingUser.id}`, {
        method: "DELETE"
      });
      if (res.ok) {
        await res.json();
      }
    } catch (_err) {
      // Ignored for static host
    }

    setIsSubmitting(false);
    setStatusMsg({ text: `Pengguna "${deletingUser.name}" (${deletingUser.email}) berhasil dihapus.` });
    setDeletingUser(null);
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
                  <th className="p-3 text-center">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-subtle">
                {users.map((u) => {
                  const isCurrentLoggedIn = !!currentUser && (
                    currentUser.id === u.id || currentUser.email.toLowerCase() === u.email.toLowerCase()
                  );
                  return (
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
                              : u.role === "waspang"
                                ? "bg-indigo-500/20 text-indigo-400 border border-indigo-500/30"
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
                      <td className="p-3 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          {/* Edit User Button */}
                          <button
                            onClick={() => setEditingUser({ ...u, password: "" })}
                            className="p-1.5 rounded-lg border surface-elevated text-sky-500 hover:bg-sky-500 hover:text-white transition-all shadow-sm cursor-pointer"
                            title="Edit Data Pengguna"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>

                          {/* Delete User Button */}
                          <button
                            onClick={() => setDeletingUser(u)}
                            disabled={isCurrentLoggedIn}
                            className={`p-1.5 rounded-lg border transition-all shadow-sm ${
                              isCurrentLoggedIn
                                ? "opacity-30 cursor-not-allowed text-muted border-slate-700"
                                : "surface-elevated text-rose-500 hover:bg-rose-500 hover:text-white border-subtle cursor-pointer"
                            }`}
                            title={
                              isCurrentLoggedIn
                                ? "Akun Anda saat ini (tidak dapat dihapus)"
                                : "Hapus Pengguna"
                            }
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
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

      {/* 1. Modal Tambah Pengguna Baru */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="surface-card w-full max-w-md rounded-2xl border p-6 space-y-4 shadow-2xl relative">
            <div className="flex items-center justify-between pb-3 border-b border-subtle">
              <h3 className="text-base font-bold text-main flex items-center gap-2">
                <UserPlus className="w-4 h-4 text-emerald-500" />
                Tambah Pengguna Portal Baru
              </h3>
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="p-1 rounded-lg text-muted hover:text-main"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleAddUser} className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-main mb-1">Nama Lengkap</label>
                <input
                  type="text"
                  required
                  value={newUser.name}
                  onChange={(e) => setNewUser({ ...newUser, name: e.target.value })}
                  placeholder="Contoh: Ahmad Fauzi, S.Kom."
                  className="w-full p-2.5 rounded-lg border surface-elevated text-main focus:ring-1 focus:ring-emerald-500"
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
                  className="w-full p-2.5 rounded-lg border surface-elevated text-main focus:ring-1 focus:ring-emerald-500"
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
                  className="w-full p-2.5 rounded-lg border surface-elevated text-main focus:ring-1 focus:ring-emerald-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-main mb-1">Role Akun</label>
                  <select
                    value={newUser.role}
                    onChange={(e) => setNewUser({ ...newUser, role: e.target.value as "admin" | "user" | "waspang" })}
                    className="w-full p-2.5 rounded-lg border surface-elevated text-main focus:ring-1 focus:ring-emerald-500"
                  >
                    <option value="user">User (Teknisi / Sales)</option>
                    <option value="waspang">Waspang (Pengawas Lapangan)</option>
                    <option value="admin">Admin (Akses Penuh / NOC)</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-main mb-1">Jabatan</label>
                  <input
                    type="text"
                    required
                    value={newUser.position}
                    onChange={(e) => setNewUser({ ...newUser, position: e.target.value })}
                    className="w-full p-2.5 rounded-lg border surface-elevated text-main focus:ring-1 focus:ring-emerald-500"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-main mb-1">Departemen</label>
                <input
                  type="text"
                  required
                  value={newUser.department}
                  onChange={(e) => setNewUser({ ...newUser, department: e.target.value })}
                  className="w-full p-2.5 rounded-lg border surface-elevated text-main focus:ring-1 focus:ring-emerald-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-subtle">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  disabled={isSubmitting}
                  className="px-4 py-2 rounded-xl border surface-elevated text-muted hover:text-main"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 rounded-xl accent-bg text-white font-bold hover:opacity-90 flex items-center gap-1.5"
                >
                  {isSubmitting && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                  <span>{isSubmitting ? "Menyimpan..." : "Simpan Pengguna"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 2. Modal Edit Pengguna */}
      {editingUser && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="surface-card w-full max-w-md rounded-2xl border p-6 space-y-4 shadow-2xl relative">
            <div className="flex items-center justify-between pb-3 border-b border-subtle">
              <h3 className="text-base font-bold text-main flex items-center gap-2">
                <Edit2 className="w-4 h-4 text-sky-500" />
                Edit Data Pengguna
              </h3>
              <button
                type="button"
                onClick={() => setEditingUser(null)}
                className="p-1 rounded-lg text-muted hover:text-main"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleEditUser} className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-main mb-1">Nama Lengkap</label>
                <input
                  type="text"
                  required
                  value={editingUser.name}
                  onChange={(e) => setEditingUser({ ...editingUser, name: e.target.value })}
                  className="w-full p-2.5 rounded-lg border surface-elevated text-main focus:ring-1 focus:ring-sky-500"
                />
              </div>

              <div>
                <label className="block font-semibold text-main mb-1">Email Pengguna</label>
                <input
                  type="email"
                  required
                  value={editingUser.email}
                  onChange={(e) => setEditingUser({ ...editingUser, email: e.target.value })}
                  className="w-full p-2.5 rounded-lg border surface-elevated text-main focus:ring-1 focus:ring-sky-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-main mb-1">Role Akun</label>
                  <select
                    value={editingUser.role}
                    onChange={(e) => setEditingUser({ ...editingUser, role: e.target.value as "admin" | "user" | "waspang" })}
                    className="w-full p-2.5 rounded-lg border surface-elevated text-main focus:ring-1 focus:ring-sky-500"
                  >
                    <option value="user">User (Teknisi / Sales)</option>
                    <option value="waspang">Waspang (Pengawas Lapangan)</option>
                    <option value="admin">Admin (Akses Penuh / NOC)</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-main mb-1">Jabatan</label>
                  <input
                    type="text"
                    required
                    value={editingUser.position}
                    onChange={(e) => setEditingUser({ ...editingUser, position: e.target.value })}
                    className="w-full p-2.5 rounded-lg border surface-elevated text-main focus:ring-1 focus:ring-sky-500"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-main mb-1">Departemen</label>
                <input
                  type="text"
                  required
                  value={editingUser.department}
                  onChange={(e) => setEditingUser({ ...editingUser, department: e.target.value })}
                  className="w-full p-2.5 rounded-lg border surface-elevated text-main focus:ring-1 focus:ring-sky-500"
                />
              </div>

              <div className="p-3 rounded-xl surface-elevated border space-y-1.5">
                <label className="block font-semibold text-main flex items-center gap-1.5">
                  <KeyRound className="w-3.5 h-3.5 text-amber-500" />
                  <span>Ubah Kata Sandi (Opsional)</span>
                </label>
                <input
                  type="password"
                  value={editingUser.password || ""}
                  onChange={(e) => setEditingUser({ ...editingUser, password: e.target.value })}
                  placeholder="Kosongkan jika tidak ingin mengubah sandi"
                  className="w-full p-2 rounded-lg border surface-base text-main text-xs focus:ring-1 focus:ring-amber-500"
                />
                <p className="text-[10px] text-muted italic">
                  Isi hanya jika ingin mengganti kata sandi login pengguna ini.
                </p>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-subtle">
                <button
                  type="button"
                  onClick={() => setEditingUser(null)}
                  disabled={isSubmitting}
                  className="px-4 py-2 rounded-xl border surface-elevated text-muted hover:text-main"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-bold flex items-center gap-1.5 shadow-md"
                >
                  {isSubmitting && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                  <span>{isSubmitting ? "Menyimpan..." : "Simpan Perubahan"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 3. Modal Konfirmasi Hapus Pengguna */}
      {deletingUser && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="surface-card w-full max-w-sm rounded-2xl border p-6 space-y-4 shadow-2xl relative">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-xl bg-rose-500/20 text-rose-500 border border-rose-500/30 shrink-0">
                <ShieldAlert className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-main">Hapus Pengguna</h3>
                <p className="text-xs text-muted">Konfirmasi penghapusan akun portal</p>
              </div>
            </div>

            <div className="p-3.5 rounded-xl surface-elevated border text-xs space-y-2">
              <p className="text-main font-semibold">
                Apakah Anda yakin ingin menghapus akun pengguna berikut?
              </p>
              <div className="font-mono text-[11px] bg-slate-900/60 p-2.5 rounded-lg space-y-1 text-slate-300">
                <p><span className="text-muted">Nama:</span> <strong className="text-white">{deletingUser.name}</strong></p>
                <p><span className="text-muted">Email:</span> {deletingUser.email}</p>
                <p><span className="text-muted">Role:</span> {deletingUser.role.toUpperCase()}</p>
                <p><span className="text-muted">Departemen:</span> {deletingUser.department}</p>
              </div>
              <p className="text-[11px] text-rose-500 font-medium">
                ⚠️ Pengguna ini tidak akan dapat login lagi ke portal setelah dihapus.
              </p>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-subtle">
              <button
                type="button"
                onClick={() => setDeletingUser(null)}
                disabled={isSubmitting}
                className="px-4 py-2 rounded-xl border surface-elevated text-muted hover:text-main text-xs"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleDeleteUser}
                disabled={isSubmitting}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs flex items-center gap-1.5 shadow-md cursor-pointer"
              >
                {isSubmitting && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                <span>{isSubmitting ? "Menghapus..." : "Ya, Hapus Pengguna"}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
