import { useCallback, useEffect, useRef, useState, type MouseEvent as ReactMouseEvent } from "react";
import { selectionSectionId } from "../agentSelection";
import { OPEN_AGENT_EVENT } from "../agentEvents";

type TextSelection = {
  text: string;
  sectionId: string | null;
  left: number;
  top: number;
};

export function useSelectionAssistant<T extends HTMLElement>(requireSection = false, resetKey = "") {
  const containerRef = useRef<T>(null);
  const [selection, setSelection] = useState<TextSelection | null>(null);
  useEffect(() => { setSelection(null); }, [resetKey]);

  const captureSelection = useCallback((event?: ReactMouseEvent<T>) => {
    if (event && (event.target as Element).closest(".selection-assistant")) return;
    window.requestAnimationFrame(() => {
      const container = containerRef.current;
      const browserSelection = window.getSelection();
      if (!container || !browserSelection || browserSelection.rangeCount === 0 || browserSelection.isCollapsed) {
        setSelection(null);
        return;
      }

      const range = browserSelection.getRangeAt(0);
      const startElement = range.startContainer.nodeType === Node.ELEMENT_NODE ? range.startContainer as Element : range.startContainer.parentElement;
      const endElement = range.endContainer.nodeType === Node.ELEMENT_NODE ? range.endContainer as Element : range.endContainer.parentElement;
      // 오류·로딩 문구를 선택하거나 가로지른 범위는 AI 질문으로 전달하지 않는다.
      const crossesStatus = Array.from(container.querySelectorAll(".api-state, .translation-status-error, .loading-skeleton, .translation-placeholder, .selection-assistant"))
        .some((element) => range.intersectsNode(element));
      if (!container.contains(range.commonAncestorContainer)
        || !startElement?.closest(".selection-content") || !endElement?.closest(".selection-content") || crossesStatus) {
        setSelection(null);
        return;
      }
      const text = browserSelection.toString().replace(/\s+/g, " ").trim();
      const sectionId = selectionSectionId(startElement?.closest("[data-section-id]")?.getAttribute("data-section-id") ?? null,
        endElement?.closest("[data-section-id]")?.getAttribute("data-section-id") ?? null);
      if (text.length < 2 || text.length > 500 || requireSection && !sectionId) {
        setSelection(null);
        return;
      }

      const rects = Array.from(range.getClientRects()).filter((rect) => rect.width > 0 && rect.height > 0);
      const anchor = rects.at(-1) ?? range.getBoundingClientRect();
      const containerRect = container.getBoundingClientRect();
      const desiredLeft = anchor.left - containerRect.left + anchor.width / 2;
      const safeHalfWidth = Math.min(250, Math.max(120, containerRect.width / 2 - 8));
      const left = Math.min(
        Math.max(desiredLeft, safeHalfWidth),
        Math.max(safeHalfWidth, containerRect.width - safeHalfWidth),
      );
      setSelection({
        text,
        sectionId,
        left,
        top: anchor.bottom - containerRect.top + 14,
      });
    });
  }, [requireSection]);

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    // 모바일 길게 누르기와 선택 핸들은 mouseup 없이 selectionchange만 발생한다.
    const onChange = () => {
      clearTimeout(timer);
      timer = setTimeout(() => captureSelection(), 160);
    };
    document.addEventListener("selectionchange", onChange);
    window.addEventListener("resize", onChange);
    return () => {
      clearTimeout(timer);
      document.removeEventListener("selectionchange", onChange);
      window.removeEventListener("resize", onChange);
    };
  }, [captureSelection]);

  useEffect(() => {
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setSelection(null);
    };
    const closeOnAsk = () => setSelection(null);
    window.addEventListener("keydown", closeOnEscape);
    window.addEventListener(OPEN_AGENT_EVENT, closeOnAsk);
    return () => {
      window.removeEventListener("keydown", closeOnEscape);
      window.removeEventListener(OPEN_AGENT_EVENT, closeOnAsk);
    };
  }, []);

  return { containerRef, selection, captureSelection, clearSelection: () => setSelection(null) };
}

export function SelectionAssistant({
  selection,
  prompt,
  actionLabel,
  onAsk,
}: {
  selection: TextSelection | null;
  prompt: string;
  actionLabel: string;
  onAsk: (selectedText: string, sectionId: string | null) => void;
}) {
  const pointerSubmitted = useRef(false);
  if (!selection) return null;
  return (
    <div
      className="selection-popup selection-assistant"
      style={{ left: selection.left, top: selection.top }}
      role="dialog"
      aria-label={prompt}
    >
      <img src="/assets/selection-arrow-figma.svg" alt="" />
      <span>{prompt}</span>
      <button
        type="button"
        onPointerDown={(event) => { pointerSubmitted.current = false; event.preventDefault(); }}
        onPointerUp={(event) => {
          // Safari는 선택 보존을 위해 pointerdown을 막으면 터치 click을 생략한다.
          if (event.pointerType === "touch" || event.pointerType === "pen") {
            event.preventDefault();
            pointerSubmitted.current = true;
            onAsk(selection.text, selection.sectionId);
          }
        }}
        onClick={(event) => {
          if (event.detail > 0 && pointerSubmitted.current) return;
          onAsk(selection.text, selection.sectionId);
        }}
      >{actionLabel}</button>
    </div>
  );
}
