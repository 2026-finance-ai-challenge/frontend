import { useEffect, useRef, useState } from "react";
import { api } from "../api";
import { useRemote } from "../hooks/useRemote";
import { RemoteState, formatDate } from "./RemoteState";
import { useLocale } from "../state/LocaleContext";

type Room = { id: string; name: string; version: number; context: { type: string; title: string }; updatedAt: string; lastMessageAt: string | null };

type AgentOverflowMenuProps = {
  onHistory: () => void;
  onDelete?: () => void;
};

export function AgentOverflowMenu({ onHistory, onDelete }: AgentOverflowMenuProps) {
  const { locale } = useLocale();
  const [open, setOpen] = useState(false);

  return (
    <div className="agent-overflow-wrap">
      <button
        type="button"
        className="agent-overflow-button"
        aria-label={locale === "ko" ? "대화 메뉴 열기" : "Open conversation menu"}
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
            <img src="/assets/history.svg" alt="" /> {locale === "ko" ? "대화 기록" : "History"}
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
            <img src="/assets/delete.svg" alt="" /> {locale === "ko" ? "삭제" : "Delete"}
          </button>
        </div>
      ) : null}
    </div>
  );
}

type AgentHistoryViewProps = {
  close: () => void;
  onConversation: (roomId?: string) => void;
  onDeleted: (roomId: string) => void;
};

export function AgentHistoryView({
  close,
  onConversation,
  onDeleted,
}: AgentHistoryViewProps) {
  const { locale } = useLocale();
  const [query, setQuery] = useState("");
  const [search, setSearch] = useState("");
  const [menu, setMenu] = useState<string | null>(null);
  const [editing, setEditing] = useState<Room | null>(null);
  const [deleting, setDeleting] = useState<Room | null>(null);
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const menuRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const timer = window.setTimeout(() => setSearch(query.trim()), 250);
    return () => window.clearTimeout(timer);
  }, [query]);
  useEffect(() => {
    if (!menu) return;
    const outside = (event: PointerEvent) => {
      if (event.target instanceof Node && !menuRef.current?.contains(event.target)) setMenu(null);
    };
    document.addEventListener("pointerdown", outside);
    return () => document.removeEventListener("pointerdown", outside);
  }, [menu]);
  const rooms = useRemote((signal) => api<Room[]>(`/api/v1/me/chats?limit=100&query=${encodeURIComponent(search)}`, { signal }), [search]);
  const create = async () => {
    if (busy) return;
    setBusy(true); setError("");
    try {
      const room = await api<Room>("/api/v1/me/chats", { method: "POST", body: JSON.stringify({ contextType: "GENERAL" }) });
      onConversation(room.id);
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Unable to create a conversation."); }
    finally { setBusy(false); }
  };
  const save = async () => {
    if (!editing || !name.trim() || busy) return;
    setBusy(true); setError("");
    try {
      await api(`/api/v1/me/chats/${editing.id}/name`, { method: "PUT", body: JSON.stringify({ name: name.trim(), expectedVersion: editing.version }) });
      setEditing(null); rooms.retry();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Unable to rename this conversation.");
      // 충돌 시 입력은 보존하고 최신 버전을 불러와 사용자가 다시 저장할 수 있게 한다.
      try { setEditing(await api<Room>(`/api/v1/me/chats/${editing.id}`)); } catch { rooms.retry(); }
    } finally { setBusy(false); }
  };
  const remove = async () => {
    if (!deleting || busy) return;
    setBusy(true); setError("");
    try {
      await api(`/api/v1/me/chats/${deleting.id}`, { method: "DELETE" });
      onDeleted(deleting.id); setDeleting(null); rooms.retry();
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Unable to delete this conversation."); }
    finally { setBusy(false); }
  };
  return (
    <aside
      className="agent-panel agent-history"
      role="dialog"
      aria-modal="true"
      aria-label={locale === "ko" ? "대화 기록" : "Chat history"}
      onKeyDown={(event) => {
        if (event.key === "Escape" && (menu || editing || deleting)) {
          event.stopPropagation(); setMenu(null);
          if (!busy) { setEditing(null); setDeleting(null); }
        }
      }}
    >
      <button className="agent-close" type="button" onClick={close}>
        <img src="/assets/close.svg" alt="" /> {locale === "ko" ? "닫기" : "Close"}
      </button>
      <h2>{locale === "ko" ? "이전 대화" : "Previous conversations"}</h2>
      <button type="button" className="agent-history-back" onClick={() => onConversation()}>{locale === "ko" ? "대화로 돌아가기" : "Back to conversation"}</button>
      <button type="button" className="agent-history-new" disabled={busy} onClick={() => void create()}>{locale === "ko" ? "새 대화" : "New conversation"}</button>
      <input className="agent-history-search" aria-label={locale === "ko" ? "대화 검색" : "Search conversations"} placeholder={locale === "ko" ? "대화 검색" : "Search conversations"} value={query} maxLength={80} onChange={(event) => setQuery(event.target.value)} />
      {error ? <p className="auth-error" role="alert">{error}</p> : null}
      {editing ? <form className="agent-room-editor" onSubmit={(event) => { event.preventDefault(); void save(); }}>
        <label>{locale === "ko" ? "대화 이름" : "Conversation name"}<input autoFocus value={name} maxLength={80} onChange={(event) => setName(event.target.value)} disabled={busy} /></label>
        <div><button type="submit" className="auth-primary" disabled={busy || !name.trim()}>{locale === "ko" ? "저장" : "Save"}</button><button type="button" disabled={busy} onClick={() => setEditing(null)}>{locale === "ko" ? "취소" : "Cancel"}</button></div>
      </form> : null}
      {deleting ? <div className="agent-room-editor" role="alertdialog" aria-label={locale === "ko" ? "대화 삭제 확인" : "Confirm conversation deletion"}>
        <p>{locale === "ko" ? `‘${deleting.name}’ 대화와 기록을 삭제할까요?` : `Delete “${deleting.name}” and its messages?`}</p>
        <div><button className="auth-primary" type="button" disabled={busy} onClick={() => void remove()}>{locale === "ko" ? "삭제 확인" : "Confirm delete"}</button><button type="button" disabled={busy} onClick={() => setDeleting(null)}>{locale === "ko" ? "취소" : "Cancel"}</button></div>
      </div> : null}
      <RemoteState {...rooms} empty={(value) => !value.length}>
      {(value) => <div className="agent-history-list">
        {value.map((conversation) => (
          <article className="agent-history-row" key={conversation.id}>
          <button type="button" className="agent-history-open" onClick={() => onConversation(conversation.id)}>
            <span>
              <b>{conversation.name}</b>
              <small>{conversation.context.type} · {formatDate(conversation.lastMessageAt || conversation.updatedAt)}</small>
            </span>
          </button>
          <div className="agent-overflow-wrap" ref={menu === conversation.id ? menuRef : undefined}>
            <button type="button" className="agent-overflow-button" aria-label={`${locale === "ko" ? "대화 관리" : "Manage conversation"}: ${conversation.name}`} aria-haspopup="menu" aria-expanded={menu === conversation.id} onClick={() => setMenu(menu === conversation.id ? null : conversation.id)}><img src="/assets/overflow.svg" alt="" /></button>
            {menu === conversation.id ? <div className="agent-menu" role="menu">
              <button type="button" role="menuitem" onClick={() => { setEditing(conversation); setName(conversation.name); setDeleting(null); setMenu(null); setError(""); }}>{locale === "ko" ? "이름 변경" : "Rename"}</button>
              <button type="button" role="menuitem" onClick={() => { setDeleting(conversation); setEditing(null); setMenu(null); setError(""); }}><img src="/assets/delete.svg" alt="" />{locale === "ko" ? "삭제" : "Delete"}</button>
            </div> : null}
          </div>
          </article>
        ))}
      </div>}
      </RemoteState>
    </aside>
  );
}
