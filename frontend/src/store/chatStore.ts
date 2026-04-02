import { create } from 'zustand'
import { get as apiGet, post as apiPost } from '../lib/api'
import type { ChatMessage } from '../lib/uiTypes'

export type ChatOverviewUI = {
  otherUserId: string
  lastMessage: string
  timestamp: string
}

type ChatState = {
  chats: ChatOverviewUI[]
  conversation: ChatMessage[]
  activeOtherUserId: string | null
  loadingChats: boolean
  loadingConversation: boolean
  fetchChats: () => Promise<void>
  fetchConversation: (otherUserId: string) => Promise<void>
  sendMessage: (receiverId: string, text: string) => Promise<void>
}

const mapMessageRead = (m: any): ChatMessage => {
  return {
    id: String(m?.id ?? ''),
    senderId: String(m?.sender_id ?? ''),
    text: String(m?.message ?? ''),
    createdAt: String(m?.timestamp ?? ''),
  }
}

export const useChatStore = create<ChatState>()((set, storeGet) => ({
  chats: [],
  conversation: [],
  activeOtherUserId: null,
  loadingChats: false,
  loadingConversation: false,
  fetchChats: async () => {
    set({ loadingChats: true })
    try {
      const res = await apiGet<ChatOverviewUI[]>('/messages/chats')
      // Backend returns: { other_user_id, last_message, timestamp }
      const mapped = (res as any[]).map((c) => ({
        otherUserId: String((c as any)?.other_user_id ?? ''),
        lastMessage: String((c as any)?.last_message ?? ''),
        timestamp: String((c as any)?.timestamp ?? ''),
      }))
      set({ chats: mapped })
    } finally {
      set({ loadingChats: false })
    }
  },
  fetchConversation: async (otherUserId) => {
    set({ loadingConversation: true })
    try {
      const res = await apiGet<any[]>(
        `/messages/conversation/${otherUserId}`,
      )
      const mapped = res.map(mapMessageRead)
      set({ conversation: mapped, activeOtherUserId: otherUserId })
    } finally {
      set({ loadingConversation: false })
    }
  },
  sendMessage: async (receiverId, text) => {
    await apiPost('/messages', {
      receiver_id: receiverId,
      message: text,
    })
    await storeGet().fetchConversation(receiverId)
  },
}))

