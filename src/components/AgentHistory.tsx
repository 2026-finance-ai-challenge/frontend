import { useState } from "react";
import { api } from "../api";
import { useRemote } from "../hooks/useRemote";
import { RemoteState, formatDate } from "./RemoteState";

type Room = { id: string; name: string; context: { type: string; title: string }; updatedAt: string; lastMessageAt: string | null };

type AgentOverflowMenuProps = {
  onHistory: () => void;
  onDelete?: () => void;
};

export function AgentOverflowMenu({ onHistory, onDelete }: AgentOverflowMenuProps) {
  const [open, setOpen] = useState(false);

  return (
    <div className="agent-overflow-wrap">
      <button
        type="button"
        className="agent-overflow-button"
        aria-label="Open conversation menu"
        aria-expanded={open}
        aria-haspopup="menu"
        onClick={() => setOpen((current) => !current)}
      >
        <img src="/assets/overflow.svg" alt="" />
      </button>
      {open ? (
        <div className="agent-menu" role="menu">
          <button
            type="button"
            role="menuitem"
            onClick={() => {
              setOpen(false);
              onHistory();
            }}
          >
            <img src="/assets/history.svg" alt="" /> History
          </button>
          <button
            type="button"
            role="menuitem"
            disabled={!onDelete}
            onClick={() => {
              setOpen(false);
              onDelete?.();
            }}
          >
            <img src="/assets/delete.svg" alt="" /> Delete
          </button>
        </div>
      ) : null}
    </div>
  );
}

type AgentHistoryViewProps = {
  close: () => void;
  onConversation: (roomId?: string) => void;
};

export function AgentHistoryView({
  close,
  onConversation,
}: AgentHistoryViewProps) {
  const rooms = useRemote((signal) => api<Room[]>("/api/v1/me/chats", { signal }), []);
  return (
    <aside
      className="agent-panel agent-history"
      role="dialog"
      aria-modal="true"
      aria-label="Chat history"
    >
      <button className="agent-close" type="button" onClick={close}>
        <img src="/assets/close.svg" alt="" /> Close
      </button>
      <h2>Previous conversations</h2>
      <RemoteState {...rooms} empty={(value) => !value.length}>
      {(value) => <div className="agent-history-list">
        {value.map((conversation, index) => (
          <button
            type="button"
            className={index === 1 ? "selected" : ""}
            onClick={() => onConversation(conversation.id)}
            key={conversation.id}
          >
            <span>
              <b>{conversation.name}</b>
              <small>{conversation.context.type} · {formatDate(conversation.lastMessageAt || conversation.updatedAt)}</small>
            </span>
            <img src="/assets/overflow.svg" alt="" />
          </button>
        ))}
      </div>}
      </RemoteState>
    </aside>
  );
}
