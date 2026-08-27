export type KAgentContext = {
  contextType: "GENERAL" | "STOCK" | "NEWS" | "FILING" | "TAX_GUIDE";
  referenceId?: string | null;
  prompt?: string;
};

export const OPEN_AGENT_EVENT = "kmarket:open-agent";

export function openKAgent(context: KAgentContext = { contextType: "GENERAL" }) {
  window.dispatchEvent(new CustomEvent<KAgentContext>(OPEN_AGENT_EVENT, { detail: context }));
}
