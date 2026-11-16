export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-500 via-primary-600 to-violet-600 flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex h-16 w-16 items-center justify-center rounded-3xl bg-white/20 backdrop-blur-sm mb-4">
            <span className="text-3xl font-black text-white">N</span>
          </div>
          <h1 className="text-2xl font-black text-white">NeuraMed</h1>
          <p className="text-sm text-white/70 mt-1">Shaxsiy tibbiy yordamchi</p>
        </div>
        {/* Card */}
        <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl p-6">
          {children}
        </div>
        <p className="text-center text-xs text-white/50 mt-6">
          © 2024 NeuraMed. Tibbiy maslahat emas.
        </p>
      </div>
    </div>
  );
}
