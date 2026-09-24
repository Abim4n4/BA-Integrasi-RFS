import { User } from "../types.ts";

export interface StoredUser {
  id: string;
  email: string;
  password?: string;
  name: string;
  role: "admin" | "user" | "waspang";
  position: string;
  department: string;
}

export const DEFAULT_USERS: StoredUser[] = [
  {
    id: "USR-001",
    email: "admin@rfs.telco.id",
    password: "admin123",
    name: "Budi Santoso, S.T.",
    role: "admin",
    position: "Manajer Operasional & QA NOC",
    department: "Network Operations Center (NOC)"
  },
  {
    id: "USR-002",
    email: "teknisi@rfs.telco.id",
    password: "teknisi123",
    name: "Rian Pratama",
    role: "user",
    position: "Senior Field Engineer",
    department: "Field Service & Deployment"
  },
  {
    id: "USR-003",
    email: "sales@rfs.telco.id",
    password: "sales123",
    name: "Dewi Lestari",
    role: "user",
    position: "Account Executive Enterprise",
    department: "Corporate Enterprise Sales"
  },
  {
    id: "USR-004",
    email: "waspang@rfs.telco.id",
    password: "waspang123",
    name: "Hendra Wijaya, S.T.",
    role: "waspang",
    position: "Pengawas Lapangan (Waspang)",
    department: "Pengawasan & QA Proyek"
  }
];

export function getLocalUsers(): StoredUser[] {
  try {
    const saved = localStorage.getItem("rfs_local_users");
    if (saved) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch (e) {
    console.warn("Gagal membaca local users:", e);
  }
  return [...DEFAULT_USERS];
}

export function saveLocalUser(newUser: StoredUser): boolean {
  try {
    const users = getLocalUsers();
    const existingIndex = users.findIndex(u => u.email.toLowerCase() === newUser.email.toLowerCase());
    if (existingIndex >= 0) {
      users[existingIndex] = newUser;
    } else {
      users.push(newUser);
    }
    localStorage.setItem("rfs_local_users", JSON.stringify(users));
    return true;
  } catch (e) {
    console.error("Gagal menyimpan local user:", e);
    return false;
  }
}

export function updateLocalUser(id: string, updatedData: Partial<StoredUser>): boolean {
  try {
    const users = getLocalUsers();
    const index = users.findIndex(u => u.id === id);
    if (index === -1) return false;
    users[index] = {
      ...users[index],
      ...updatedData
    };
    localStorage.setItem("rfs_local_users", JSON.stringify(users));
    return true;
  } catch (e) {
    console.error("Gagal mengupdate local user:", e);
    return false;
  }
}

export function deleteLocalUser(id: string): boolean {
  try {
    const users = getLocalUsers();
    const filtered = users.filter(u => u.id !== id);
    if (filtered.length === users.length) return false;
    localStorage.setItem("rfs_local_users", JSON.stringify(filtered));
    return true;
  } catch (e) {
    console.error("Gagal menghapus local user:", e);
    return false;
  }
}

/**
 * Robust authentication function that works both with Express backend
 * and on static serverless deployments (such as Vercel / Netlify / GitHub Pages).
 */
export async function authenticate(email: string, password?: string): Promise<{
  success: boolean;
  user?: User;
  token?: string;
  message?: string;
}> {
  const cleanEmail = (email || "").trim().toLowerCase();
  const cleanPassword = password || "";

  // 1. Try backend API first (if hosted on fullstack Node.js server)
  try {
    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: cleanEmail, password: cleanPassword })
    });

    const contentType = res.headers.get("content-type") || "";
    if (res.ok && contentType.includes("application/json")) {
      const data = await res.json();
      if (data && data.success && data.user) {
        return {
          success: true,
          user: data.user,
          token: data.token || `token-${Date.now()}`
        };
      } else if (data && data.message) {
        return { success: false, message: data.message };
      }
    }
  } catch (_netErr) {
    // Network error or backend offline, fallback gracefully to client-side auth
  }

  // 2. Client-side authentication fallback (Essential for Vercel static deployments)
  const allUsers = getLocalUsers();
  const matchedUser = allUsers.find(
    u => u.email.toLowerCase() === cleanEmail && (!u.password || u.password === cleanPassword)
  );

  if (matchedUser) {
    const userProfile: User = {
      id: matchedUser.id,
      email: matchedUser.email,
      name: matchedUser.name,
      role: matchedUser.role,
      position: matchedUser.position,
      department: matchedUser.department
    };

    const token = `rfs-local-token-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
    return {
      success: true,
      user: userProfile,
      token
    };
  }

  return {
    success: false,
    message: "Email atau kata sandi tidak sesuai. Pastikan menggunakan akun yang terdaftar."
  };
}

/**
 * Validates session token
 */
export async function verifySession(token: string): Promise<User | null> {
  if (!token) return null;

  // 1. Try server session verification if available
  try {
    const res = await fetch("/api/auth/session", {
      headers: { Authorization: `Bearer ${token}` }
    });
    const contentType = res.headers.get("content-type") || "";
    if (res.ok && contentType.includes("application/json")) {
      const data = await res.json();
      if (data && data.success && data.user) {
        return data.user;
      }
    }
  } catch (_e) {
    // Ignore server error and use local session fallback
  }

  // 2. Local fallback
  try {
    const savedUserJson = localStorage.getItem("rfs_user_data");
    if (savedUserJson) {
      return JSON.parse(savedUserJson);
    }
  } catch (_e) {}

  return null;
}
