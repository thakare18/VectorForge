import { useEffect, useRef, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import toast from "react-hot-toast";
import { MessageSquare, Trash2 } from "lucide-react";
import PageHeader from "../components/common/PageHeader";
import Card from "../components/common/Card";
import Button from "../components/common/Button";
import EmptyState from "../components/common/EmptyState";
import ChatMessage from "../components/chat/ChatMessage";
import ChatInput from "../components/chat/ChatInput";
import { chat, ragChat } from "../services/ai.service";
import {
  addMessage,
  setChatLoading,
  setChatMode,
  clearChat,
} from "../store/slices/chatSlice";

export default function ChatPage() {
  const dispatch = useDispatch();
  const { messages, mode, loading } = useSelector((s) => s.chat);
  const [input, setInput] = useState("");
  const bottomRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  const sendMessage = async () => {
    const text = input.trim();
    if (!text) return;

    dispatch(addMessage({ role: "user", content: text }));
    setInput("");
    dispatch(setChatLoading(true));

    try {
      if (mode === "rag") {
        const res = await ragChat(text);
        const noAnswer = res.data.retrievedChunks === 0;
        dispatch(
          addMessage({
            role: "assistant",
            content: res.data.answer,
            sources: res.data.sources,
            noAnswer,
          })
        );
      } else {
        const res = await chat(text);
        dispatch(
          addMessage({ role: "assistant", content: res.data.answer })
        );
      }
    } catch (err) {
      toast.error(err.message);
      dispatch(
        addMessage({
          role: "assistant",
          content: `Error: ${err.message}`,
        })
      );
    } finally {
      dispatch(setChatLoading(false));
    }
  };

  return (
    <div className="fade-in flex h-[calc(100vh-8rem)] flex-col">
      <PageHeader
        title="AI Assistant"
        description="General chat or RAG mode using uploaded document vectors."
        action={
          <div className="flex gap-2">
            <Button
              variant={mode === "general" ? "primary" : "secondary"}
              onClick={() => dispatch(setChatMode("general"))}
            >
              General
            </Button>
            <Button
              variant={mode === "rag" ? "primary" : "secondary"}
              onClick={() => dispatch(setChatMode("rag"))}
            >
              RAG Mode
            </Button>
            <Button variant="ghost" onClick={() => dispatch(clearChat())}>
              <Trash2 size={16} />
              Clear
            </Button>
          </div>
        }
      />

      <Card className="flex flex-1 flex-col overflow-hidden">
        <div className="flex-1 space-y-4 overflow-y-auto p-2">
          {messages.length === 0 ? (
            <EmptyState
              icon={MessageSquare}
              title="Start a conversation"
              description={
                mode === "rag"
                  ? "Ask questions about your uploaded PDF documents."
                  : "Ask anything - answers are rendered in Markdown."
              }
            />
          ) : (
            messages.map((msg) => <ChatMessage key={msg.id} message={msg} />)
          )}
          {loading && (
            <div className="flex items-center gap-2 text-sm text-gray-500">
              <span className="inline-flex gap-1">
                <span className="h-2 w-2 animate-bounce rounded-full bg-neon [animation-delay:0ms]" />
                <span className="h-2 w-2 animate-bounce rounded-full bg-neon [animation-delay:150ms]" />
                <span className="h-2 w-2 animate-bounce rounded-full bg-neon [animation-delay:300ms]" />
              </span>
              Thinking...
            </div>
          )}
          <div ref={bottomRef} />
        </div>

        <div className="border-t border-white/10 p-4">
          <ChatInput
            value={input}
            onChange={setInput}
            onSubmit={sendMessage}
            loading={loading}
            placeholder={
              mode === "rag"
                ? "Ask about your uploaded document..."
                : "Type your message..."
            }
          />
        </div>
      </Card>
    </div>
  );
}
