export type KAgentContext = {
  contextType: "GENERAL" | "STOCK" | "NEWS" | "FILING" | "TAX_GUIDE";
  referenceId?: string | null;
  prompt?: string;
  requestId?: string;
  selection?: { sectionId: string; text: string };
};

export const OPEN_AGENT_EVENT = "kmarket:open-agent";

export function openKAgent(context: KAgentContext = { contextType: "GENERAL" }) {
  const detail = context.prompt?.trim() ? { ...context, requestId: context.requestId || crypto.randomUUID() } : context;
  window.dispatchEvent(new CustomEvent<KAgentContext>(OPEN_AGENT_EVENT, { detail }));
}

export function openTaxEligibility() {
  openKAgent({ contextType: "TAX_GUIDE" });
}
