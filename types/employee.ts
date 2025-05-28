// 従業員データ型定義
export interface Employee {
  id: string
  name: string
  department: string
  position: string
  personality: string
  experience: string
  aspirations: string
  skills: string[]
  relationships: string // 人間関係についての自由記入欄
  // Excelから読み込んだ生データ
  rawData: Record<string, any>
}

// 部署データ型定義
export interface Department {
  name: string
  description: string
  requiredSkills: string[]
  currentMembers: string[] // employee IDs
}

// Excel読み込み時の生データ型
export interface ExcelRowData {
  [key: string]: string | number | undefined
}

// データ処理結果型
export interface ProcessedData {
  employees: Employee[]
  departments: Department[]
  metadata: {
    totalEmployees: number
    totalDepartments: number
    processedAt: Date
    sourceFile: string
  }
}
