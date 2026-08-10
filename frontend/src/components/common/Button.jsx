export default function Button({
  children,
  variant = "primary",
  className = "",
  loading = false,
  disabled = false,
  ...props
}) {
  const base =
    variant === "primary"
      ? "btn-primary inline-flex items-center justify-center gap-2 disabled:opacity-50"
      : variant === "ghost"
        ? "text-gray-400 hover:text-neon transition-colors disabled:opacity-50"
        : "btn-secondary inline-flex items-center justify-center gap-2 disabled:opacity-50";

  return (
    <button
      className={`${base} ${className}`}
      disabled={disabled || loading}
      {...props}
    >
      {loading && (
        <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
      )}
      {children}
    </button>
  );
}
