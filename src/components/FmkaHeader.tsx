import React from "react";

/**
 * Logo Resmi PT. FAJAR MITRA KRIDA ABADI (Vector SVG)
 * Sesuai dengan spesifikasi visual pada foto lampiran kop surat resmi:
 * - Lingkaran hitam
 * - Gelombang sinusoidal hijau zamrud dengan garis kontur pita putih atas & bawah
 */
export const FmkaLogo: React.FC<{ className?: string }> = ({ className = "w-16 h-16" }) => {
  return (
    <svg
      viewBox="0 0 100 100"
      className={`${className} shrink-0 drop-shadow-sm select-none`}
      xmlns="http://www.w3.org/2000/svg"
      aria-label="Logo Resmi PT. FAJAR MITRA KRIDA ABADI"
    >
      {/* Lingkaran Dasar Hitam */}
      <circle cx="50" cy="50" r="48" fill="#0b0f19" />

      {/* Kontur Pita Putih Atas (Wave Upper Border) */}
      <path
        d="M 4 48 C 18 64, 38 64, 52 50 C 66 36, 84 38, 96 46 L 96 52 C 84 44, 66 42, 52 56 C 38 70, 18 70, 4 54 Z"
        fill="#ffffff"
      />

      {/* Badan Gelombang Hijau Zamrud (Emerald Green Wave) */}
      <path
        d="M 4 52 C 18 67, 38 67, 52 53 C 66 39, 84 41, 96 49 L 96 59 C 84 51, 66 49, 52 63 C 38 77, 18 77, 4 62 Z"
        fill="#10a34a"
      />

      {/* Kontur Pita Putih Bawah (Wave Lower Border) */}
      <path
        d="M 4 60 C 18 75, 38 75, 52 61 C 66 47, 84 49, 96 57 L 96 63 C 84 55, 66 53, 52 67 C 38 81, 18 81, 4 66 Z"
        fill="#ffffff"
      />
    </svg>
  );
};

/**
 * Logo Sertifikasi Mutu CIQS 2000:2018 (Stencil Art)
 */
export const CiqsLogo: React.FC<{ className?: string }> = ({ className = "" }) => {
  return (
    <div className={`flex flex-col items-end justify-center shrink-0 select-none ${className}`}>
      <span className="text-[10px] sm:text-[11px] font-black tracking-widest text-slate-900 font-sans leading-none mb-0.5">
        2000:2018
      </span>
      <div className="flex items-center text-slate-950 font-black tracking-tight text-3xl sm:text-4xl leading-none font-serif">
        {/* Huruf C Stencil */}
        <span className="relative inline-block">
          C
          <span className="absolute top-[42%] left-0 w-full h-[2px] bg-white"></span>
        </span>
        {/* Huruf I Stencil */}
        <span className="relative inline-block mx-0.5">
          I
          <span className="absolute top-[42%] left-0 w-full h-[2px] bg-white"></span>
        </span>
        {/* Huruf Q Stencil (Globe Orb) */}
        <span className="relative inline-block mx-0.5">
          Q
          <span className="absolute top-[42%] left-0 w-full h-[2px] bg-white"></span>
        </span>
        {/* Huruf S Stencil */}
        <span className="relative inline-block">
          S
          <span className="absolute top-[42%] left-0 w-full h-[2px] bg-white"></span>
        </span>
      </div>
    </div>
  );
};

/**
 * KOP Surat Resmi PT. FAJAR MITRA KRIDA ABADI
 * Disesuaikan persis dengan foto lampiran asli:
 * 1. Banner pita ungu di bagian atas tengah
 * 2. Logo lingkaran hitam-hijau-putih di kiri
 * 3. Nama perusahaan tebal biru dongker & sub-judul kontraktor ungu miring di tengah
 * 4. Logo CIQS 2000:2018 di kanan
 * 5. Garis ganda tebal & tipis di bagian bawah
 */
export const FmkaOfficialKop: React.FC<{
  showPurpleBanner?: boolean;
  className?: string;
}> = ({ showPurpleBanner = true, className = "" }) => {
  return (
    <div
      className={`w-full print-section ${className}`}
      style={{ breakInside: "avoid", pageBreakInside: "avoid" }}
    >
      {/* 1. Pita Ungu Khas di Atas Tengah */}
      {showPurpleBanner && (
        <div className="flex justify-center -mt-1 sm:-mt-2 mb-3 print:mb-2">
          <div className="h-4 sm:h-5 w-56 sm:w-80 bg-[#50246a] rounded-b-sm shadow-sm print:shadow-none"></div>
        </div>
      )}

      {/* 2. Baris Utama: Logo Kiri - Identitas Perusahaan - CIQS Kanan */}
      <div className="flex items-center justify-between gap-3 sm:gap-6">
        {/* Kiri: Logo Lingkaran FMKA */}
        <FmkaLogo className="w-16 h-16 sm:w-20 sm:h-20" />

        {/* Tengah: Nama & Bidang Perusahaan */}
        <div className="flex-1 text-left sm:text-center pl-1 sm:pl-0">
          <h1 className="text-xl sm:text-2xl md:text-[26px] font-black tracking-tight text-[#0f2858] uppercase font-sans leading-tight">
            PT. FAJAR MITRA KRIDA ABADI
          </h1>
          <p className="text-xs sm:text-sm md:text-[15px] italic font-serif text-[#642b73] font-medium tracking-wide mt-1">
            Telecommunication &amp; Civil Contractor
          </p>
        </div>

        {/* Kanan: Sertifikasi CIQS 2000:2018 */}
        <CiqsLogo />
      </div>

      {/* 3. Garis Ganda Pembatas Resmi Dokumen Korporat */}
      <div className="mt-3 sm:mt-4">
        <div className="border-b-[3px] border-slate-950 w-full"></div>
        <div className="border-b-[1px] border-slate-950 w-full mt-[2px]"></div>
      </div>
    </div>
  );
};
