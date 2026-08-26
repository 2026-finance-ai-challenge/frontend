import {
  type FormEvent,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import { AgentHistoryView, AgentOverflowMenu } from "./AgentHistory";

const WELCOME_MESSAGE =
  "Ask me about Korean equities, market news, DART filings, foreign ownership limits, or tax rules.";
const DEMO_ANSWER =
  "I’m reviewing the latest hard-coded market snapshot. I can summarize the relevant news, filings, and ownership signals for you.";

type ChatMessage = {
  id: number;
  role: "user" | "agent";
  text: string;
};

export function KAgentFloating() {
  const [open, setOpen] = useState(false);
  const launcherRef = useRef<HTMLButtonElement>(null);

  const close = useCallback(() => {
    setOpen(false);
    window.requestAnimationFrame(() => launcherRef.current?.focus());
  }, []);

  return (
    <>
      <button
        type="button"
        className="agent-launcher"
        aria-label="Open K-Agent"
        aria-haspopup="dialog"
        aria-expanded={open}
        onClick={() => setOpen(true)}
        ref={launcherRef}
        hidden={open}
      >
        <span className="agent-launcher-surface" aria-hidden="true" />
        <span className="agent-launcher-inner" aria-hidden="true" />
        <img src="/assets/k-agent-floating.svg" alt="" />
      </button>
      {open ? <KAgentPanel close={close} /> : null}
    </>
  );
}

function KAgentPanel({ close }: { close: () => void }) {
  const [history, setHistory] = useState(false);
  const [draft, setDraft] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([
    { id: 0, role: "agent", text: WELCOME_MESSAGE },
  ]);
  const [thinking, setThinking] = useState(false);
  const [streamingAnswer, setStreamingAnswer] = useState("");
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const timeoutRef = useRef<number | undefined>(undefined);
  const intervalRef = useRef<number | undefined>(undefined);

  useEffect(() => {
    closeButtonRef.current?.focus();

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") close();
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      if (timeoutRef.current !== undefined) {
        window.clearTimeout(timeoutRef.current);
      }
      if (intervalRef.current !== undefined) {
        window.clearInterval(intervalRef.current);
      }
    };
  }, [close]);

  const sendMessage = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const nextMessage = draft.trim();

    if (!nextMessage || thinking || streamingAnswer) return;

    setMessages((current) => [
      ...current,
      { id: Date.now(), role: "user", text: nextMessage },
    ]);
    setDraft("");
    setThinking(true);

    timeoutRef.current = window.setTimeout(() => {
      setThinking(false);
      let characterIndex = 0;

      intervalRef.current = window.setInterval(() => {
        characterIndex += 1;
        setStreamingAnswer(DEMO_ANSWER.slice(0, characterIndex));

        if (characterIndex >= DEMO_ANSWER.length) {
          window.clearInterval(intervalRef.current);
          intervalRef.current = undefined;
          setMessages((current) => [
            ...current,
            { id: Date.now() + 1, role: "agent", text: DEMO_ANSWER },
          ]);
          setStreamingAnswer("");
        }
      }, 18);
    }, 700);
  };

  if (history) {
    return (
      <AgentHistoryView
        close={close}
        onConversation={() => setHistory(false)}
      />
    );
  }

  return (
    <aside
      className="agent-panel article-agent-panel global-agent-panel"
      role="dialog"
      aria-modal="true"
      aria-label="K-Agent chat"
    >
      <button
        className="agent-close"
        type="button"
        onClick={close}
        ref={closeButtonRef}
      >
        <img src="/assets/close.svg" alt="" /> Close
      </button>
      <header>
        <img className="agent-logo" src="/assets/agent-badge.svg" alt="" />
        <div>
          <h2>K-Agent</h2>
          <p>AI Financial Intelligence</p>
        </div>
        <AgentOverflowMenu onHistory={() => setHistory(true)} />
      </header>
      <div className="context-chip">
        <img src="/assets/agent-context.svg" alt="" /> Korea market assistant
      </div>
      <div className="chat global-agent-chat" aria-live="polite">
        {messages.map((message) =>
          message.role === "user" ? (
            <p className="user-message user-message-enter" key={message.id}>
              {message.text}
            </p>
          ) : (
            <div className="ai-message ai-message-enter" key={message.id}>
              <p>{message.text}</p>
            </div>
          ),
        )}
        {thinking ? (
          <div className="agent-thinking" role="status">
            <span className="agent-thinking-label">K-Agent is thinking</span>
            <i />
            <i />
            <i />
          </div>
        ) : null}
        {streamingAnswer ? (
          <div className="ai-message ai-message-enter">
            <p className="typewriter-answer" aria-label={DEMO_ANSWER}>
              <span aria-hidden="true">{streamingAnswer}</span>
              <span className="typing-cursor" aria-hidden="true" />
            </p>
          </div>
        ) : null}
      </div>
      <form className="chat-input global-agent-input" onSubmit={sendMessage}>
        <input
          type="text"
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          placeholder="Ask anything about this market"
          aria-label="Message K-Agent"
        />
        <button
          type="submit"
          aria-label="Send message"
          disabled={!draft.trim() || thinking || Boolean(streamingAnswer)}
        >
          <img src="/assets/agent-send.svg" alt="" />
        </button>
      </form>
    </aside>
  );
}
