"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { Send, UploadIcon } from "lucide-react";
import { ChangeEvent, useState } from "react";

type Citation = {
  source: string;
  chunkId: number;
  preview: string;
};

type RunResult = {
  ok: boolean;
  threadId: string;
  answer: string;
  citations: Citation[];
};

type ChatBubble = {
  role: "user" | "assistant";
  content: string;
  citations?: Citation[];
};

export default function Home() {
  // chat state
  const [input, setInput] = useState("");
  const [thread, setThread] = useState<ChatBubble[]>([]);
  const [loading, setLoading] = useState(false);

  // threadid
  const [threadId, setThreadId] = useState<string | null>(null);

  // KB upload UI/panel
  const [showUploadPanel, setShowUploadPanel] = useState(false);
  const [uploadMsg, setUploadMsg] = useState<string | null>(null);
  const [ingestRes, setIngestRes] = useState<string | null>(null);

  async function uploadFile(file: File) {
    setUploadMsg("Uploading...");
    try {
      const fd = new FormData();
      fd.append("file", file);

      const BASE =
        process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:5000";

      const res = await fetch(`${BASE}/kb/upload`, {
        method: "POST",
        body: fd,
      });

      const json = await res.json();
      setIngestRes(JSON.stringify(json, null, 2));

      if (res.ok && json.ok) {
        setUploadMsg("Uploaded and ingested into KB");
      } else {
        setUploadMsg("Upload or ingest failed");
      }
    } catch (e) {
      setUploadMsg("Upload Failed...");
    }
  }

  function onFileInput(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) uploadFile(file);
    e.currentTarget.value = "";
  }

  async function onRun() {
    if (!input.trim()) return;

    const userContent = input.trim();
    const userMsg: ChatBubble = { role: "user", content: userContent };

    setThread((t) => [...t, userMsg]);
    setInput("");
    setLoading(true);

    try {
      const BASE =
        process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:5000";

      const res = await fetch(`${BASE}/agent/chat`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          threadId,
          message: userContent,
        }),
      });

      if (!res.ok) {
        setThread((t) => [
          ...t,
          {
            role: "assistant",
            content: "Something went wrong",
          },
        ]);

        return;
      }

      const json: RunResult = await res.json();

      if (json.threadId && json.threadId !== threadId) {
        setThreadId(json.threadId);
      }

      const assistantMsg: ChatBubble = {
        role: "assistant",
        content: json.answer,
        citations: json.citations || [],
      };

      setThread((t) => [...t, assistantMsg]);
    } catch (e) {
      console.log(e);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="h-screen flex flex-col bg-linear-to-b from-slate-50 to-slate-100">
      <div className="border-b border-slate-200 bg-white shadow-sm">
        <div className="max-w-6xl mx-auto px-4 md:px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-purple-600">
              <span className="text-white font-bold text-sm">AG</span>
            </div>
            <h1 className="text-lg font-semibold text-slate-900">Agent</h1>
          </div>
          <Button
            onClick={() => setShowUploadPanel(!showUploadPanel)}
            variant="outline"
            className="gap-2"
          >
            <UploadIcon className="h-4 w-4" />
            Upload KB
          </Button>
        </div>
      </div>

      {/* main content */}
      <div className="flex-1 flex overflow-auto">
        {/* chat area */}
        <div className="flex-1 flex flex-col">
          <ScrollArea>
            <div className="max-w-3xl mx-auto space-y-4 pb-8">
              {thread.length === 0 && !loading && (
                <div className="flex items-center justify-center h-full">
                  <div className="text-center space-y-4">
                    <div className="w-16 h-16 rounded-2xl bg-linear-to-br from-blue-500 to-purple-600 max-auto flex items-center justify-center ">
                      <UploadIcon className="w-8 h-8 text-white" />
                    </div>
                    <div>
                      <h2 className="text-2xl font-semibold text-slate-950 mb-2">
                        Welcome to Agent
                      </h2>
                      <p className="text-slate-600">
                        Upload your docs and ask queries based on your own
                        knowledge base
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {thread.map((m, i) => (
                <ChatRow key={i} msg={m} />
              ))}

              {loading && (
                <div className="flex justify-start">
                  <div className="bg-slate-100 text-slate-900 rounded-2xl px-4 py-3 flex gap-2">
                    <div className="w-2 h-2 rounded-full bg-slate-400 animate-bounce" />
                    <div className="w-2 h-2 rounded-full bg-slate-400 animate-bounce [animation-delay:0.2s]" />
                    <div className="w-2 h-2 rounded-full bg-slate-400 animate-bounce [animation-delay:0.2s]" />
                  </div>
                </div>
              )}
            </div>
          </ScrollArea>

          <div className="border-t border-slate-200 bg-white p-5 md:p-6">
            <div className="max-w-3xl mx-auto space-y-3">
              <Textarea
                value={input}
                onChange={(event) => setInput(event.target.value)}
                placeholder="Ask anything about your uploaded docs..."
                className="resize-none min-h-[100px] rounded-xl border-slate-400 bg-slate-50"
              />
              <div className="flex items-center justify-between">
                <div className="text-xs text-slate-500">
                  {threadId && (
                    <span>
                      Thread: <code className="text-[10px]">{threadId}</code>
                    </span>
                  )}
                </div>
                <Button
                  onClick={onRun}
                  className="gap-2 rounded-lg bg-linear-to-br from-blue-500 to-purple-600 text-white"
                >
                  {loading ? "Thinking..." : "Send"}
                  <Send className="w-5 h-5" />
                </Button>
              </div>
            </div>
          </div>
        </div>

        {showUploadPanel && (
          <div className="w-96 border-l border-slate-200 flex flex-col overflow-hidden">
            <div className="border-b border-slate-200 p-4">
              <div className="flex items-center justify-between">
                <h2 className="font-semibold text-slate-900">Knowledge Base</h2>
                <button
                  className="bg-linear-to-br from-blue-500 p-2 to-purple-600 text-white"
                  onClick={() => setShowUploadPanel(false)}
                >
                  Close
                </button>
              </div>
            </div>

            <ScrollArea className="flex-1 p-4 space-y-4">
              <div className="space-y-2 mb-4">
                <Label className="text-slate-700 font-medium">
                  Namespace : Default
                </Label>
              </div>
              <Separator />
              <div className="space-y-2">
                <Label className="text-slate-700 font-medium">
                  Upload File
                </Label>
                <div className="rounded-xl border-2 border-dashed border-slate-300 bg-slate-50 text-center">
                  <Input
                    type="file"
                    accept=".pdf,.txt,.md, application/pdf, text/plain, text/markdown"
                    onChange={onFileInput}
                    id="file-upload"
                  />
                </div>
              </div>
              {uploadMsg && (
                <div className="p-3 text-sm text-slate-700">{uploadMsg}</div>
              )}

              {ingestRes && (
                <div>
                  <Label>Last Ingest response</Label>
                  <p>{ingestRes}</p>
                </div>
              )}
            </ScrollArea>
          </div>
        )}
      </div>
    </div>
  );
}

function ChatRow({ msg }: { msg: ChatBubble }) {
  const isUser = msg.role === "user";

  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
      <div className="flex gap-3 max-w-2xl">
        {!isUser && (
          <div className="w-8 h-8 rounded-lg bg-linear-to-br from-blue-500 to-purple-600 shrink-0 flex items-center justify-center">
            <span className="text-white text-xs font-bold">AG</span>
          </div>
        )}

        <div
          className={`rounded-xl px-4 py-4 text-sm leading-relaxed
           ${
             isUser ? "bg-blue-500 text-white" : "bg-slate-100 text-slate-900"
           } `}
        >
          <div className="whitespace-pre-wrap">{msg.content}</div>

          {!isUser && msg.citations && msg.citations.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-2">
              {msg.citations.map((c, i) => (
                <Badge
                  key={i}
                  variant={"secondary"}
                  className="text-xs bg-slate-100 text-slate-700"
                >
                  {c.source} #{c.chunkId}
                </Badge>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
