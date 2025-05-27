// 異動提案データ型定義
export interface TransferProposal {
  employeeId: string
  employeeName: string
  fromDepartment: string
  toDepartment: string
  confidenceScore: number
  reasoning: string
  aiModel: 'openai' | 'gemini'
  processingTime: number
  timestamp: Date
}

// 提案分析結果型
export interface ProposalAnalysis {
  proposals: TransferProposal[]
  summary: {
    totalProposals: number
    averageConfidence: number
    departmentChanges: Record<string, number>
    aiModelComparison: {
      openai: number
      gemini: number
    }
  }
  generatedAt: Date
}

// AI分析リクエスト型
export interface AnalysisRequest {
  employeeIds?: string[] // 特定の従業員のみ分析する場合
  aiModel?: 'openai' | 'gemini' | 'both'
  naturalLanguageCondition?: string // 自然言語での条件指定
  options?: {
    includeReasons: boolean
    confidenceThreshold: number
    maxProposals?: number
    maxEmployees?: number // 処理する最大従業員数
  }
}
