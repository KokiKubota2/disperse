'use client'

import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Progress } from '@/components/ui/progress'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Textarea } from '@/components/ui/textarea'
import { PerformanceMetrics } from '@/types/metrics'
import { AnalysisRequest, TransferProposal } from '@/types/proposal'
import {
  Brain,
  Clock,
  DollarSign,
  Loader2,
  TrendingUp,
  Users,
} from 'lucide-react'
import { useEffect, useState } from 'react'

interface AnalysisResponse {
  success: boolean
  proposals: TransferProposal[]
  metrics: PerformanceMetrics
  message: string
  error?: string
}

interface AnalysisPanelProps {
  employeeCount: number
  onAnalysisComplete?: (proposals: TransferProposal[]) => void
}

export default function AnalysisPanel({
  employeeCount,
  onAnalysisComplete,
}: AnalysisPanelProps) {
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [proposals, setProposals] = useState<TransferProposal[]>([])
  const [metrics, setMetrics] = useState<PerformanceMetrics | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [progress, setProgress] = useState(0)
  const [naturalLanguageCondition, setNaturalLanguageCondition] = useState('')

  // 既存の分析結果を読み込み
  useEffect(() => {
    loadExistingData()
  }, [])

  const loadExistingData = async () => {
    try {
      const response = await fetch('/api/analyze')
      if (response.ok) {
        const data = await response.json()
        if (data.hasData) {
          setProposals(data.proposals || [])
          setMetrics(data.metrics?.[data.metrics.length - 1] || null)
        }
      }
    } catch (error) {
      console.error('既存データの読み込みエラー:', error)
    }
  }

  const startAnalysis = async (options: Partial<AnalysisRequest> = {}) => {
    if (employeeCount === 0) {
      setError(
        'データが読み込まれていません。先にExcelファイルを読み込んでください。'
      )
      return
    }

    setIsAnalyzing(true)
    setError(null)
    setProgress(0)

    // 推定処理時間に基づくプログレス更新
    const maxEmployees = options.options?.maxEmployees || employeeCount
    const estimatedTotalTime = maxEmployees * 5000 // 1人あたり約5秒と仮定
    const startTime = Date.now()

    const progressInterval = setInterval(() => {
      setProgress((prev) => {
        const elapsed = Date.now() - startTime
        const estimatedProgress = Math.min(
          (elapsed / estimatedTotalTime) * 90,
          90
        )

        // 推定進行度と現在の進行度の間を補間
        const newProgress = prev + (estimatedProgress - prev) * 0.1
        return Math.min(newProgress, 95) // 95%で停止
      })
    }, 1000)

    try {
      const analysisRequest: AnalysisRequest = {
        naturalLanguageCondition: naturalLanguageCondition.trim() || undefined,
        options: {
          includeReasons: true,
          confidenceThreshold: 0.6,
          maxProposals: 50,
          ...options.options,
        },
        ...options,
      }

      console.log('AI分析開始:', analysisRequest)

      const controller = new AbortController()
      const timeoutId = setTimeout(() => {
        controller.abort()
        setError('分析がタイムアウトしました。再度お試しください。')
      }, 600000) // 10分タイムアウト

      const response = await fetch('/api/analyze', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(analysisRequest),
        signal: controller.signal,
      })

      clearTimeout(timeoutId)

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || `HTTP ${response.status}`)
      }

      const data: AnalysisResponse = await response.json()

      if (data.success) {
        setProgress(100)
        setProposals(data.proposals)
        setMetrics(data.metrics)
        onAnalysisComplete?.(data.proposals)
        console.log('AI分析完了:', data.message)
      } else {
        setError(data.error || 'AI分析中にエラーが発生しました')
      }
    } catch (error) {
      console.error('分析エラー:', error)
      if (error instanceof Error) {
        if (error.name === 'AbortError') {
          setError('分析がタイムアウトしました。再度お試しください。')
        } else {
          setError(`分析エラー: ${error.message}`)
        }
      } else {
        setError('AI分析中にエラーが発生しました')
      }
    } finally {
      clearInterval(progressInterval)
      setIsAnalyzing(false)
      setTimeout(() => setProgress(0), 3000)
    }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('ja-JP', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 4,
    }).format(amount)
  }

  const formatDuration = (ms: number) => {
    if (ms < 1000) return `${ms}ms`
    return `${(ms / 1000).toFixed(1)}秒`
  }

  return (
    <div className='space-y-6'>
      {/* 分析実行セクション */}
      <Card>
        <CardHeader>
          <CardTitle className='flex items-center gap-2'>
            <Brain className='h-5 w-5' />
            AI分析・提案
          </CardTitle>
          <CardDescription>
            従業員データを分析して最適な人事異動を提案します
          </CardDescription>
        </CardHeader>
        <CardContent className='space-y-4'>
          {error && (
            <Alert variant='destructive'>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <div className='space-y-4'>
            <div className='flex items-center gap-4'>
              <Button
                onClick={() => startAnalysis()}
                disabled={isAnalyzing || employeeCount === 0}
                className='flex items-center gap-2'>
                {isAnalyzing ? (
                  <>
                    <Loader2 className='h-4 w-4 animate-spin' />
                    分析中...
                  </>
                ) : (
                  <>
                    <Brain className='h-4 w-4' />
                    全従業員を分析
                  </>
                )}
              </Button>

              <Button
                onClick={() =>
                  startAnalysis({
                    options: {
                      includeReasons: true,
                      confidenceThreshold: 0.6,
                      maxEmployees: 10,
                    },
                  })
                }
                disabled={isAnalyzing || employeeCount === 0}
                variant='outline'
                className='flex items-center gap-2'>
                {isAnalyzing ? (
                  <>
                    <Loader2 className='h-4 w-4 animate-spin' />
                    分析中...
                  </>
                ) : (
                  <>
                    <Brain className='h-4 w-4' />
                    サンプル分析（10名）
                  </>
                )}
              </Button>

              <div className='text-sm text-muted-foreground'>
                対象: {employeeCount}名の従業員
              </div>
            </div>

            <div className='space-y-3'>
              <div>
                <Label htmlFor='condition'>分析条件（自然言語で指定）</Label>
                <Textarea
                  id='condition'
                  placeholder='例: 営業経験があり、リーダーシップのある人材を優先的に分析して'
                  value={naturalLanguageCondition}
                  onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                    setNaturalLanguageCondition(e.target.value)
                  }
                  className='mt-1'
                  rows={3}
                />
                <div className='text-xs text-muted-foreground mt-1'>
                  条件を指定すると、該当する従業員のみが分析対象となります（空欄の場合は全従業員が対象）
                </div>
              </div>

              <div className='text-xs text-muted-foreground bg-muted p-2 rounded'>
                💡 ヒント:
                全従業員の分析には3-5分程度かかります。まずはサンプル分析（10名）で動作確認することをお勧めします。
              </div>
            </div>
          </div>

          {isAnalyzing && (
            <div className='space-y-2'>
              <div className='flex justify-between text-sm'>
                <span>分析進行状況</span>
                <span>{Math.round(progress)}%</span>
              </div>
              <Progress value={progress} className='w-full' />
            </div>
          )}
        </CardContent>
      </Card>

      {/* 結果表示セクション */}
      {(proposals.length > 0 || metrics) && (
        <Tabs defaultValue='proposals' className='w-full'>
          <TabsList className='grid w-full grid-cols-2'>
            <TabsTrigger value='proposals'>異動提案</TabsTrigger>
            <TabsTrigger value='metrics'>パフォーマンス</TabsTrigger>
          </TabsList>

          <TabsContent value='proposals' className='space-y-4'>
            <Card>
              <CardHeader>
                <CardTitle className='flex items-center gap-2'>
                  <Users className='h-5 w-5' />
                  異動提案結果
                </CardTitle>
                <CardDescription>
                  {proposals.length}件の異動提案が生成されました
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className='space-y-4'>
                  {proposals.map((proposal, index) => (
                    <Card
                      key={`${proposal.employeeId}-${index}`}
                      className='border-l-4 border-l-primary'>
                      <CardContent className='pt-4'>
                        <div className='flex items-start justify-between'>
                          <div className='space-y-2'>
                            <div className='flex items-center gap-2'>
                              <h4 className='font-semibold'>
                                {proposal.employeeName}
                              </h4>
                              <Badge variant='outline'>
                                信頼度:{' '}
                                {Math.round(proposal.confidenceScore * 100)}%
                              </Badge>
                            </div>
                            <div className='text-sm text-muted-foreground'>
                              {proposal.fromDepartment} →{' '}
                              {proposal.toDepartment}
                            </div>
                            <p className='text-sm'>{proposal.reasoning}</p>
                          </div>
                          <div className='text-xs text-muted-foreground'>
                            {formatDuration(proposal.processingTime)}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value='metrics' className='space-y-4'>
            {metrics && (
              <>
                <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4'>
                  <Card>
                    <CardContent className='pt-4'>
                      <div className='flex items-center gap-2'>
                        <Clock className='h-4 w-4 text-muted-foreground' />
                        <div className='text-sm font-medium'>処理時間</div>
                      </div>
                      <div className='text-2xl font-bold'>
                        {formatDuration(metrics.aiAnalysis.responseTime)}
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardContent className='pt-4'>
                      <div className='flex items-center gap-2'>
                        <TrendingUp className='h-4 w-4 text-muted-foreground' />
                        <div className='text-sm font-medium'>成功率</div>
                      </div>
                      <div className='text-2xl font-bold'>
                        {Math.round(metrics.aiAnalysis.successRate * 100)}%
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardContent className='pt-4'>
                      <div className='flex items-center gap-2'>
                        <DollarSign className='h-4 w-4 text-muted-foreground' />
                        <div className='text-sm font-medium'>推定コスト</div>
                      </div>
                      <div className='text-2xl font-bold'>
                        {formatCurrency(metrics.aiAnalysis.cost)}
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardContent className='pt-4'>
                      <div className='flex items-center gap-2'>
                        <Brain className='h-4 w-4 text-muted-foreground' />
                        <div className='text-sm font-medium'>
                          トークン使用量
                        </div>
                      </div>
                      <div className='text-2xl font-bold'>
                        {metrics.aiAnalysis.tokenUsage.total.toLocaleString()}
                      </div>
                    </CardContent>
                  </Card>
                </div>

                <Card>
                  <CardHeader>
                    <CardTitle>詳細メトリクス</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className='grid grid-cols-1 md:grid-cols-2 gap-6'>
                      <div className='space-y-2'>
                        <h4 className='font-medium'>AI分析</h4>
                        <div className='space-y-1 text-sm'>
                          <div className='flex justify-between'>
                            <span>入力トークン:</span>
                            <span>
                              {metrics.aiAnalysis.tokenUsage.prompt.toLocaleString()}
                            </span>
                          </div>
                          <div className='flex justify-between'>
                            <span>出力トークン:</span>
                            <span>
                              {metrics.aiAnalysis.tokenUsage.completion.toLocaleString()}
                            </span>
                          </div>
                          <div className='flex justify-between'>
                            <span>エラー数:</span>
                            <span>{metrics.aiAnalysis.errorCount}</span>
                          </div>
                        </div>
                      </div>

                      <div className='space-y-2'>
                        <h4 className='font-medium'>システム</h4>
                        <div className='space-y-1 text-sm'>
                          <div className='flex justify-between'>
                            <span>メモリ使用量:</span>
                            <span>
                              {Math.round(metrics.systemMetrics.memoryUsage)}MB
                            </span>
                          </div>
                          <div className='flex justify-between'>
                            <span>データサイズ:</span>
                            <span>{metrics.systemMetrics.dataSize}件</span>
                          </div>
                          <div className='flex justify-between'>
                            <span>AIモデル:</span>
                            <span className='capitalize'>
                              {metrics.aiModel}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </>
            )}
          </TabsContent>
        </Tabs>
      )}
    </div>
  )
}
