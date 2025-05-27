// パフォーマンスメトリクス型定義
export interface PerformanceMetrics {
  aiAnalysis: {
    responseTime: number // ミリ秒
    tokenUsage: {
      prompt: number
      completion: number
      total: number
    }
    cost: number // USD
    successRate: number // 0-1
    errorCount: number
  }
  systemMetrics: {
    fileProcessingTime: number // ミリ秒
    memoryUsage: number // MB
    dataSize: number // レコード数
  }
  timestamp: Date
  aiModel: 'openai' | 'gemini'
}

// メトリクス集計結果型
export interface MetricsSummary {
  totalAnalyses: number
  averageResponseTime: number
  totalCost: number
  totalTokens: number
  successRate: number
  modelComparison: {
    openai: Partial<PerformanceMetrics>
    gemini: Partial<PerformanceMetrics>
  }
  timeRange: {
    from: Date
    to: Date
  }
}

// リアルタイムメトリクス型
export interface RealtimeMetrics {
  currentAnalyses: number
  queueSize: number
  systemLoad: number
  lastUpdate: Date
}
