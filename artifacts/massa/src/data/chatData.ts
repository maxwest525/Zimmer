export type ChatMessage = {
  id: string
  role: 'user' | 'agent'
  content: string
  time: string
}

export const MOCK_CHAT_MESSAGES: Record<string, ChatMessage[]> = {}

export function getAgentResponsePool(_buildId: string): string[] {
  return []
}
