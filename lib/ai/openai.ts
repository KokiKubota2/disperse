import OpenAI from 'openai'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

// OpenAIクライアントをエクスポート
export { openai }

export interface ChatMessage {
  role: 'user' | 'assistant' | 'system'
  content: string
  timestamp?: Date
}

export interface ChatResponse {
  message: string
  usage?: {
    promptTokens: number
    completionTokens: number
    totalTokens: number
  }
  processingTime: number
}

export const sendChatMessage = async (
  messages: ChatMessage[],
  systemPrompt?: string
): Promise<ChatResponse> => {
  const startTime = Date.now()

  try {
    const chatMessages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] =
      []

    // システムプロンプトを追加
    if (systemPrompt) {
      chatMessages.push({
        role: 'system',
        content: systemPrompt,
      })
    }

    // ユーザーメッセージを追加
    chatMessages.push(
      ...messages.map((msg) => ({
        role: msg.role,
        content: msg.content,
      }))
    )

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini', // コスト効率の良いモデルを使用
      messages: chatMessages,
      max_tokens: 1000,
      temperature: 0.7,
    })

    const processingTime = Date.now() - startTime

    return {
      message:
        completion.choices[0]?.message?.content || 'エラーが発生しました',
      usage: completion.usage
        ? {
            promptTokens: completion.usage.prompt_tokens,
            completionTokens: completion.usage.completion_tokens,
            totalTokens: completion.usage.total_tokens,
          }
        : undefined,
      processingTime,
    }
  } catch (error) {
    console.error('OpenAI API Error:', error)
    const processingTime = Date.now() - startTime

    // エラーの種類に応じてメッセージを変更
    let errorMessage = 'AIとの通信でエラーが発生しました。'

    if (error instanceof Error) {
      if (error.message.includes('quota')) {
        errorMessage =
          '⚠️ OpenAI APIのクォータ制限に達しています。管理者にお問い合わせください。'
      } else if (error.message.includes('rate limit')) {
        errorMessage =
          '⚠️ APIの利用制限に達しています。しばらく時間をおいて再度お試しください。'
      } else if (error.message.includes('invalid_api_key')) {
        errorMessage = '⚠️ APIキーが無効です。管理者にお問い合わせください。'
      } else {
        errorMessage = `⚠️ エラーが発生しました: ${error.message}`
      }
    }

    return {
      message: errorMessage,
      processingTime,
    }
  }
}

export const DEFAULT_SYSTEM_PROMPT = `あなたは人事異動支援システム「Disperse」のAIアシスタントです。

以下の役割を担います：
1. 人事異動に関する質問への回答
2. 従業員データの分析支援
3. 組織運営に関するアドバイス

回答は以下の点に注意してください：
- 日本語で回答してください
- 具体的で実用的なアドバイスを提供してください
- 個人情報の取り扱いには十分注意してください
- 不確実な情報については推測ではなく、確認が必要である旨を伝えてください

何かご質問はありますか？`
