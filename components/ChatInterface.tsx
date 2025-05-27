'use client'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Textarea } from '@/components/ui/textarea'
import { Bot, Clock, Send, User, Zap } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'

interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: Date
  usage?: {
    promptTokens: number
    completionTokens: number
    totalTokens: number
  }
  processingTime?: number
}

const ChatInterface = () => {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [isClient, setIsClient] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  // クライアントサイドでのみ初期メッセージを設定
  useEffect(() => {
    setIsClient(true)
    setMessages([
      {
        id: '1',
        role: 'assistant',
        content:
          'こんにちは！人事異動支援システム「Disperse」のAIアシスタントです。人事異動や組織運営について何でもお聞きください。',
        timestamp: new Date(),
      },
    ])
  }, [])

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const sendMessage = async () => {
    if (!input.trim() || isLoading) return

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input.trim(),
      timestamp: new Date(),
    }

    setMessages((prev) => [...prev, userMessage])
    setInput('')
    setIsLoading(true)

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messages: [...messages, userMessage].map((msg) => ({
            role: msg.role,
            content: msg.content,
          })),
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to send message')
      }

      const data = await response.json()

      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: data.message,
        timestamp: new Date(data.timestamp),
        usage: data.usage,
        processingTime: data.processingTime,
      }

      setMessages((prev) => [...prev, assistantMessage])
    } catch (error) {
      console.error('Error sending message:', error)
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content:
          'エラーが発生しました。しばらく時間をおいて再度お試しください。',
        timestamp: new Date(),
      }
      setMessages((prev) => [...prev, errorMessage])
    } finally {
      setIsLoading(false)
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  return (
    <Card
      className='w-full flex flex-col overflow-hidden'
      style={{ height: 'calc(100vh - 200px)' }}>
      <CardHeader className='flex-shrink-0'>
        <CardTitle className='flex items-center gap-2'>
          <Bot className='h-5 w-5' />
          AI チャット
        </CardTitle>
      </CardHeader>
      <CardContent className='flex-1 flex flex-col p-0 min-w-0 min-h-0'>
        {/* メッセージ一覧 */}
        <div className='flex-1 overflow-y-auto overflow-x-hidden p-4 space-y-4 min-h-0'>
          {!isClient ? (
            <div className='flex justify-center items-center h-full'>
              <div className='text-gray-500'>読み込み中...</div>
            </div>
          ) : (
            messages.map((message) => (
              <div
                key={message.id}
                className={`flex gap-3 w-full ${
                  message.role === 'user' ? 'justify-end' : 'justify-start'
                }`}>
                <div
                  className={`flex gap-3 max-w-[75%] min-w-0 ${
                    message.role === 'user' ? 'flex-row-reverse' : 'flex-row'
                  }`}>
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                      message.role === 'user'
                        ? 'bg-blue-500 text-white'
                        : 'bg-gray-200 text-gray-600'
                    }`}>
                    {message.role === 'user' ? (
                      <User className='h-4 w-4' />
                    ) : (
                      <Bot className='h-4 w-4' />
                    )}
                  </div>
                  <div
                    className={`rounded-lg p-3 min-w-0 max-w-full flex-1 ${
                      message.role === 'user'
                        ? 'bg-blue-500 text-white'
                        : 'bg-gray-100 text-gray-900'
                    }`}>
                    <div
                      className='whitespace-pre-wrap break-words overflow-hidden'
                      style={{
                        wordBreak: 'break-word',
                        overflowWrap: 'break-word',
                      }}>
                      {message.content}
                    </div>
                    <div className='flex flex-wrap items-center gap-2 mt-2 text-xs opacity-70'>
                      <span className='flex items-center gap-1 flex-shrink-0'>
                        <Clock className='h-3 w-3' />
                        {isClient
                          ? message.timestamp.toLocaleTimeString('ja-JP', {
                              hour12: false,
                            })
                          : '--:--:--'}
                      </span>
                      {message.processingTime && (
                        <span className='flex items-center gap-1 flex-shrink-0'>
                          <Zap className='h-3 w-3' />
                          {message.processingTime}ms
                        </span>
                      )}
                      {message.usage && (
                        <span className='flex-shrink-0'>
                          {message.usage.totalTokens} tokens
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
          {isLoading && (
            <div className='flex gap-3 justify-start'>
              <div className='w-8 h-8 rounded-full bg-gray-200 text-gray-600 flex items-center justify-center'>
                <Bot className='h-4 w-4' />
              </div>
              <div className='bg-gray-100 rounded-lg p-3'>
                <div className='flex space-x-1'>
                  <div className='w-2 h-2 bg-gray-400 rounded-full animate-bounce'></div>
                  <div
                    className='w-2 h-2 bg-gray-400 rounded-full animate-bounce'
                    style={{ animationDelay: '0.1s' }}></div>
                  <div
                    className='w-2 h-2 bg-gray-400 rounded-full animate-bounce'
                    style={{ animationDelay: '0.2s' }}></div>
                </div>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* 入力エリア */}
        <div className='border-t p-4 flex-shrink-0'>
          <div className='flex gap-2 items-end'>
            <Textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder='メッセージを入力してください...'
              className='flex-1 min-h-[60px] max-h-[120px] resize-none'
              disabled={isLoading}
            />
            <Button
              onClick={sendMessage}
              disabled={!input.trim() || isLoading}
              size='icon'
              className='h-[60px] w-[60px] flex-shrink-0'>
              <Send className='h-4 w-4' />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

export default ChatInterface
