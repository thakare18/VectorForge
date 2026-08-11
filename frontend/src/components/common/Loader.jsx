export default function Loader({ label = "Loading..." }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-12">
      <div className="h-10 w-10 animate-spin rounded-full border-2 border-neon border-t-transparent" />
      <p className="font-mono text-sm text-gray-400">{label}</p>
    </div>
  );
}
