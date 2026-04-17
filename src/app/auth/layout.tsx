export default function AuthLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 to-slate-800 px-4">
      <div className="w-full max-w-md">
        <div className="bg-slate-800 border border-slate-700 rounded-lg shadow-xl p-8">
          <h1 className="text-center text-2xl font-bold text-white mb-8">
            Theo<span className="text-rose-500">Finance</span>
          </h1>
          {children}
        </div>
      </div>
    </div>
  )
}
