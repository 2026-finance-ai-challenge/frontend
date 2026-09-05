import { useCallback, useEffect, useRef, useState, type MouseEvent as ReactMouseEvent } from "react";
import { selectionSectionId } from "../agentSelection";
import { OPEN_AGENT_EVENT } from "../agentEvents";

type TextSelection = {
  text: string;
  sectionId: string | null;
  left: number;
  top: number;
};

type SelectionSource = Pick<TextSelection, "text" | "sectionId">;
const fallbackHighlightSelector = "[data-kart-selection-highlight]";

function removePersistentHighlight() {
  document.querySelectorAll<HTMLElement>(fallbackHighlightSelector).forEach((highlight) => {
    highlight.replaceWith(...Array.from(highlight.childNodes));
  });
}

function persistHighlight(range: Range) {
  if (document.querySelector(fallbackHighlightSelector)) return;

  const wrapText = (node: Text, start: number, end: number) => {
    if (!node.isConnected || start >= end) return;
    if (end < node.data.length) node.splitText(end);
    const selectedNode = start > 0 ? node.splitText(start) : node;
    const highlight = document.createElement("mark");
    highlight.dataset.kartSelectionHighlight = "true";
    selectedNode.replaceWith(highlight);
    highlight.append(selectedNode);
  };
  if (range.startContainer === range.endContainer && range.startContainer.nodeType === 3) {
    wrapText(range.startContainer as Text, range.startOffset, range.endOffset);
    return;
  }

  // Custom Highlight API가 없는 브라우저에서도 같은 선택 색을 유지한다.
  const root = range.commonAncestorContainer.nodeType === 3
    ? range.commonAncestorContainer.parentElement
    : range.commonAncestorContainer as Element;
  if (!root) return;
  const walker = document.createTreeWalker(root, 4);
  const targets: Array<{ node: Text; start: number; end: number }> = [];
  for (let node = walker.nextNode() as Text | null; node; node = walker.nextNode() as Text | null) {
    if (!range.intersectsNode(node) || node.parentElement?.closest(".selection-assistant")) continue;
    const start = node === range.startContainer ? range.startOffset : 0;
    const end = node === range.endContainer ? range.endOffset : node.data.length;
    if (start < end) targets.push({ node, start, end });
  }
  targets.reverse().forEach(({ node, start, end }) => {
    wrapText(node, start, end);
  });
}

function restoredRange(container: HTMLElement, source: SelectionSource) {
  const sectionRoot = source.sectionId
    ? Array.from(container.querySelectorAll<HTMLElement>("[data-section-id]"))
        .find((element) => element.dataset.sectionId === source.sectionId) ?? container
    : container;
  const walker = document.createTreeWalker(sectionRoot, 4, {
    acceptNode(node) {
      const parent = node.parentElement;
      return parent?.closest(".api-state, .translation-status-error, .loading-skeleton, .translation-placeholder, .selection-assistant")
        ? 2
        : 1;
    },
  });
  const positions: Array<{ node: Text; start: number; end: number }> = [];
  let normalized = "";
  let previousWhitespace = true;
  for (let node = walker.nextNode() as Text | null; node; node = walker.nextNode() as Text | null) {
    for (let offset = 0; offset < node.data.length; offset += 1) {
      const character = node.data[offset];
      if (/\s/.test(character)) {
        if (!previousWhitespace) {
          normalized += " ";
          positions.push({ node, start: offset, end: offset + 1 });
        }
        previousWhitespace = true;
      } else {
        normalized += character;
        positions.push({ node, start: offset, end: offset + 1 });
        previousWhitespace = false;
      }
    }
  }
  const target = source.text.replace(/\s+/g, " ").trim();
  const startIndex = normalized.indexOf(target);
  if (startIndex < 0 || !positions[startIndex] || !positions[startIndex + target.length - 1]) return null;
  const range = document.createRange();
  range.setStart(positions[startIndex].node, positions[startIndex].start);
  const end = positions[startIndex + target.length - 1];
  range.setEnd(end.node, end.end);
  return range;
}

export function useSelectionAssistant<T extends HTMLElement>(requireSection = false, resetKey = "") {
  const containerRef = useRef<T>(null);
  const sourceRef = useRef<SelectionSource | null>(null);
  const rangeRef = useRef<Range | null>(null);
  const [selection, setSelection] = useState<TextSelection | null>(null);
  const clearSelection = useCallback(() => {
    removePersistentHighlight();
    sourceRef.current = null;
    rangeRef.current = null;
    setSelection(null);
  }, []);
  useEffect(() => clearSelection(), [clearSelection, resetKey]);

  const restoreSelection = useCallback(() => {
    const container = containerRef.current;
    const source = sourceRef.current;
    if (!container || !source) return;
    const current = window.getSelection();
    if (current && !current.isCollapsed && current.rangeCount > 0 && container.contains(current.getRangeAt(0).commonAncestorContainer)) {
      persistHighlight(current.getRangeAt(0));
      return;
    }
    const savedRange = rangeRef.current;
    const range = savedRange && container.contains(savedRange.commonAncestorContainer)
      ? savedRange.cloneRange()
      : restoredRange(container, source);
    if (!current || !range) return;
    current.removeAllRanges();
    current.addRange(range);
    rangeRef.current = range.cloneRange();
    persistHighlight(range);
  }, []);

  const captureSelection = useCallback((event?: ReactMouseEvent<T>) => {
    if (event && (event.target as Element).closest(".selection-assistant")) return;
    window.requestAnimationFrame(() => {
      const container = containerRef.current;
      const browserSelection = window.getSelection();
      if (!container || !browserSelection || browserSelection.rangeCount === 0 || browserSelection.isCollapsed) {
        // 번역 문서가 다시 렌더링되며 네이티브 선택만 풀려도 저장한 질문 범위는 유지한다.
        if (event) clearSelection();
        return;
      }

      const range = browserSelection.getRangeAt(0);
      const startElement = range.startContainer.nodeType === 1 ? range.startContainer as Element : range.startContainer.parentElement;
      const endElement = range.endContainer.nodeType === 1 ? range.endContainer as Element : range.endContainer.parentElement;
      // 오류·로딩 문구를 선택하거나 가로지른 범위는 AI 질문으로 전달하지 않는다.
      const crossesStatus = Array.from(container.querySelectorAll(".api-state, .translation-status-error, .loading-skeleton, .translation-placeholder, .selection-assistant"))
        .some((element) => range.intersectsNode(element));
      if (!container.contains(range.commonAncestorContainer)
        || !startElement?.closest(".selection-content") || !endElement?.closest(".selection-content") || crossesStatus) {
        if (event) clearSelection();
        return;
      }
      const text = browserSelection.toString().replace(/\s+/g, " ").trim();
      const sectionId = selectionSectionId(startElement?.closest("[data-section-id]")?.getAttribute("data-section-id") ?? null,
        endElement?.closest("[data-section-id]")?.getAttribute("data-section-id") ?? null);
      if (text.length < 2 || text.length > 500 || requireSection && !sectionId) {
        if (event) clearSelection();
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
      const source = { text, sectionId };
      const persistentRange = restoredRange(container, source) ?? range;
      sourceRef.current = source;
      rangeRef.current = persistentRange.cloneRange();
    });
  }, [clearSelection, requireSection]);

  useEffect(() => {
    if (!selection) return;
    const frame = window.requestAnimationFrame(() => {
      const container = containerRef.current;
      const source = sourceRef.current;
      if (!container || !source) return;
      const range = restoredRange(container, source);
      if (!range) return;
      rangeRef.current = range.cloneRange();
      persistHighlight(range);
    });
    return () => window.cancelAnimationFrame(frame);
  }, [selection]);

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    // 모바일 길게 누르기와 선택 핸들은 mouseup 없이 selectionchange만 발생한다.
    const onChange = () => {
      const browserSelection = window.getSelection();
      if (!browserSelection || browserSelection.rangeCount === 0 || browserSelection.isCollapsed) {
        window.requestAnimationFrame(restoreSelection);
        return;
      }
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
  }, [captureSelection, restoreSelection]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    let frame = 0;
    const observer = new MutationObserver(() => {
      window.cancelAnimationFrame(frame);
      frame = window.requestAnimationFrame(restoreSelection);
    });
    observer.observe(container, { childList: true, characterData: true, subtree: true });
    return () => {
      window.cancelAnimationFrame(frame);
      observer.disconnect();
    };
  }, [restoreSelection]);

  useEffect(() => {
    const closeOnOutsidePointer = (event: PointerEvent) => {
      const target = event.target as Element | null;
      if (!target?.closest(".selection-assistant")) {
        clearSelection();
      }
    };
    document.addEventListener("pointerdown", closeOnOutsidePointer);
    return () => document.removeEventListener("pointerdown", closeOnOutsidePointer);
  }, [clearSelection]);

  useEffect(() => () => removePersistentHighlight(), []);

  useEffect(() => {
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") clearSelection();
    };
    const closeOnAsk = () => clearSelection();
    window.addEventListener("keydown", closeOnEscape);
    window.addEventListener(OPEN_AGENT_EVENT, closeOnAsk);
    return () => {
      window.removeEventListener("keydown", closeOnEscape);
      window.removeEventListener(OPEN_AGENT_EVENT, closeOnAsk);
    };
  }, [clearSelection]);

  return { containerRef, selection, captureSelection, clearSelection };
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
