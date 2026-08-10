export default function Badge({ children, variant = "default", className = "" }) {
  const styles = {
    default: "bg-white/5 text-gray-300 border-white/10",
    neon: "bg-neon/10 text-neon border-neon/30",
    success: "bg-green-500/10 text-green-400 border-green-500/30",
    warning: "bg-orange-500/10 text-orange-400 border-orange-500/30",
    fastest: "bg-neon text-black border-neon font-semibold",
  };

  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-0.5 font-mono text-xs ${styles[variant]} ${className}`}
    >
      {children}
    </span>
  );
}
