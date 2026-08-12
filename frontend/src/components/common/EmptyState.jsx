export default function EmptyState({ icon: Icon, title, description, action }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      {Icon && (
        <div className="mb-4 rounded-full border border-white/10 bg-white/5 p-4">
          <Icon className="text-neon" size={28} />
        </div>
      )}
      <h3 className="text-lg font-semibold text-white">{title}</h3>
      {description && (
        <p className="mt-2 max-w-sm text-sm text-gray-400">{description}</p>
      )}
      {action && <div className="mt-6">{action}</div>}
    </div>
  );
}
