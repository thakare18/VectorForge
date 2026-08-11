import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Copy, Bot, User } from "lucide-react";
import toast from "react-hot-toast";
import SourceCard from "./SourceCard";

export default function ChatMessage({ message }) {
  const isUser = message.role === "user";

  const copyAnswer = () => {
    navigator.clipboard.writeText(message.content);
    toast.success("Copied to clipboard");
  };

  return (
    <div className={`flex gap-3 fade-in ${isUser ? "flex-row-reverse" : ""}`}>
      <div
        className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${
          isUser ? "bg-white/10" : "bg-neon/10"
        }`}
      >
        {isUser ? (
          <User size={16} className="text-gray-300" />
        ) : (
          <Bot size={16} className="text-neon" />
        )}
      </div>
      <div
        className={`max-w-[85%] rounded-2xl px-4 py-3 ${
          isUser
            ? "bg-white/10 text-white"
            : "glass-card border border-white/5"
        }`}
      >
        {isUser ? (
          <p className="text-sm">{message.content}</p>
        ) : (
          <>
            <div className="prose prose-invert prose-sm max-w-none">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>
                {message.content}
              </ReactMarkdown>
            </div>
            {message.sources?.length > 0 && (
              <div className="mt-4 space-y-2 border-t border-white/10 pt-3">
                <p className="font-mono text-xs text-gray-500">Sources</p>
                {message.sources.map((src) => (
                  <SourceCard key={src.id} source={src} />
                ))}
              </div>
            )}
            <button
              onClick={copyAnswer}
              className="mt-3 flex items-center gap-1 text-xs text-gray-500 hover:text-neon"
            >
              <Copy size={12} />
              Copy
            </button>
          </>
        )}
      </div>
    </div>
  );
}
