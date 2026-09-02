export type AgentGeneration = { id: string; status: string; errorCode: string | null; retryable: boolean };

type ReadChat = <T>(path: string, options: { signal: AbortSignal }) => Promise<T>;

export async function loadChatState<Message>(read: ReadChat, roomId: string, signal: AbortSignal) {
  const path = `/api/v1/me/chats/${roomId}`;
  const { generation } = await read<{ generation: AgentGeneration | null }>(`${path}/generations/latest`, { signal });
  signal.throwIfAborted();
  // 완료 상태를 읽은 뒤 메시지를 읽어 완료된 답변이 누락되는 경합을 막는다.
  const messages = await read<Message[]>(`${path}/messages`, { signal });
  signal.throwIfAborted();
  return { generation, messages };
}
