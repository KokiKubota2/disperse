import { Department, Employee, ProcessedData } from '@/types/employee'
import { PerformanceMetrics } from '@/types/metrics'
import { ProposalAnalysis, TransferProposal } from '@/types/proposal'
import { promises as fs } from 'fs'
import path from 'path'

// メモリ内データストア
class DataStore {
  private data: ProcessedData | null = null
  private proposals: TransferProposal[] = []
  private metrics: PerformanceMetrics[] = []

  // データディレクトリのパス
  private readonly DATA_DIR = path.join(process.cwd(), 'data')
  private readonly PROCESSED_DIR = path.join(this.DATA_DIR, 'processed')
  private readonly RESULTS_DIR = path.join(this.DATA_DIR, 'results')

  constructor() {
    // Vercel環境では書き込み権限が制限されているため、メモリ内のみで動作
    if (process.env.NODE_ENV !== 'production') {
      this.ensureDirectories()
      // 初期化を非同期で実行
      this.initialize().catch((error) => {
        console.error('データストア初期化エラー:', error)
      })
    }
  }

  /**
   * 必要なディレクトリを作成
   */
  private async ensureDirectories() {
    try {
      await fs.mkdir(this.PROCESSED_DIR, { recursive: true })
      await fs.mkdir(this.RESULTS_DIR, { recursive: true })
    } catch (error) {
      console.error('ディレクトリ作成エラー:', error)
    }
  }

  /**
   * 従業員データを設定
   */
  setData(data: ProcessedData): void {
    console.log('データストアにデータを設定:', {
      employeeCount: data.employees.length,
      departmentCount: data.departments.length,
    })
    this.data = data
    // 本番環境以外でのみファイル保存
    if (process.env.NODE_ENV !== 'production') {
      this.saveDataToFile().catch((error) => {
        console.error('データ保存エラー:', error)
      })
    }
  }

  /**
   * 従業員データを取得
   */
  getData(): ProcessedData | null {
    return this.data
  }

  /**
   * 従業員リストを取得
   */
  getEmployees(): Employee[] {
    return this.data?.employees || []
  }

  /**
   * 部署リストを取得
   */
  getDepartments(): Department[] {
    return this.data?.departments || []
  }

  /**
   * 特定の従業員を取得
   */
  getEmployee(id: string): Employee | undefined {
    return this.data?.employees.find((emp) => emp.id === id)
  }

  /**
   * 特定の部署を取得
   */
  getDepartment(name: string): Department | undefined {
    return this.data?.departments.find((dept) => dept.name === name)
  }

  /**
   * 異動提案を追加
   */
  addProposal(proposal: TransferProposal): void {
    this.proposals.push(proposal)
    if (process.env.NODE_ENV !== 'production') {
      this.saveProposalsToFile()
    }
  }

  /**
   * 異動提案を一括追加
   */
  addProposals(proposals: TransferProposal[]): void {
    this.proposals.push(...proposals)
    if (process.env.NODE_ENV !== 'production') {
      this.saveProposalsToFile()
    }
  }

  /**
   * 異動提案を取得
   */
  getProposals(): TransferProposal[] {
    return this.proposals
  }

  /**
   * 特定従業員の提案を取得
   */
  getProposalsForEmployee(employeeId: string): TransferProposal[] {
    return this.proposals.filter((p) => p.employeeId === employeeId)
  }

  /**
   * 提案分析結果を生成
   */
  getProposalAnalysis(): ProposalAnalysis {
    const totalProposals = this.proposals.length
    const averageConfidence =
      totalProposals > 0
        ? this.proposals.reduce((sum, p) => sum + p.confidenceScore, 0) /
          totalProposals
        : 0

    // 部署変更の集計
    const departmentChanges: Record<string, number> = {}
    this.proposals.forEach((p) => {
      const key = `${p.fromDepartment} → ${p.toDepartment}`
      departmentChanges[key] = (departmentChanges[key] || 0) + 1
    })

    // AIモデル別の集計
    const openaiCount = this.proposals.filter(
      (p) => p.aiModel === 'openai'
    ).length
    const geminiCount = this.proposals.filter(
      (p) => p.aiModel === 'gemini'
    ).length

    return {
      proposals: this.proposals,
      summary: {
        totalProposals,
        averageConfidence,
        departmentChanges,
        aiModelComparison: {
          openai: openaiCount,
          gemini: geminiCount,
        },
      },
      generatedAt: new Date(),
    }
  }

  /**
   * パフォーマンスメトリクスを追加
   */
  addMetrics(metrics: PerformanceMetrics): void {
    this.metrics.push(metrics)
    if (process.env.NODE_ENV !== 'production') {
      this.saveMetricsToFile()
    }
  }

  /**
   * パフォーマンスメトリクスを取得
   */
  getMetrics(): PerformanceMetrics[] {
    return this.metrics
  }

  /**
   * データをクリア
   */
  clearData(): void {
    this.data = null
    this.proposals = []
    this.metrics = []
  }

  /**
   * 提案をクリア
   */
  clearProposals(): void {
    this.proposals = []
  }

  /**
   * データをファイルに保存
   */
  private async saveDataToFile(): Promise<void> {
    if (!this.data) return

    try {
      const filePath = path.join(this.PROCESSED_DIR, 'employees.json')
      await fs.writeFile(filePath, JSON.stringify(this.data, null, 2))
    } catch (error) {
      console.error('データ保存エラー:', error)
    }
  }

  /**
   * 提案をファイルに保存
   */
  private async saveProposalsToFile(): Promise<void> {
    try {
      const filePath = path.join(this.RESULTS_DIR, 'proposals.json')
      await fs.writeFile(filePath, JSON.stringify(this.proposals, null, 2))
    } catch (error) {
      console.error('提案保存エラー:', error)
    }
  }

  /**
   * メトリクスをファイルに保存
   */
  private async saveMetricsToFile(): Promise<void> {
    try {
      const filePath = path.join(this.RESULTS_DIR, 'metrics.json')
      await fs.writeFile(filePath, JSON.stringify(this.metrics, null, 2))
    } catch (error) {
      console.error('メトリクス保存エラー:', error)
    }
  }

  /**
   * ファイルからデータを読み込み
   */
  async loadDataFromFile(): Promise<void> {
    try {
      const filePath = path.join(this.PROCESSED_DIR, 'employees.json')
      const fileContent = await fs.readFile(filePath, 'utf-8')
      this.data = JSON.parse(fileContent)
    } catch (error) {
      // ファイルが存在しない場合は無視
      console.log('保存されたデータファイルが見つかりません')
    }
  }

  /**
   * ファイルから提案を読み込み
   */
  async loadProposalsFromFile(): Promise<void> {
    try {
      const filePath = path.join(this.RESULTS_DIR, 'proposals.json')
      const fileContent = await fs.readFile(filePath, 'utf-8')
      this.proposals = JSON.parse(fileContent)
    } catch (error) {
      // ファイルが存在しない場合は無視
      console.log('保存された提案ファイルが見つかりません')
    }
  }

  /**
   * ファイルからメトリクスを読み込み
   */
  async loadMetricsFromFile(): Promise<void> {
    try {
      const filePath = path.join(this.RESULTS_DIR, 'metrics.json')
      const fileContent = await fs.readFile(filePath, 'utf-8')
      this.metrics = JSON.parse(fileContent)
    } catch (error) {
      // ファイルが存在しない場合は無視
      console.log('保存されたメトリクスファイルが見つかりません')
    }
  }

  /**
   * 全データを初期化時に読み込み
   */
  async initialize(): Promise<void> {
    if (process.env.NODE_ENV !== 'production') {
      await this.ensureDirectories()
      await this.loadDataFromFile()
      await this.loadProposalsFromFile()
      await this.loadMetricsFromFile()
    }
    // 本番環境では何もしない（メモリ内のみ）
  }
}

// シングルトンインスタンス
const dataStore = new DataStore()

export default dataStore
