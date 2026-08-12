export default function StatCard({ label, value, sub, icon: Icon, loading }) {
  return (
    <div className="glass-card card-hover-line p-5">
      <div className="mb-3 flex items-center justify-between">
        <span className="font-mono text-xs uppercase tracking-wider text-gray-500">
          {label}
        </span>
        {Icon && <Icon className="text-neon" size={18} />}
      </div>
      {loading ? (
        <div className="h-8 w-24 animate-pulse rounded bg-white/5" />
      ) : (
        <>
          <p className="text-2xl font-bold tracking-tight text-white">{value}</p>
          {sub && <p className="mt-1 text-xs text-gray-500">{sub}</p>}
        </>
      )}
    </div>
  );
}
