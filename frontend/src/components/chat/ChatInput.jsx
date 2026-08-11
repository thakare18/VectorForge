import { Send } from "lucide-react";
import Button from "../common/Button";

export default function ChatInput({ value, onChange, onSubmit, loading, placeholder }) {
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit();
      }}
      className="flex gap-2"
    >
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="flex-1 rounded-full border border-white/10 bg-white/5 px-4 py-3 text-sm text-white placeholder:text-gray-500 focus:border-neon/40 focus:outline-none"
        disabled={loading}
      />
      <Button type="submit" loading={loading} disabled={!value.trim()}>
        <Send size={16} />
      </Button>
    </form>
  );
}
