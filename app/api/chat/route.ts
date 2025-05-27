import {
  ChatMessage,
  DEFAULT_SYSTEM_PROMPT,
  sendChatMessage,
} from '@/lib/ai/openai'
import { NextRequest, NextResponse } from 'next/server'

export const POST = async (request: NextRequest) => {
  try {
    const { messages, systemPrompt } = await request.json()

    if (!messages || !Array.isArray(messages)) {
      return NextResponse.json(
        { error: 'Invalid messages format' },
        { status: 400 }
      )
    }

    const chatMessages: ChatMessage[] = messages.map((msg: any) => ({
      role: msg.role,
      content: msg.content,
      timestamp: msg.timestamp ? new Date(msg.timestamp) : new Date(),
    }))

    const response = await sendChatMessage(
      chatMessages,
      systemPrompt || DEFAULT_SYSTEM_PROMPT
    )

    return NextResponse.json({
      message: response.message,
      usage: response.usage,
      processingTime: response.processingTime,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error('Chat API Error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
