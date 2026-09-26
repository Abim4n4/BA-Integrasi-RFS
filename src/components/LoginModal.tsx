import React, { useState } from "react";
import { AlertCircle, RefreshCw } from "lucide-react";
import { User, ThemeMode, FontSizeMode } from "../types.ts";
import { googleSignIn } from "../lib/firebase.ts";
import { authenticate } from "../services/authService.ts";
import { ThemeSwitcher } from "./ThemeSwitcher.tsx";

interface LoginModalProps {
  onLoginSuccess: (user: User, token: string) => void;
  currentTheme?: ThemeMode;
  onThemeChange?: (theme: ThemeMode) => void;
  fontSize?: FontSizeMode;
  onFontSizeChange?: (mode: FontSizeMode) => void;
}

export const LoginModal: React.FC<LoginModalProps> = ({
  onLoginSuccess,
  currentTheme,
  onThemeChange,
  fontSize,
  onFontSizeChange
}) => {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const handleGoogleAuth = async () => {
    setErrorMsg("");
    setGoogleLoading(true);
    try {
      const result = await googleSignIn();
      if (result) {
        const appUser: User = {
          id: result.user.uid,
          email: result.user.email || "user@google.com",
          name: result.user.displayName || "Google User",
          role: "admin",
          position: "Project Engineer",
          department: "Fiber & Telecommunication",
          avatarUrl: result.user.photoURL || undefined
        };
        localStorage.setItem("rfs_session_token", result.accessToken);
        localStorage.setItem("rfs_user_data", JSON.stringify(appUser));
        onLoginSuccess(appUser, result.accessToken);
      }
    } catch (err: any) {
      setErrorMsg("Gagal masuk dengan Google: " + (err.message || "Unknown error"));
    } finally {
      setGoogleLoading(false);
    }
  };

  const handleLogin = async (loginUser?: string, loginPassword?: string) => {
    setErrorMsg("");
    setLoading(true);

    const targetUser = loginUser || username;
    const targetPassword = loginPassword || password;

    try {
      const result = await authenticate(targetUser, targetPassword);
      if (result.success && result.user && result.token) {
        localStorage.setItem("rfs_session_token", result.token);
        localStorage.setItem("rfs_user_data", JSON.stringify(result.user));
        onLoginSuccess(result.user, result.token);
      } else {
        setErrorMsg(result.message || "Username atau password tidak sesuai.");
      }
    } catch (err: any) {
      setErrorMsg("Gagal melakukan login: " + (err.message || "Terjadi kesalahan"));
    } finally {
      setLoading(false);
    }
  };

  const handleQuickDemo = (demoUser: string, demoPass: string) => {
    setUsername(demoUser);
    setPassword(demoPass);
    handleLogin(demoUser, demoPass);
  };

  return (
    <div className="fixed inset-0 z-[100] bg-[#0b101b] text-slate-100 overflow-y-auto flex flex-col justify-between selection:bg-amber-500 selection:text-slate-950 font-sans">
      {/* Top Bar with Brand & Preferences */}
      <header className="w-full max-w-7xl mx-auto px-6 sm:px-12 pt-8 sm:pt-10 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-[#f5a623] flex items-center justify-center text-slate-950 shadow-md">
            <svg
              className="w-5 h-5 text-slate-950 stroke-[2.5]"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
            </svg>
          </div>
          <span className="text-xs sm:text-sm font-black tracking-[0.25em] text-slate-200 uppercase">
            BIMAWALUYA
          </span>
        </div>

        {/* Top Right Controls (Accessibility & Theme) */}
        <div className="flex items-center gap-2">
          {onFontSizeChange && (
            <div className="hidden sm:flex items-center gap-1 bg-[#101726] border border-slate-800 rounded-full p-1 text-[11px]">
              <button
                type="button"
                onClick={() => onFontSizeChange("normal")}
                className={`px-2 py-0.5 rounded-full font-bold transition-all text-xs cursor-pointer ${
                  fontSize === "normal" ? "bg-slate-700 text-white" : "text-slate-400 hover:text-white"
                }`}
                title="Ukuran Normal"
              >
                A
              </button>
              <button
                type="button"
                onClick={() => onFontSizeChange("waspang")}
                className={`px-2 py-0.5 rounded-full font-bold transition-all text-xs cursor-pointer ${
                  fontSize === "waspang" ? "bg-amber-500 text-slate-950" : "text-slate-400 hover:text-white"
                }`}
                title="Ukuran Waspang"
              >
                A+
              </button>
            </div>
          )}

          {currentTheme && onThemeChange && (
            <ThemeSwitcher currentTheme={currentTheme} onThemeChange={onThemeChange} />
          )}
        </div>
      </header>

      {/* Main Content: 2-Column Split Hero & Login */}
      <main className="w-full max-w-7xl mx-auto px-6 sm:px-12 py-10 sm:py-16 flex-1 flex flex-col lg:flex-row items-center justify-between gap-12 lg:gap-16">
        {/* Left Column: Headline, Description & Optical Pulse Wave */}
        <div className="flex-1 max-w-xl space-y-6">
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-white tracking-tight leading-[1.15]">
            Setiap desibel<br />
            bercerita soal<br />
            <span className="text-[#f5a623]">kualitas jaringan.</span>
          </h1>

          <p className="text-slate-400 text-xs sm:text-sm max-w-md leading-relaxed">
            Pengukuran &amp; monitoring redaman FTTH end-to-end — dari OLT hingga ONT pelanggan,
            tervalidasi langsung dari lapangan oleh tim Wasapang.
          </p>

          {/* Dotted Amber Optical Signal Waveform */}
          <div className="pt-6 sm:pt-12">
            <svg
              className="w-full max-w-md h-16 sm:h-20 text-[#f5a623]"
              viewBox="0 0 450 70"
              fill="none"
            >
              <path
                d="M0 45 L70 45 L85 20 L95 62 L105 45 L130 45 L140 32 L150 54 L160 45 L200 45 L215 10 L228 70 L240 45 L280 45 L292 32 L304 56 L316 45 L350 45 L362 18 L374 65 L386 45 L450 45"
                stroke="#f5a623"
                strokeWidth="1.8"
                strokeDasharray="4 4"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>
        </div>

        {/* Right Column: Login Card */}
        <div className="w-full max-w-md">
          <div className="bg-[#0b101b] rounded-2xl p-6 sm:p-8 space-y-5">
            <div>
              <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
                Masuk ke akun Anda
              </h2>
              <p className="text-xs text-slate-400 mt-1">
                Akun dibuat oleh Admin/Koordinator Wasapang.
              </p>
            </div>

            {errorMsg && (
              <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleLogin();
              }}
              className="space-y-4"
            >
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">
                  Email / Username
                </label>
                <input
                  type="text"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="waspang@rfs.telco.id atau teknisi@rfs.telco.id"
                  className="w-full px-3.5 py-2.5 rounded-lg bg-[#101726] border border-slate-700/60 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-[#f5a623] focus:ring-1 focus:ring-[#f5a623] transition-all"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">
                  Password
                </label>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full px-3.5 py-2.5 rounded-lg bg-[#101726] border border-slate-700/60 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-[#f5a623] focus:ring-1 focus:ring-[#f5a623] transition-all"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 px-4 rounded-lg bg-[#f5a623] hover:bg-[#e0961b] active:scale-[0.99] text-slate-950 font-bold text-sm transition-all shadow-md cursor-pointer flex items-center justify-center gap-2 mt-2"
              >
                {loading ? "Memvalidasi..." : "Masuk"}
              </button>

              {/* Optional Google Workspace Login */}
              <button
                type="button"
                onClick={handleGoogleAuth}
                disabled={googleLoading}
                className="w-full py-2 px-3 rounded-lg border border-slate-800 bg-[#101726]/60 hover:bg-[#101726] text-slate-300 hover:text-white transition-all flex items-center justify-center gap-2 text-xs font-medium cursor-pointer"
              >
                {googleLoading ? (
                  <RefreshCw className="w-3.5 h-3.5 animate-spin text-[#f5a623]" />
                ) : (
                  <svg className="w-3.5 h-3.5 shrink-0" viewBox="0 0 24 24">
                    <path
                      fill="#4285F4"
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    />
                    <path
                      fill="#34A853"
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    />
                    <path
                      fill="#FBBC05"
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                    />
                    <path
                      fill="#EA4335"
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                    />
                  </svg>
                )}
                <span>Masuk dengan Akun Google</span>
              </button>
            </form>

            {/* AKUN DEMO Card */}
            <div className="mt-6 p-4 rounded-xl bg-[#101726]/90 border border-slate-800 space-y-2.5">
              <div className="text-[10px] text-slate-500 uppercase tracking-widest font-bold font-mono">
                AKUN DEMO
              </div>

              <div className="space-y-2">
                {/* 1. Waspang Lapangan */}
                <div
                  onClick={() => handleQuickDemo("waspang@rfs.telco.id", "waspang123")}
                  className="p-2.5 rounded-lg bg-[#0b101b] border border-slate-800/80 hover:border-amber-500/60 flex items-center justify-between gap-3 cursor-pointer group transition-all"
                  title="Klik untuk masuk langsung sebagai Waspang Lapangan"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-7 h-7 rounded-md bg-indigo-500/20 text-indigo-400 font-bold text-xs flex items-center justify-center shrink-0">
                      W
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-slate-200 group-hover:text-[#f5a623] transition-colors leading-tight">
                        Waspang Lapangan
                      </p>
                      <p className="text-[11px] text-slate-400 font-mono truncate">
                        waspang@rfs.telco.id
                      </p>
                    </div>
                  </div>
                  <span className="text-[10px] font-mono text-teal-400 font-semibold shrink-0 group-hover:underline">
                    Login Waspang &rarr;
                  </span>
                </div>

                {/* 2. Teknisi Lapangan */}
                <div
                  onClick={() => handleQuickDemo("teknisi@rfs.telco.id", "teknisi123")}
                  className="p-2.5 rounded-lg bg-[#0b101b] border border-slate-800/80 hover:border-amber-500/60 flex items-center justify-between gap-3 cursor-pointer group transition-all"
                  title="Klik untuk masuk langsung sebagai Teknisi Lapangan"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-7 h-7 rounded-md bg-emerald-500/20 text-emerald-400 font-bold text-xs flex items-center justify-center shrink-0">
                      T
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-slate-200 group-hover:text-[#f5a623] transition-colors leading-tight">
                        Teknisi Lapangan
                      </p>
                      <p className="text-[11px] text-slate-400 font-mono truncate">
                        teknisi@rfs.telco.id
                      </p>
                    </div>
                  </div>
                  <span className="text-[10px] font-mono text-emerald-400 font-semibold shrink-0 group-hover:underline">
                    Login Teknisi &rarr;
                  </span>
                </div>

                {/* 3. Super Admin */}
                <div
                  onClick={() => handleQuickDemo("admin@rfs.telco.id", "admin123")}
                  className="p-2 rounded-lg bg-[#0b101b]/60 border border-slate-800/50 hover:border-amber-500/40 flex items-center justify-between gap-3 cursor-pointer group transition-all"
                  title="Klik untuk masuk langsung sebagai Super Admin"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-6 h-6 rounded-md bg-amber-500/20 text-[#f5a623] font-bold text-xs flex items-center justify-center shrink-0">
                      A
                    </div>
                    <div className="min-w-0">
                      <p className="text-[11.5px] font-semibold text-slate-300 group-hover:text-[#f5a623] transition-colors leading-tight">
                        Super Admin NOC
                      </p>
                      <p className="text-[10px] text-slate-500 font-mono truncate">
                        admin@rfs.telco.id
                      </p>
                    </div>
                  </div>
                  <span className="text-[9.5px] font-mono text-cyan-400 font-semibold shrink-0 group-hover:underline">
                    Login Admin &rarr;
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Bottom Footer */}
      <footer className="w-full max-w-7xl mx-auto px-6 sm:px-12 py-6 flex items-center justify-between gap-4 text-[10px] sm:text-[11px] font-mono tracking-wider text-slate-500 uppercase">
        <div>OLT &rarr; ODC &rarr; ODP &rarr; ONT</div>
        <div className="flex items-center gap-2 sm:gap-3">
          <span>&copy; @rhd26</span>
          <span className="text-slate-700">•</span>
          <span className="text-slate-400 font-bold">BimaWaluya v2.1</span>
        </div>
      </footer>
    </div>
  );
};
