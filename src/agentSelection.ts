export type AgentSelection = { sectionId: string; text: string };

export function selectionSectionId(start: string | null, end: string | null): string | null {
  return start === end && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(start || "") ? start : null;
}

export function chatSubmissionBody(clientMessageId: string, content: string, selection?: AgentSelection) {
  return { clientMessageId, content, selectedSectionId: selection?.sectionId ?? null, selectedText: selection?.text ?? null };
}
