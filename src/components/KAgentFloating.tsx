import { type FormEvent, useCallback, useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api";
import { OPEN_AGENT_EVENT, type KAgentContext } from "../agentEvents";
import { useProfile } from "../hooks/useRemote";
import { AgentHistoryView, AgentOverflowMenu } from "./AgentHistory";

type Room = {
  id: string;
  name: string;
  context: { type: string; title: string; referenceId: string | null; version: string | null };
  version: number;
  updatedAt: string;
  lastMessageAt: string | null;
};
type Message = {
  id: string;
  role: "USER" | "ASSISTANT";
  content: string;
  citations: Array<{ id: string; title: string; url: string | null }>;
  insufficientEvidence: boolean;
  refusalReason: string | null;
  disclaimer: string | null;
};
type Generation = { id: string; status: string; errorCode: string | null };

export function KAgentFloating() {
  const [open, setOpen] = useState(false);
  const [context, setContext] = useState<KAgentContext>({ contextType: "GENERAL" });
  const launcherRef = useRef<HTMLButtonElement>(null);
  const close = useCallback(() => {
    setOpen(false);
    window.requestAnimationFrame(() => launcherRef.current?.focus());
  }, []);
  useEffect(() => {
    const handleOpen = (event: Event) => {
      setContext((event as CustomEvent<KAgentContext>).detail || { contextType: "GENERAL" });
      setOpen(true);
    };
    window.addEventListener(OPEN_AGENT_EVENT, handleOpen);
    return () => window.removeEventListener(OPEN_AGENT_EVENT, handleOpen);
  }, []);
  return <>
    <button type="button" className="agent-launcher" aria-label="Open K-Agent" aria-haspopup="dialog" aria-expanded={open} onClick={() => { setContext({ contextType: "GENERAL" }); setOpen(true); }} ref={launcherRef} hidden={open}>
      <span className="agent-launcher-surface" aria-hidden="true" />
      <span className="agent-launcher-inner" aria-hidden="true" />
      <img src="/assets/k-agent-floating.svg" alt="" />
    </button>
    {open ? <KAgentPanel close={close} requestedContext={context} /> : null}
  </>;
}

function KAgentPanel({ close, requestedContext }: { close: () => void; requestedContext: KAgentContext }) {
  const profile = useProfile();
  const [history, setHistory] = useState(false);
  const [room, setRoom] = useState<Room | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [draft, setDraft] = useState(requestedContext.prompt || "");
  const [generation, setGeneration] = useState<Generation | null>(null);
  const [error, setError] = useState("");
  const [streamingAnswer, setStreamingAnswer] = useState("");
  const [streamedMessageId, setStreamedMessageId] = useState<string | null>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    closeButtonRef.current?.focus();
    const handleKeyDown = (event: KeyboardEvent) => { if (event.key === "Escape") close(); };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [close]);

  useEffect(() => {
    if (!profile) return;
    const controller = new AbortController();
    api<Room[]>("/api/v1/me/chats", { signal: controller.signal })
      .then((rooms) => setRoom(rooms.find((candidate) => candidate.context.type === requestedContext.contextType && (requestedContext.referenceId == null || candidate.context.referenceId === requestedContext.referenceId)) || null))
      .catch((reason: unknown) => setError(reason instanceof Error ? reason.message : "Chat rooms could not be loaded."));
    return () => controller.abort();
  }, [profile, requestedContext.contextType, requestedContext.referenceId]);

  useEffect(() => {
    if (!room) { setMessages([]); return; }
    const controller = new AbortController();
    api<Message[]>(`/api/v1/me/chats/${room.id}/messages`, { signal: controller.signal })
      .then(setMessages)
      .catch((reason: unknown) => setError(reason instanceof Error ? reason.message : "Messages could not be loaded."));
    return () => controller.abort();
  }, [room]);

  useEffect(() => {
    if (!room || !generation || !["PENDING", "PROCESSING"].includes(generation.status)) return;
    const timer = window.setInterval(() => {
      void api<Generation>(`/api/v1/me/chats/${room.id}/generations/${generation.id}`)
        .then(async (current) => {
          setGeneration(current);
          if (!["PENDING", "PROCESSING"].includes(current.status)) {
            const next = await api<Message[]>(`/api/v1/me/chats/${room.id}/messages`);
            const newest = next.at(-1);
            setMessages(next);
            if (newest?.role === "ASSISTANT") {
              setStreamedMessageId(newest.id);
              setStreamingAnswer("");
              const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
              if (reduced) setStreamingAnswer(newest.content);
              else {
                let index = 0;
                const typing = window.setInterval(() => {
                  index += 1;
                  setStreamingAnswer(newest.content.slice(0, index));
                  if (index >= newest.content.length) window.clearInterval(typing);
                }, 14);
              }
            }
          }
        })
        .catch(() => setError("The answer status could not be refreshed."));
    }, 1200);
    return () => window.clearInterval(timer);
  }, [generation, room]);

  const ensureRoom = async () => {
    if (room) return room;
    const created = await api<Room>("/api/v1/me/chats", {
      method: "POST",
      body: JSON.stringify({ contextType: requestedContext.contextType, referenceId: requestedContext.referenceId || null }),
    });
    setRoom(created);
    return created;
  };

  const sendMessage = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const content = draft.trim();
    if (!content || !profile || generation && ["PENDING", "PROCESSING"].includes(generation.status)) return;
    setDraft(""); setError(""); setStreamingAnswer(""); setStreamedMessageId(null);
    try {
      const target = await ensureRoom();
      const result = await api<{ userMessage: Message; generation: Generation }>(`/api/v1/me/chats/${target.id}/messages`, {
        method: "POST",
        body: JSON.stringify({ clientMessageId: crypto.randomUUID(), content, selectedSectionId: null, selectedText: null }),
      });
      setMessages((current) => [...current, result.userMessage]);
      setGeneration(result.generation);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Your message was not sent.");
    }
  };

  const deleteConversation = async () => {
    if (!room) return;
    try {
      await api(`/api/v1/me/chats/${room.id}`, { method: "DELETE" });
      setRoom(null);
      setMessages([]);
      setGeneration(null);
      setStreamingAnswer("");
      setStreamedMessageId(null);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "This chat could not be deleted.");
    }
  };

  if (history) return <AgentHistoryView close={close} onConversation={(roomId) => {
    setHistory(false);
    if (roomId) void api<Room>(`/api/v1/me/chats/${roomId}`).then(setRoom).catch(() => setError("This chat could not be opened."));
  }} />;
  const generating = generation && ["PENDING", "PROCESSING"].includes(generation.status);
  return <aside className="agent-panel article-agent-panel global-agent-panel" role="dialog" aria-modal="true" aria-label="K-Agent chat">
    <button className="agent-close" type="button" onClick={close} ref={closeButtonRef}><img src="/assets/close.svg" alt="" /> Close</button>
    <header><img className="agent-logo" src="/assets/agent-badge.svg" alt="" /><div><h2>K-Agent</h2><p>AI Financial Intelligence</p></div><AgentOverflowMenu onHistory={() => setHistory(true)} onDelete={room ? () => void deleteConversation() : undefined} /></header>
    <div className="context-chip"><img src="/assets/agent-context.svg" alt="" /> {room?.context.title || "Korea market assistant"}</div>
    {!profile ? <div className="api-state"><b>Sign in to start a protected chat</b><span>Chat rooms and history are stored per account.</span><Link to={`/login?returnTo=${encodeURIComponent(window.location.pathname)}`}>Log in</Link></div> : null}
    <div className="chat global-agent-chat" aria-live="polite">
      {profile && messages.length === 0 ? <div className="ai-message"><p>Ask about Korean equities, news, DART filings, foreign ownership limits, or treaty tax information.</p></div> : null}
      {messages.map((message) => message.id === streamedMessageId ? null : message.role === "USER" ? <p className="user-message user-message-enter" key={message.id}>{message.content}</p> : <div className="ai-message ai-message-enter" key={message.id}><p>{message.content}</p>{message.insufficientEvidence ? <small>{message.refusalReason || "Insufficient evidence"}</small> : null}{message.citations.map((citation) => citation.url ? <a key={citation.id} href={citation.url} target="_blank" rel="noreferrer">{citation.title}</a> : <small key={citation.id}>{citation.title}</small>)}{message.disclaimer ? <small>{message.disclaimer}</small> : null}</div>)}
      {generating ? <div className="agent-thinking" role="status"><span className="agent-thinking-label">K-Agent is checking server sources</span><i /><i /><i /></div> : null}
      {streamedMessageId ? <div className="ai-message ai-message-enter"><p className="typewriter-answer">{streamingAnswer}<span className="typing-cursor" aria-hidden="true" /></p></div> : null}
      {generation?.status === "FAILED" ? <div className="api-state api-error"><span>{generation.errorCode || "AI generation failed."}</span></div> : null}
      {error ? <p className="auth-error" role="alert">{error}</p> : null}
    </div>
    <form className="chat-input global-agent-input" onSubmit={(event) => void sendMessage(event)}><input type="text" value={draft} onChange={(event) => setDraft(event.target.value)} placeholder="Ask anything about this market" aria-label="Message K-Agent" disabled={!profile} /><button type="submit" aria-label="Send message" disabled={!draft.trim() || !profile || Boolean(generating)}><img src="/assets/agent-send.svg" alt="" /></button></form>
  </aside>;
}
