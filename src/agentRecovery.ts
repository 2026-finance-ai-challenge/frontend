export type AgentGeneration = { id: string; status: string; errorCode: string | null; retryable: boolean };

type ReadChat = <T>(path: string, options: { signal: AbortSignal }) => Promise<T>;

export async function loadChatState<Message>(read: ReadChat, roomId: string, signal: AbortSignal) {
  const path = `/api/v1/me/chats/${roomId}`;
  const { generation } = await read<{ generation: AgentGeneration | null }>(`${path}/generations/latest`, { signal });
  signal.throwIfAborted();
  // 완료 상태를 읽은 뒤 메시지를 읽어 완료된 답변이 누락되는 경합을 막는다.
  const messages = await loadChatMessages<Message>(read, roomId, signal);
  signal.throwIfAborted();
  return { generation, messages };
}

export async function loadChatMessages<Message>(read: ReadChat, roomId: string, signal: AbortSignal) {
  const items: Message[] = [];
  let after = 0;
  while (true) {
    const suffix = after ? `?afterSequence=${after}` : '';
    const page = await read<Array<Message & { sequence?: number }>>(`/api/v1/me/chats/${roomId}/messages${suffix}`, { signal });
    signal.throwIfAborted();
    items.push(...page);
    if (page.length < 100) return items;
    const next = page.at(-1)?.sequence;
    if (next == null || next <= after) throw new Error('Chat message pagination did not advance.');
    after = next;
  }
}
