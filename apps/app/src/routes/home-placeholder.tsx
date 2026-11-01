import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";

import {
  Button,
  Card,
  CardContent,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@repo/ui";

import { useAuth } from "../modules/auth/AuthProvider";
import { loadAuthToken } from "../modules/auth/auth-storage";
import { API_BASE_URL } from "../shared/api-client";

interface Expert {
  key: string;
  name: string;
  title: string;
  description: string;
}

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
}

interface ConnectorStatus {
  id: string;
  status: string;
}

const API_BASE = API_BASE_URL;

async function authFetch(path: string, init?: RequestInit): Promise<Response> {
  const token = loadAuthToken();
  return fetch(`${API_BASE}${path}`, {
    ...init,
    headers: {
      ...(init?.headers ?? {}),
      ...(token ? { authorization: `Bearer ${token}` } : {}),
    },
  });
}

export default function HomePlaceholder() {
  const navigate = useNavigate();
  const { user, token, clearToken } = useAuth();

  const [experts, setExperts] = useState<Expert[]>([]);
  const [selectedExpert, setSelectedExpert] = useState<string>("");
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [conversationsByExpert, setConversationsByExpert] = useState<
    Record<string, string>
  >({});

  const [uploadOpen, setUploadOpen] = useState(false);
  const [uploadUrl, setUploadUrl] = useState("");
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadStatus, setUploadStatus] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  const firstName = user?.firstName ?? "there";

  useEffect(() => {
    void (async () => {
      try {
        const res = await authFetch("/api/v1/experts");
        if (res.ok) {
          const data = (await res.json()) as Expert[];
          setExperts(data);
          if (data.length > 0) setSelectedExpert(data[0].key);
        }
      } catch {
        // ignore
      }
    })();
  }, []);

  useEffect(() => {
    if (!selectedExpert) return;
    void (async () => {
      try {
        const res = await authFetch(
          `/api/v1/experts/${selectedExpert}/suggestions`,
        );
        if (res.ok) {
          const data = (await res.json()) as { suggestions: string[] };
          setSuggestions(data.suggestions ?? []);
        }
      } catch {
        // ignore
      }
    })();
    setMessages([]);
  }, [selectedExpert]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSignOut = async (): Promise<void> => {
    try {
      if (token) {
        await fetch(`${API_BASE}/api/v1/auth/sign-out`, {
          method: "POST",
          headers: { authorization: `Bearer ${token}` },
        });
      }
    } catch {
      // ignore
    } finally {
      clearToken();
      navigate("/auth/sign-in", { replace: true });
    }
  };

  const ensureConversation = useCallback(async (): Promise<string | null> => {
    const existing = conversationsByExpert[selectedExpert];
    if (existing) return existing;
    try {
      const res = await authFetch("/api/v1/conversations", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ expertKey: selectedExpert, title: null }),
      });
      if (!res.ok) return null;
      const data = (await res.json()) as { id: string };
      setConversationsByExpert((prev) => ({
        ...prev,
        [selectedExpert]: data.id,
      }));
      return data.id;
    } catch {
      return null;
    }
  }, [selectedExpert, conversationsByExpert]);

  const sendMessage = useCallback(
    async (content: string) => {
      if (!content.trim() || isStreaming || !selectedExpert) return;
      const userMsg: Message = {
        id: crypto.randomUUID(),
        role: "user",
        content,
      };
      setMessages((prev) => [...prev, userMsg]);
      setInput("");
      setIsStreaming(true);

      const convId = await ensureConversation();
      if (!convId) {
        setMessages((prev) => [
          ...prev,
          {
            id: crypto.randomUUID(),
            role: "assistant",
            content: "Failed to create conversation.",
          },
        ]);
        setIsStreaming(false);
        return;
      }

      const assistantId = crypto.randomUUID();
      setMessages((prev) => [
        ...prev,
        { id: assistantId, role: "assistant", content: "" },
      ]);

      try {
        const res = await authFetch(
          `/api/v1/conversations/${convId}/messages`,
          {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ content, expertKey: selectedExpert }),
          },
        );
        if (!res.ok || !res.body) {
          throw new Error("Request failed");
        }
        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop() ?? "";
          for (const line of lines) {
            if (!line.startsWith("data:")) continue;
            const payload = line.slice(5).trim();
            if (!payload) continue;
            try {
              const parsed = JSON.parse(payload) as {
                type: string;
                content?: string;
                message?: string;
              };
              if (parsed.type === "token" && parsed.content) {
                setMessages((prev) =>
                  prev.map((m) =>
                    m.id === assistantId
                      ? { ...m, content: m.content + parsed.content! }
                      : m,
                  ),
                );
              } else if (parsed.type === "error") {
                setMessages((prev) =>
                  prev.map((m) =>
                    m.id === assistantId
                      ? { ...m, content: parsed.message ?? "Error" }
                      : m,
                  ),
                );
              }
            } catch {
              // ignore parse errors
            }
          }
        }
      } catch (err) {
        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantId
              ? { ...m, content: "Failed to get response." }
              : m,
          ),
        );
      } finally {
        setIsStreaming(false);
      }
    },
    [selectedExpert, ensureConversation, isStreaming],
  );

  const handleUpload = async (): Promise<void> => {
    setIsUploading(true);
    setUploadStatus(null);
    try {
      let res: Response;
      if (uploadFile) {
        const form = new FormData();
        form.append("file", uploadFile);
        const token = loadAuthToken();
        res = await fetch(`${API_BASE}/api/v1/connectors/upload`, {
          method: "POST",
          headers: token ? { authorization: `Bearer ${token}` } : {},
          body: form,
        });
      } else if (uploadUrl.trim()) {
        res = await authFetch("/api/v1/connectors/url", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ url: uploadUrl.trim() }),
        });
      } else {
        return;
      }
      if (!res.ok) throw new Error("Upload failed");
      const data = (await res.json()) as ConnectorStatus;
      setUploadStatus(`Submitted: ${data.id} (${data.status})`);
      // poll status
      const poll = async () => {
        const r = await authFetch(`/api/v1/connectors/${data.id}`);
        if (r.ok) {
          const c = (await r.json()) as ConnectorStatus;
          setUploadStatus(`${c.id}: ${c.status}`);
          if (c.status === "pending" || c.status === "processing") {
            setTimeout(poll, 2000);
          }
        }
      };
      setTimeout(poll, 2000);
    } catch {
      setUploadStatus("Upload failed");
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <main className="flex min-h-dvh flex-col bg-background text-foreground">
      <header className="border-b border-border/60 bg-background/80 backdrop-blur">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-4 py-4 sm:px-6">
          <div className="flex items-center gap-2">
            <span className="inline-flex size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-sm">
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="size-4"
                aria-hidden="true"
              >
                <path d="M12 2l3 6 6 1-4.5 4 1 6-5.5-3-5.5 3 1-6L3 9l6-1 3-6z" />
              </svg>
            </span>
            <span className="text-sm font-semibold tracking-tight">
              Coders University
            </span>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={handleSignOut}
          >
            Sign out
          </Button>
        </div>
      </header>

      <div className="mx-auto flex w-full max-w-6xl flex-1 flex-col px-4 py-6 sm:px-6">
        <section className="mb-4">
          <h1 className="text-2xl font-semibold tracking-tight">
            Welcome back, {firstName}
          </h1>
          <p className="text-sm text-muted-foreground">
            Choose an expert and start a conversation.
          </p>
        </section>

        <Card className="flex flex-1 flex-col border-border/60 shadow-sm">
          <CardContent className="flex flex-1 flex-col gap-4 p-4">
            <div
              className="flex-1 space-y-3 overflow-y-auto"
              aria-live="polite"
            >
              {messages.length === 0 && (
                <p className="text-sm text-muted-foreground">
                  No messages yet. Try a suggestion below.
                </p>
              )}
              {messages.map((m) => (
                <div
                  key={m.id}
                  className={m.role === "user" ? "text-right" : "text-left"}
                >
                  <div
                    className={
                      m.role === "user"
                        ? "inline-block rounded-lg bg-primary px-3 py-2 text-sm text-primary-foreground"
                        : "inline-block rounded-lg bg-muted px-3 py-2 text-sm text-foreground"
                    }
                  >
                    {m.content ||
                      (isStreaming && m.role === "assistant" ? "..." : "")}
                  </div>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>

            {suggestions.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {suggestions.map((s) => (
                  <Button
                    key={s}
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => void sendMessage(s)}
                    disabled={isStreaming}
                  >
                    {s}
                  </Button>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Footer bar */}
      <footer className="sticky bottom-0 border-t border-border/60 bg-background/90 backdrop-blur">
        <div className="mx-auto flex w-full max-w-6xl items-end gap-2 px-4 py-3 sm:px-6">
          <div className="w-48">
            <Select value={selectedExpert} onValueChange={setSelectedExpert}>
              <SelectTrigger aria-label="Expert">
                <SelectValue placeholder="Expert" />
              </SelectTrigger>
              <SelectContent>
                {experts.map((e) => (
                  <SelectItem key={e.key} value={e.key}>
                    {e.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <textarea
            className="min-h-[44px] flex-1 resize-none rounded-md border border-input bg-background px-3 py-2 text-sm"
            placeholder="Ask the expert..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                void sendMessage(input);
              }
            }}
            aria-label="Prompt"
          />
          <Button
            type="button"
            onClick={() => void sendMessage(input)}
            disabled={isStreaming || !input.trim()}
          >
            Send
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => setUploadOpen(true)}
            aria-label="Add connection"
          >
            +
          </Button>
        </div>
      </footer>

      <Dialog open={uploadOpen} onOpenChange={setUploadOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add connection</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <input
              type="file"
              onChange={(e) => setUploadFile(e.target.files?.[0] ?? null)}
              accept=".pdf,.txt,.md,.jpg,.jpeg,.png,.mp4,.mp3"
            />
            <div className="text-center text-xs text-muted-foreground">or</div>
            <input
              type="url"
              placeholder="https://example.com"
              value={uploadUrl}
              onChange={(e) => setUploadUrl(e.target.value)}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            />
            <Button
              type="button"
              onClick={() => void handleUpload()}
              disabled={isUploading}
            >
              {isUploading ? "Uploading..." : "Submit"}
            </Button>
            {uploadStatus && (
              <p className="text-xs text-muted-foreground">{uploadStatus}</p>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </main>
  );
}
