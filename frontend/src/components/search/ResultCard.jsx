import Badge from "../common/Badge";
import { formatScore } from "../../utils/formatters";

export default function ResultCard({ result, rank }) {
  const preview =
    result.metadata?.text?.slice(0, 120) ||
    result.metadata?.title ||
    result.metadata?.category ||
    "No preview";

  return (
    <div className="glass-card flex items-start gap-4 p-4 transition-colors hover:border-neon/20">
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-neon/10 font-mono text-sm text-neon">
        {rank}
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <h4 className="font-semibold text-white">{result.id}</h4>
          <Badge variant="neon">{formatScore(result.score)}</Badge>
          {result.metadata?.category && (
            <Badge>{result.metadata.category}</Badge>
          )}
        </div>
        <p className="mt-1 line-clamp-2 text-sm text-gray-400">{preview}</p>
      </div>
    </div>
  );
}
