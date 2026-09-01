import { useCallback, useEffect, useRef, useState, type MouseEvent as ReactMouseEvent } from "react";

type TextSelection = {
  text: string;
  left: number;
  top: number;
};

export function useSelectionAssistant<T extends HTMLElement>() {
  const containerRef = useRef<T>(null);
  const [selection, setSelection] = useState<TextSelection | null>(null);

  const captureSelection = useCallback((event: ReactMouseEvent<T>) => {
    if ((event.target as Element).closest(".selection-assistant")) return;
    window.requestAnimationFrame(() => {
      const container = containerRef.current;
      const browserSelection = window.getSelection();
      if (!container || !browserSelection || browserSelection.rangeCount === 0 || browserSelection.isCollapsed) {
        setSelection(null);
        return;
      }

      const range = browserSelection.getRangeAt(0);
      if (!container.contains(range.commonAncestorContainer)) {
        setSelection(null);
        return;
      }
      const text = browserSelection.toString().replace(/\s+/g, " ").trim();
      if (text.length < 2 || text.length > 500) {
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
        left,
        top: anchor.bottom - containerRect.top + 14,
      });
    });
  }, []);

  useEffect(() => {
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setSelection(null);
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
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
  onAsk: (selectedText: string) => void;
}) {
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
      <button type="button" onClick={() => onAsk(selection.text)}>{actionLabel}</button>
    </div>
  );
}
