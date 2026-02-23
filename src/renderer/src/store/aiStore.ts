import { create } from 'zustand'

export interface AiMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  /** Tool calls that were executed to produce this assistant message */
  toolCalls?: Array<{ name: string; args: Record<string, unknown> }>
}

export interface ActiveToolCall {
  name: string
  args: Record<string, unknown>
}

interface AiState {
  isOpen: boolean
  isLoading: boolean
  messages: AiMessage[]
  /** Tool calls currently executing in the agentic loop */
  activeToolCalls: ActiveToolCall[]
  /** In-progress streamed text. null = not streaming, '' or text = streaming */
  streamingContent: string | null

  open: () => void
  close: () => void
  addMessage: (msg: AiMessage) => void
  clearMessages: () => void
  setLoading: (v: boolean) => void
  pushToolCall: (tc: ActiveToolCall) => void
  clearActiveToolCalls: () => void
  beginStreaming: () => void
  appendStreamToken: (token: string) => void
  clearStreaming: () => void
}

export const useAiStore = create<AiState>((set) => ({
  isOpen: false,
  isLoading: false,
  messages: [],
  activeToolCalls: [],
  streamingContent: null,

  open: () => set({ isOpen: true }),
  close: () => set({ isOpen: false }),
  addMessage: (msg) => set((s) => ({ messages: [...s.messages, msg] })),
  clearMessages: () => set({ messages: [] }),
  setLoading: (v) => set({ isLoading: v }),
  pushToolCall: (tc) => set((s) => ({ activeToolCalls: [...s.activeToolCalls, tc] })),
  clearActiveToolCalls: () => set({ activeToolCalls: [] }),
  beginStreaming: () => set({ streamingContent: '' }),
  appendStreamToken: (token) =>
    set((s) => ({ streamingContent: (s.streamingContent ?? '') + token })),
  clearStreaming: () => set({ streamingContent: null })
}))
