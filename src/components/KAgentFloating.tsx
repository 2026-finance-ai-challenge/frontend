import { type FormEvent, useCallback, useEffect, useRef, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { api } from "../api";
import { OPEN_AGENT_EVENT, type KAgentContext } from "../agentEvents";
import { useProfile } from "../hooks/useRemote";
import { AgentHistoryView, AgentOverflowMenu } from "./AgentHistory";
import { useLocale } from "../state/LocaleContext";
import { TaxEligibilityPanel } from "./TaxEligibilityPanel";
import { answerWithCitationMarkers, citationHref, citationTitle, contextHref, filingPath, type AgentCitation } from "../agentCitations";
import { createSubmissionGate } from "../agentSubmission";
import { chatSubmissionBody, type AgentSelection } from "../agentSelection";
import { loadChatMessages, loadChatState, type AgentGeneration } from "../agentRecovery";

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
  citations: AgentCitation[];
  insufficientEvidence: boolean;
  refusalReason: string | null;
  disclaimer: string | null;
};
type Generation = AgentGeneration;

export function KAgentFloating() {
  const { locale } = useLocale();
  const profile = useProfile();
  const location = useLocation();
  const navigate = useNavigate();
  const [open, setOpen] = useState(location.pathname === "/tax");
  const [context, setContext] = useState<KAgentContext>({ contextType: location.pathname === "/tax" ? "TAX_GUIDE" : "GENERAL" });
  const [taxHistory, setTaxHistory] = useState(false);
  const launcherRef = useRef<HTMLButtonElement>(null);
  const openerRef = useRef<HTMLElement | null>(null);
  const close = useCallback(() => {
    setOpen(false);
    if (location.pathname === "/tax") navigate("/", { replace: true });
    window.requestAnimationFrame(() => (openerRef.current?.isConnected ? openerRef.current : launcherRef.current)?.focus());
  }, [location.pathname, navigate]);
  useEffect(() => {
    setOpen(location.pathname === "/tax");
    if (location.pathname === "/tax") setContext({ contextType: "TAX_GUIDE" });
  }, [location.pathname]);
  useEffect(() => {
    const handleOpen = (event: Event) => {
      openerRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
      setContext((event as CustomEvent<KAgentContext>).detail || { contextType: "GENERAL" });
      setTaxHistory(false);
      setOpen(true);
    };
    window.addEventListener(OPEN_AGENT_EVENT, handleOpen);
    return () => window.removeEventListener(OPEN_AGENT_EVENT, handleOpen);
  }, []);
  useEffect(() => {
    document.body.classList.toggle("agent-drawer-open", open);
    return () => document.body.classList.remove("agent-drawer-open");
  }, [open]);
  return <>
    <button type="button" className="agent-launcher" aria-label={locale === "ko" ? "K-Agent 열기" : "Open K-Agent"} aria-haspopup="dialog" aria-expanded={open} onClick={() => { openerRef.current = launcherRef.current; setContext({ contextType: "GENERAL" }); setOpen(true); }} ref={launcherRef} hidden={open}>
      <span className="agent-launcher-surface" aria-hidden="true" />
      <span className="agent-launcher-inner" aria-hidden="true" />
      <img src="/assets/k-agent-glyph-394-1451.svg" alt="" />
    </button>
    {open ? context.contextType === "TAX_GUIDE"
      ? taxHistory ? <AgentHistoryView close={close} onDeleted={() => undefined} onConversation={(roomId, type) => { setTaxHistory(false); if (type !== "TAX_GUIDE") setContext({ contextType: "GENERAL", roomId }); }} /> : <TaxEligibilityPanel key={profile?.id || "guest"} close={close} openHistory={() => setTaxHistory(true)} />
      : <KAgentPanel key={`${profile?.id || "guest"}:${context.roomId || context.requestId || `${context.contextType}:${context.referenceId || ""}`}`} close={close} requestedContext={context} openTax={() => { setTaxHistory(false); setContext({ contextType: "TAX_GUIDE" }); }} initialHistory={context.contextType === "GENERAL" && !context.requestId && !context.roomId} /> : null}
  </>;
}

function KAgentPanel({ close, requestedContext, openTax, initialHistory }: { close: () => void; requestedContext: KAgentContext; openTax: () => void; initialHistory: boolean }) {
  const { locale } = useLocale();
  const navigate = useNavigate();
  const profile = useProfile();
  const userId = profile?.id;
  const [history, setHistory] = useState(initialHistory);
  const [room, setRoom] = useState<Room | null>(null);
  const [roomResolved, setRoomResolved] = useState(false);
  const submissionGate = useRef(createSubmissionGate());
  const [messages, setMessages] = useState<Message[]>([]);
  const [draft, setDraft] = useState(requestedContext.prompt || "");
  const [generation, setGeneration] = useState<Generation | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [pollError, setPollError] = useState(false);
  const roomLoadRef = useRef<AbortController | null>(null);
  const selectedRoomRef = useRef<string | null>(null);
  const [roomLoadError, setRoomLoadError] = useState(false);
  const [loadRevision, setLoadRevision] = useState(0);
  const [streamingAnswer, setStreamingAnswer] = useState("");
  const [streamedMessageId, setStreamedMessageId] = useState<string | null>(null);
  const [localizedContextTitle, setLocalizedContextTitle] = useState("");
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    closeButtonRef.current?.focus();
    const handleKeyDown = (event: KeyboardEvent) => { if (event.key === "Escape") close(); };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [close]);

  useEffect(() => {
    if (!userId) return;
    const controller = new AbortController();
    roomLoadRef.current?.abort();
    roomLoadRef.current = controller;
    setRoomResolved(false);
    setRoomLoadError(false); setError("");
    (requestedContext.roomId
      ? api<Room>("/api/v1/me/chats/" + requestedContext.roomId, { signal: controller.signal }).then((value) => [value])
      : api<Room[]>("/api/v1/me/chats", { signal: controller.signal }))
      .then(async (rooms) => {
        const found = rooms.find((candidate) => requestedContext.roomId ? candidate.id === requestedContext.roomId : candidate.context.type === requestedContext.contextType && (requestedContext.referenceId == null || candidate.context.referenceId === requestedContext.referenceId)) || null;
        const loaded = found ? await loadChatState<Message>(api, found.id, controller.signal) : { messages: [], generation: null };
        if (controller.signal.aborted) return;
        setRoom(found); setMessages(loaded.messages); setGeneration(loaded.generation);
        setError(""); setPollError(false); setRoomResolved(true);
      })
      .catch((reason: unknown) => {
        if (!controller.signal.aborted) {
          setRoomLoadError(true);
          setError(reason instanceof Error ? reason.message : "Chat rooms could not be loaded.");
        }
      });
    return () => controller.abort();
  }, [userId, requestedContext.contextType, requestedContext.referenceId, requestedContext.roomId, loadRevision]);

  useEffect(() => {
    const referenceId = room?.context.referenceId || requestedContext.referenceId;
    const contextType = room?.context.type || requestedContext.contextType;
    if (contextType === "GENERAL") {
      setLocalizedContextTitle(locale === "ko" ? "한국 시장 도우미" : "Korea market assistant"); return;
    }
    if (contextType === "TAX_GUIDE") {
      setLocalizedContextTitle(locale === "ko" ? "배당 원천징수세" : "Dividend withholding tax"); return;
    }
    if (!referenceId) return;
    const controller = new AbortController();
    const path = contextType === "NEWS" ? `/api/v1/news/${referenceId}`
      : contextType === "FILING" ? `/api/v1/disclosures/${referenceId}`
        : `/api/v1/market/stocks/${referenceId}`;
    void api<Record<string, string>>(path, { signal: controller.signal }).then((value) => {
      if (controller.signal.aborted) return;
      setLocalizedContextTitle(locale === "ko"
        ? value.titleKo || value.originalTitle || value.nameKo || room?.context.title || ""
        : value.titleEn || value.englishTitle || value.nameEn || room?.context.title || "");
    }).catch(() => undefined);
    return () => controller.abort();
  }, [locale, requestedContext.contextType, requestedContext.referenceId, room?.context.title, room?.context.type, room?.context.referenceId]);

  useEffect(() => () => roomLoadRef.current?.abort(), []);

  const generationId = generation?.id;
  const pendingGeneration = Boolean(generation && ["PENDING", "PROCESSING"].includes(generation.status));
  useEffect(() => {
    if (!room || !generationId || !pendingGeneration) return;
    const controller = new AbortController();
    let timer: number;
    const poll = async () => {
      try {
        const current = await api<Generation>(`/api/v1/me/chats/${room.id}/generations/${generationId}`, { signal: controller.signal });
        if (controller.signal.aborted) return;
        if (["PENDING", "PROCESSING"].includes(current.status)) {
          setPollError(false);
          setGeneration(current);
          timer = window.setTimeout(() => void poll(), 1200);
          return;
        }
        const next = await loadChatMessages<Message>(api, room.id, controller.signal);
        if (controller.signal.aborted) return;
        setMessages(next);
        setGeneration(current);
        setPollError(false);
        const newest = next.at(-1);
        if (current.status === "COMPLETED" && newest?.role === "ASSISTANT") {
          setStreamingAnswer("");
          setStreamedMessageId(newest.id);
        }
      } catch {
        if (!controller.signal.aborted) {
          setPollError(true);
          timer = window.setTimeout(() => void poll(), 3000);
        }
      }
    };
    timer = window.setTimeout(() => void poll(), 1200);
    return () => { controller.abort(); window.clearTimeout(timer); };
  }, [generationId, pendingGeneration, room]);

  const animatedMessage = messages.find((message) => message.id === streamedMessageId);
  const animatedContent = animatedMessage ? answerWithCitationMarkers(animatedMessage.content, animatedMessage.citations) : undefined;
  useEffect(() => {
    if (animatedContent == null) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setStreamingAnswer(animatedContent);
      return;
    }
    let index = 0;
    const timer = window.setInterval(() => {
      index += 1;
      setStreamingAnswer(animatedContent.slice(0, index));
      if (index >= animatedContent.length) window.clearInterval(timer);
    }, 14);
    return () => window.clearInterval(timer);
  }, [animatedContent, streamedMessageId]);

  const ensureRoom = async () => {
    if (room) return room;
    const created = await api<Room>("/api/v1/me/chats", {
      method: "POST",
      body: JSON.stringify({ contextType: requestedContext.contextType, referenceId: requestedContext.referenceId || null }),
    });
    setRoom(created);
    return created;
  };

  const submitContent = async (content: string, clientMessageId: string = crypto.randomUUID(), selection?: AgentSelection) => {
    if (!content || !profile || !roomResolved || submitting || generation && ["PENDING", "PROCESSING"].includes(generation.status)) return;
    if (!submissionGate.current.start(clientMessageId)) return;
    setDraft(""); setError(""); setPollError(false); setStreamingAnswer(""); setStreamedMessageId(null);
    const optimisticId = `pending-${clientMessageId}`;
    const optimistic: Message = {
      id: optimisticId,
      role: "USER",
      content,
      citations: [],
      insufficientEvidence: false,
      refusalReason: null,
      disclaimer: null,
    };
    setMessages((current) => [...current, optimistic]);
    setSubmitting(true);
    try {
      const target = await ensureRoom();
      const result = await api<{ userMessage: Message; generation: Generation }>(`/api/v1/me/chats/${target.id}/messages`, {
        method: "POST",
        body: JSON.stringify(chatSubmissionBody(clientMessageId, content, selection)),
      });
      setMessages((current) => current.map((message) => message.id === optimisticId ? result.userMessage : message));
      setGeneration(result.generation);
    } catch (reason) {
      setMessages((current) => current.filter((message) => message.id !== optimisticId));
      setError(reason instanceof Error ? reason.message : "Your message was not sent.");
    } finally {
      submissionGate.current.finish();
      setSubmitting(false);
    }
  };
  useEffect(() => {
    if (profile && roomResolved && requestedContext.prompt?.trim() && requestedContext.requestId) {
      void submitContent(requestedContext.prompt.trim(), requestedContext.requestId, requestedContext.selection);
    }
  }, [profile, roomResolved, requestedContext.requestId]);
  const sendMessage = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    await submitContent(draft.trim());
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
  const stopGeneration = async () => {
    if (!room || !generation) return;
    try { setGeneration(await api<Generation>(`/api/v1/me/chats/${room.id}/generations/${generation.id}/stop`, { method: "POST" })); }
    catch (reason) { setError(reason instanceof Error ? reason.message : "Generation could not be stopped."); }
  };
  const retryGeneration = async () => {
    if (!room || !generation?.retryable || generation.status !== "FAILED") return;
    try { setError(""); setGeneration(await api<Generation>(`/api/v1/me/chats/${room.id}/generations/${generation.id}/retry`, { method: "POST" })); }
    catch (reason) { setError(reason instanceof Error ? reason.message : "Generation could not be retried."); }
  };
  const login = () => {
    close();
    navigate(`/login?returnTo=${encodeURIComponent(window.location.pathname)}`);
  };

  const openConversation = async (roomId: string) => {
    roomLoadRef.current?.abort();
    const controller = new AbortController();
    roomLoadRef.current = controller;
    selectedRoomRef.current = roomId;
    setRoomLoadError(false);
    setRoomResolved(false); setRoom(null); setMessages([]); setGeneration(null);
    setError(""); setPollError(false); setStreamedMessageId(null); setStreamingAnswer("");
    try {
      const selected = await api<Room>(`/api/v1/me/chats/${roomId}`, { signal: controller.signal });
      const loaded = await loadChatState<Message>(api, roomId, controller.signal);
      if (controller.signal.aborted) return;
      setRoom(selected); setMessages(loaded.messages); setGeneration(loaded.generation); setRoomResolved(true);
    } catch {
      if (!controller.signal.aborted) { setRoomLoadError(true); setError("This chat could not be opened."); }
    }
  };

  if (history) return <AgentHistoryView close={close} onDeleted={(roomId) => {
    if (roomId === room?.id) { setRoom(null); setMessages([]); setGeneration(null); setRoomResolved(false); setLoadRevision((value) => value + 1); }
  }} onConversation={(roomId, contextType) => {
    setHistory(false);
    if (contextType === "TAX_GUIDE") { openTax(); return; }
    if (roomId) void openConversation(roomId);
  }} />;
  const generating = submitting || Boolean(profile && !roomResolved && !roomLoadError) || Boolean(generation && ["PENDING", "PROCESSING"].includes(generation.status));
  const linkedContextHref = contextHref(room?.context.type || requestedContext.contextType, room?.context.referenceId || requestedContext.referenceId);
  const contextLabel = localizedContextTitle || room?.context.title || (locale === "ko" ? "한국 시장 도우미" : "Korea market assistant");
  return <aside className="agent-panel article-agent-panel global-agent-panel" role="dialog" aria-modal="true" aria-label="K-Agent chat">
    <button className="agent-close" type="button" onClick={close} ref={closeButtonRef}><img src="/assets/close.svg" alt="" /> {locale === "ko" ? "닫기" : "Close"}</button>
    <header><img className="agent-logo" src="/assets/agent-badge-381-4971.svg" alt="" /><div><h2>K-Agent</h2><p>{locale === "ko" ? "AI 금융 인텔리전스" : "AI Financial Intelligence"}</p></div><AgentOverflowMenu onHistory={profile ? () => setHistory(true) : login} onDelete={profile ? (room ? () => void deleteConversation() : undefined) : login} /></header>
    {linkedContextHref
      ? <Link className="context-chip context-chip-link" to={linkedContextHref} onClick={close}><img src="/assets/agent-context.svg" alt="" /><span>{contextLabel}</span><span aria-hidden="true">↗</span></Link>
      : <div className="context-chip"><img src="/assets/agent-context.svg" alt="" /><span>{contextLabel}</span></div>}
    {!profile ? <div className="api-state agent-login-state"><b>{locale === "ko" ? "보호된 대화를 시작하려면 로그인하세요" : "Sign in to start a protected chat"}</b><span>{locale === "ko" ? "대화방과 기록은 계정별로 안전하게 저장됩니다." : "Chat rooms and history are stored per account."}</span><Link className="login-button agent-login-button" onClick={close} to={`/login?returnTo=${encodeURIComponent(window.location.pathname)}`}>{locale === "ko" ? "로그인" : "Log in"}</Link></div> : null}
    <div className="chat global-agent-chat" aria-live="polite">
      {profile && messages.length === 0 ? <>
        <div className="ai-message"><p>{locale === "ko" ? "한국 주식, 뉴스, DART 공시, 외국인 보유 한도 또는 조세조약을 질문하세요." : "Ask about Korean equities, news, DART filings, foreign ownership limits, or treaty tax information."}</p></div>
        <div className="agent-suggestions" aria-label={locale === "ko" ? "추천 질문" : "Suggested questions"}>
          {(locale === "ko"
            ? ["오늘 시장의 핵심 변동 요인은?", "최근 중요 공시를 근거와 함께 설명해줘", "외국인 보유 한도가 임박한 종목은?"]
            : ["What is moving Korea's market today?", "Explain recent high-priority filings with sources", "Which stocks are near their foreign ownership cap?"]
          ).map((suggestion) => <button type="button" key={suggestion} onClick={() => void submitContent(suggestion)}>{suggestion}</button>)}
        </div>
      </> : null}
      {messages.map((message) => message.role === "USER" ? <p className="user-message user-message-enter" key={message.id}>{message.content}</p> : <div className="ai-message ai-message-enter" key={message.id}>
        <p className={message.id === streamedMessageId ? "typewriter-answer" : undefined}>{message.id === streamedMessageId ? streamingAnswer : answerWithCitationMarkers(message.content, message.citations)}{message.id === streamedMessageId && streamingAnswer.length < (animatedContent?.length || 0) ? <span className="typing-cursor" aria-hidden="true" /> : null}</p>
        {message.insufficientEvidence ? <small>{message.refusalReason || (locale === "ko" ? "근거가 부족합니다" : "Insufficient evidence")}</small> : null}
        <div className="agent-citation-buttons">{message.citations.map((citation) => {
          const href = citationHref(citation);
          const title = citationTitle(citation, locale);
          const label = filingPath(citation) ? (locale === "ko" ? "공시 보기" : "View filing") : (locale === "ko" ? "출처 보기" : "View source");
          return href?.startsWith("/") ? <Link className="agent-citation-button" key={citation.id} to={href} onClick={close}>{title ? <span>{title}</span> : null}<b>{label} ↗</b></Link>
            : href ? <a className="agent-citation-button" key={citation.id} href={href} target="_blank" rel="noopener noreferrer">{title ? <span>{title}</span> : null}<b>{label} ↗</b></a>
            : <small key={citation.id}>{title}</small>;
        })}</div>
        {message.disclaimer ? <small>{message.disclaimer}</small> : null}
      </div>)}
      {generating ? <div className="agent-thinking" role="status"><span className="sr-only">{locale === "ko" ? "K-Agent가 답변을 작성하는 중" : "K-Agent is typing"}</span><i /><i /><i />{generation ? <button type="button" onClick={() => void stopGeneration()}>{locale === "ko" ? "중지" : "Stop"}</button> : null}</div> : null}
      {generation?.status === "FAILED" ? <div className="api-state api-error"><span>{generation.errorCode || (locale === "ko" ? "AI 답변 생성에 실패했습니다." : "AI generation failed.")}</span>{generation.retryable ? <button type="button" onClick={() => void retryGeneration()}>{locale === "ko" ? "다시 시도" : "Retry"}</button> : null}</div> : null}
      {error ? <p className="auth-error" role="alert">{error}</p> : null}
      {roomLoadError ? <button type="button" onClick={() => selectedRoomRef.current ? void openConversation(selectedRoomRef.current) : setLoadRevision((value) => value + 1)}>{locale === "ko" ? "대화 다시 불러오기" : "Reload conversation"}</button> : null}
      {pollError ? <p className="auth-error" role="alert">{locale === "ko" ? "답변 상태 연결을 복구하고 있습니다. 질문을 다시 보내지 않아도 됩니다." : "Reconnecting to your answer. You do not need to send your question again."}</p> : null}
    </div>
    <form className="chat-input global-agent-input" onSubmit={(event) => void sendMessage(event)}><input type="text" value={draft} onChange={(event) => setDraft(event.target.value)} placeholder={locale === "ko" ? "한국 시장에 대해 질문하세요" : "Ask anything about this market"} aria-label={locale === "ko" ? "K-Agent에게 메시지" : "Message K-Agent"} disabled={!profile} /><button type="submit" aria-label={locale === "ko" ? "메시지 전송" : "Send message"} disabled={!draft.trim() || !profile || !roomResolved || Boolean(generating)}><img src="/assets/agent-send.svg" alt="" /></button></form>
  </aside>;
}
