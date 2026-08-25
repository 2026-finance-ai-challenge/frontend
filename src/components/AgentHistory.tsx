import { useState } from "react";

const conversations = [
  "Samsung Electronics Prospectus",
  "Quarterly Earnings Report",
  "SK Hynix Annual Report",
  "Market Volatility Analysis",
];

type AgentOverflowMenuProps = {
  onHistory: () => void;
};

export function AgentOverflowMenu({ onHistory }: AgentOverflowMenuProps) {
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
            onClick={() => setOpen(false)}
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
  onConversation: () => void;
};

export function AgentHistoryView({
  close,
  onConversation,
}: AgentHistoryViewProps) {
  return (
    <aside className="agent-panel agent-history" aria-label="Chat history">
      <button className="agent-close" type="button" onClick={close}>
        <img src="/assets/close.svg" alt="" /> Close
      </button>
      <h2>Previous Conversations</h2>
      <div className="agent-history-list">
        {conversations.map((conversation, index) => (
          <button
            type="button"
            className={index === 1 ? "selected" : ""}
            onClick={onConversation}
            key={conversation}
          >
            <span>
              <b>{conversation}</b>
              <small>Aug 14, 14:20 KST</small>
            </span>
            <img src="/assets/overflow.svg" alt="" />
          </button>
        ))}
      </div>
    </aside>
  );
}
