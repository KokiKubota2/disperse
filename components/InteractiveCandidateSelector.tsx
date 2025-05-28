'use client'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Textarea } from '@/components/ui/textarea'
import { Department, Employee } from '@/types/employee'
import { TransferProposal } from '@/types/proposal'
import { CheckCircle, Loader2, MessageCircle, Users } from 'lucide-react'
import { useState } from 'react'

interface InteractiveCandidateSelectorProps {
  employees: Employee[]
  departments: Department[]
  onProposalsGenerated: (proposals: TransferProposal[]) => void
}

interface ConversationStep {
  type: 'user' | 'ai'
  content: string
  candidates?: Employee[]
  suggestions?: string[]
  questions?: string[]
}

export default function InteractiveCandidateSelector({
  employees,
  departments,
  onProposalsGenerated,
}: InteractiveCandidateSelectorProps) {
  const [isProcessing, setIsProcessing] = useState(false)
  const [conversation, setConversation] = useState<ConversationStep[]>([])
  const [userInput, setUserInput] = useState('')
  const [currentCandidates, setCurrentCandidates] = useState<Employee[]>([])
  const [originalCondition, setOriginalCondition] = useState('')
  const [proposals, setProposals] = useState<TransferProposal[]>([])

  const handleInitialSearch = async () => {
    if (!userInput.trim()) return

    setIsProcessing(true)
    setOriginalCondition(userInput)

    try {
      // API経由で初回の候補者検索
      const response = await fetch('/api/candidates', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'search',
          condition: userInput,
        }),
      })

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`)
      }

      const result = await response.json()

      if (!result.success) {
        throw new Error(result.error || '候補者検索に失敗しました')
      }

      setCurrentCandidates(result.candidates)

      // 会話履歴に追加
      const userStep: ConversationStep = {
        type: 'user',
        content: userInput,
      }

      const aiStep: ConversationStep = {
        type: 'ai',
        content: result.reasoning,
        candidates: result.candidates,
        suggestions: result.suggestions,
        questions: result.clarificationQuestions,
      }

      setConversation([userStep, aiStep])
      setUserInput('')
    } catch (error) {
      console.error('候補者検索エラー:', error)
      const errorStep: ConversationStep = {
        type: 'ai',
        content: `申し訳ございません。候補者の検索中にエラーが発生しました: ${
          error instanceof Error ? error.message : '不明なエラー'
        }`,
      }
      setConversation([{ type: 'user', content: userInput }, errorStep])
    } finally {
      setIsProcessing(false)
    }
  }

  const handleRefinement = async () => {
    if (!userInput.trim() || currentCandidates.length === 0) return

    setIsProcessing(true)

    try {
      // API経由で候補者の絞り込み
      const response = await fetch('/api/candidates', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'refine',
          condition: originalCondition,
          candidates: currentCandidates.map((c) => c.id),
          userFeedback: userInput,
        }),
      })

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`)
      }

      const result = await response.json()

      if (!result.success) {
        throw new Error(result.error || '候補者絞り込みに失敗しました')
      }

      setCurrentCandidates(result.refinedCandidates)

      // 会話履歴に追加
      const userStep: ConversationStep = {
        type: 'user',
        content: userInput,
      }

      const aiStep: ConversationStep = {
        type: 'ai',
        content: result.reasoning,
        candidates: result.refinedCandidates,
        questions: result.nextQuestions,
      }

      setConversation([...conversation, userStep, aiStep])
      setUserInput('')
    } catch (error) {
      console.error('候補者絞り込みエラー:', error)
      const errorStep: ConversationStep = {
        type: 'ai',
        content: `申し訳ございません。候補者の絞り込み中にエラーが発生しました: ${
          error instanceof Error ? error.message : '不明なエラー'
        }`,
      }
      setConversation([
        ...conversation,
        { type: 'user', content: userInput },
        errorStep,
      ])
    } finally {
      setIsProcessing(false)
    }
  }

  const generateProposals = async () => {
    if (currentCandidates.length === 0) return

    setIsProcessing(true)

    try {
      // API経由で異動提案を生成
      const response = await fetch('/api/candidates', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'generateProposals',
          condition: originalCondition,
          candidates: currentCandidates.map((c) => c.id),
        }),
      })

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`)
      }

      const result = await response.json()

      if (!result.success) {
        throw new Error(result.error || '異動提案生成に失敗しました')
      }

      // 提案を保存
      setProposals(result.proposals)
      onProposalsGenerated(result.proposals)

      // 完了メッセージを追加
      const completionStep: ConversationStep = {
        type: 'ai',
        content: `${currentCandidates.length}名の候補者について${result.proposals.length}件の異動提案を生成しました。`,
      }
      setConversation([...conversation, completionStep])
    } catch (error) {
      console.error('提案生成エラー:', error)
      const errorStep: ConversationStep = {
        type: 'ai',
        content: `申し訳ございません。異動提案の生成中にエラーが発生しました: ${
          error instanceof Error ? error.message : '不明なエラー'
        }`,
      }
      setConversation([...conversation, errorStep])
    } finally {
      setIsProcessing(false)
    }
  }

  const reset = () => {
    setConversation([])
    setCurrentCandidates([])
    setOriginalCondition('')
    setUserInput('')
    setProposals([])
  }

  return (
    <Card className='w-full'>
      <CardHeader>
        <CardTitle className='flex items-center gap-2'>
          <MessageCircle className='h-5 w-5' />
          対話形式候補者選出
        </CardTitle>
        <CardDescription>
          自然言語で条件を指定し、AIとの対話を通じて最適な候補者を選出します
        </CardDescription>
      </CardHeader>
      <CardContent className='space-y-6'>
        {/* 会話履歴 */}
        {conversation.length > 0 && (
          <div className='space-y-4 max-h-96 overflow-y-auto border rounded-lg p-4 bg-muted/20'>
            {conversation.map((step, index) => (
              <div
                key={index}
                className={`flex ${
                  step.type === 'user' ? 'justify-end' : 'justify-start'
                }`}>
                <div
                  className={`max-w-[80%] p-3 rounded-lg ${
                    step.type === 'user'
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-background border'
                  }`}>
                  <p className='text-sm'>{step.content}</p>

                  {/* 候補者表示 */}
                  {step.candidates && step.candidates.length > 0 && (
                    <div className='mt-3 space-y-2'>
                      <p className='text-xs font-medium'>
                        候補者 ({step.candidates.length}名):
                      </p>
                      <div className='flex flex-wrap gap-1'>
                        {step.candidates.map((candidate) => (
                          <Badge
                            key={candidate.id}
                            variant='secondary'
                            className='text-xs'>
                            {candidate.name} ({candidate.department})
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* 提案表示 */}
                  {step.suggestions && step.suggestions.length > 0 && (
                    <div className='mt-3 space-y-1'>
                      <p className='text-xs font-medium'>追加提案:</p>
                      {step.suggestions.map((suggestion, idx) => (
                        <p key={idx} className='text-xs text-muted-foreground'>
                          • {suggestion}
                        </p>
                      ))}
                    </div>
                  )}

                  {/* 質問表示 */}
                  {step.questions && step.questions.length > 0 && (
                    <div className='mt-3 space-y-1'>
                      <p className='text-xs font-medium'>確認事項:</p>
                      {step.questions.map((question, idx) => (
                        <p key={idx} className='text-xs text-muted-foreground'>
                          • {question}
                        </p>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* 入力エリア */}
        <div className='space-y-4'>
          <Textarea
            placeholder={
              conversation.length === 0
                ? '例: 経理部以外からExcelを使用できる人を二人経理部に異動させたい'
                : '追加の条件や要望があれば入力してください...'
            }
            value={userInput}
            onChange={(e) => setUserInput(e.target.value)}
            rows={3}
            disabled={isProcessing}
          />

          <div className='flex gap-2 flex-wrap'>
            {conversation.length === 0 ? (
              <Button
                onClick={handleInitialSearch}
                disabled={isProcessing || !userInput.trim()}
                className='flex items-center gap-2'>
                {isProcessing ? (
                  <Loader2 className='h-4 w-4 animate-spin' />
                ) : (
                  <Users className='h-4 w-4' />
                )}
                候補者を検索
              </Button>
            ) : (
              <>
                <Button
                  onClick={handleRefinement}
                  disabled={
                    isProcessing ||
                    !userInput.trim() ||
                    currentCandidates.length === 0
                  }
                  variant='outline'
                  className='flex items-center gap-2'>
                  {isProcessing ? (
                    <Loader2 className='h-4 w-4 animate-spin' />
                  ) : (
                    <MessageCircle className='h-4 w-4' />
                  )}
                  条件を追加
                </Button>

                <Button
                  onClick={generateProposals}
                  disabled={isProcessing || currentCandidates.length === 0}
                  className='flex items-center gap-2'>
                  {isProcessing ? (
                    <Loader2 className='h-4 w-4 animate-spin' />
                  ) : (
                    <CheckCircle className='h-4 w-4' />
                  )}
                  異動提案を生成
                </Button>

                <Button
                  onClick={reset}
                  disabled={isProcessing}
                  variant='ghost'
                  size='sm'>
                  リセット
                </Button>
              </>
            )}
          </div>
        </div>

        {/* 現在の候補者サマリー */}
        {currentCandidates.length > 0 && (
          <Card className='bg-muted/50'>
            <CardContent className='pt-4'>
              <div className='flex items-center gap-2 mb-2'>
                <Users className='h-4 w-4' />
                <span className='font-medium'>
                  現在の候補者 ({currentCandidates.length}名)
                </span>
              </div>
              <div className='flex flex-wrap gap-1'>
                {currentCandidates.map((candidate) => (
                  <Badge
                    key={candidate.id}
                    variant='outline'
                    className='text-xs'>
                    {candidate.name} ({candidate.department})
                  </Badge>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* 異動提案結果 */}
        {proposals.length > 0 && (
          <Card className='bg-green-50 border-green-200'>
            <CardHeader>
              <CardTitle className='flex items-center gap-2 text-green-800'>
                <CheckCircle className='h-5 w-5' />
                異動提案結果 ({proposals.length}件)
              </CardTitle>
            </CardHeader>
            <CardContent className='space-y-4'>
              {proposals.map((proposal, index) => (
                <div
                  key={`${proposal.employeeId}-${index}`}
                  className='bg-white p-4 rounded-lg border border-green-200'>
                  <div className='flex items-center justify-between mb-2'>
                    <div className='flex items-center gap-2'>
                      <span className='font-medium text-green-800'>
                        {proposal.employeeName}
                      </span>
                      <Badge variant='secondary' className='text-xs'>
                        信頼度: {Math.round(proposal.confidenceScore * 100)}%
                      </Badge>
                    </div>
                    <div className='text-sm text-gray-600'>
                      {proposal.fromDepartment} → {proposal.toDepartment}
                    </div>
                  </div>
                  <p className='text-sm text-gray-700 leading-relaxed'>
                    {proposal.reasoning}
                  </p>
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        {/* ヒント */}
        <div className='text-xs text-muted-foreground bg-muted/30 p-3 rounded-lg'>
          💡 <strong>使い方のヒント:</strong>
          <br />
          •
          「○○部以外から」「○○のスキルがある人」「○○年以上の経験」など具体的に指定
          <br />
          •
          AIが質問を返した場合は、それに答えることでより精度の高い候補者選出が可能
          <br />•
          候補者が多すぎる場合は追加条件で絞り込み、少なすぎる場合は条件を緩和
        </div>
      </CardContent>
    </Card>
  )
}
