import Badge from "../common/Badge";
import { formatScore } from "../../utils/formatters";

export default function SourceCard({ source }) {
  return (
    <div className="flex items-center justify-between rounded-lg bg-white/5 px-3 py-2">
      <span className="font-mono text-xs text-gray-300">{source.id}</span>
      <Badge variant="neon">{formatScore(source.score)}</Badge>
    </div>
  );
}
