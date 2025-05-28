import {
  Department,
  Employee,
  ExcelRowData,
  ProcessedData,
} from '@/types/employee'
import * as XLSX from 'xlsx'

// Excel列名のマッピング（日本語対応）
const COLUMN_MAPPING = {
  id: ['社員ID', 'ID', 'employee_id', 'id'],
  name: ['氏名', '名前', 'name', '社員名'],
  department: ['部署', 'department', '所属部署', '部門'],
  position: ['役職', 'position', '職位', '役割'],
  personality: ['性格・特徴', '性格', 'personality', '特徴'],
  experience: ['経歴・スキル', '経歴', 'experience', 'スキル', 'skills'],
  aspirations: ['希望・目標', '希望', 'aspirations', '目標', 'goals'],
  relationships: [
    '人間関係',
    '人間関係・備考',
    'relationships',
    '備考',
    '特記事項',
    '注意事項',
  ],
}

/**
 * Excel列名を標準化されたフィールド名にマッピング
 */
function mapColumnName(columnName: string): string | null {
  const normalizedColumn = columnName.trim()

  for (const [field, variations] of Object.entries(COLUMN_MAPPING)) {
    if (
      variations.some((variation) =>
        normalizedColumn.toLowerCase().includes(variation.toLowerCase())
      )
    ) {
      return field
    }
  }

  return null
}

/**
 * スキル文字列を配列に変換
 */
function parseSkills(skillsText: string): string[] {
  if (!skillsText) return []

  // カンマ、セミコロン、改行で分割
  return skillsText
    .split(/[,;、\n]/)
    .map((skill) => skill.trim())
    .filter((skill) => skill.length > 0)
}

/**
 * Excel行データを従業員オブジェクトに変換
 */
function convertRowToEmployee(
  row: ExcelRowData,
  columnMapping: Record<string, string>
): Employee | null {
  try {
    const id = row[columnMapping.id]?.toString()
    const name = row[columnMapping.name]?.toString()
    const department = row[columnMapping.department]?.toString()
    const position = row[columnMapping.position]?.toString()

    // 必須フィールドのチェック
    if (!id || !name || !department) {
      console.warn('必須フィールドが不足しています:', { id, name, department })
      return null
    }

    const personality = row[columnMapping.personality]?.toString() || ''
    const experience = row[columnMapping.experience]?.toString() || ''
    const aspirations = row[columnMapping.aspirations]?.toString() || ''
    const relationships = row[columnMapping.relationships]?.toString() || ''

    const skills = parseSkills(experience)

    return {
      id,
      name,
      department,
      position: position || '',
      personality,
      experience,
      aspirations,
      relationships,
      skills,
      rawData: { ...row },
    }
  } catch (error) {
    console.error('行データの変換エラー:', error)
    return null
  }
}

/**
 * 従業員データから部署情報を抽出
 */
function extractDepartments(employees: Employee[]): Department[] {
  const departmentMap = new Map<string, Department>()

  employees.forEach((employee) => {
    if (!departmentMap.has(employee.department)) {
      departmentMap.set(employee.department, {
        name: employee.department,
        description: `${employee.department}部門`,
        requiredSkills: [],
        currentMembers: [],
      })
    }

    const dept = departmentMap.get(employee.department)!
    dept.currentMembers.push(employee.id)

    // スキルを部署の必要スキルに追加（重複除去）
    employee.skills.forEach((skill) => {
      if (!dept.requiredSkills.includes(skill)) {
        dept.requiredSkills.push(skill)
      }
    })
  })

  return Array.from(departmentMap.values())
}

/**
 * Excelファイルを解析して従業員データを抽出
 */
export async function parseExcelFile(filePath: string): Promise<ProcessedData> {
  try {
    // ファイル読み込み
    const workbook = XLSX.readFile(filePath)
    const sheetName = workbook.SheetNames[0]
    const worksheet = workbook.Sheets[sheetName]

    // JSONに変換
    const rawData: ExcelRowData[] = XLSX.utils.sheet_to_json(worksheet)

    if (rawData.length === 0) {
      throw new Error('Excelファイルにデータが見つかりません')
    }

    // 列名マッピングを作成
    const headers = Object.keys(rawData[0])
    const columnMapping: Record<string, string> = {}

    headers.forEach((header) => {
      const mappedField = mapColumnName(header)
      if (mappedField) {
        columnMapping[mappedField] = header
      }
    })

    // 必須列の確認
    const requiredFields = ['id', 'name', 'department']
    const missingFields = requiredFields.filter(
      (field) => !columnMapping[field]
    )

    if (missingFields.length > 0) {
      throw new Error(`必須列が見つかりません: ${missingFields.join(', ')}`)
    }

    // 従業員データに変換
    const employees: Employee[] = rawData
      .map((row) => convertRowToEmployee(row, columnMapping))
      .filter((employee): employee is Employee => employee !== null)

    if (employees.length === 0) {
      throw new Error('有効な従業員データが見つかりません')
    }

    // 部署データを抽出
    const departments = extractDepartments(employees)

    return {
      employees,
      departments,
      metadata: {
        totalEmployees: employees.length,
        totalDepartments: departments.length,
        processedAt: new Date(),
        sourceFile: filePath,
      },
    }
  } catch (error) {
    console.error('Excel解析エラー:', error)
    throw new Error(
      `Excelファイルの解析に失敗しました: ${
        error instanceof Error ? error.message : '不明なエラー'
      }`
    )
  }
}

/**
 * サンプルExcelデータを生成（テスト用）- 50人版
 */
export function generateSampleData(): ProcessedData {
  // 部署リスト
  const departments = [
    '営業部',
    '開発部',
    '人事部',
    'マーケティング部',
    '経理部',
    '総務部',
    '企画部',
    'システム部',
    '品質管理部',
    '法務部',
  ]

  // 役職リスト
  const positions = [
    '部長',
    '課長',
    '係長',
    '主任',
    'リーダー',
    'SE',
    'PG',
    'マネージャー',
    'スペシャリスト',
    'アナリスト',
    'コンサルタント',
    'エンジニア',
    'デザイナー',
    'プランナー',
    '一般職',
  ]

  // スキルリスト
  const skillSets: Record<string, string[]> = {
    営業部: [
      '営業',
      '顧客対応',
      'プレゼンテーション',
      '交渉',
      'Excel',
      'PowerPoint',
      'Salesforce',
    ],
    開発部: [
      'Java',
      'Python',
      'JavaScript',
      'React',
      'Node.js',
      'SQL',
      'Git',
      'AWS',
      'Docker',
    ],
    人事部: [
      '人事業務',
      '労務管理',
      '採用業務',
      '研修企画',
      'Excel',
      '人事制度設計',
      '給与計算',
    ],
    マーケティング部: [
      'マーケティング',
      'SNS運用',
      'データ分析',
      'Google Analytics',
      'Adobe Creative',
      'SEO',
    ],
    経理部: [
      '簿記',
      '財務分析',
      '税務',
      'Excel',
      '会計ソフト',
      '予算管理',
      '監査対応',
    ],
    総務部: [
      '総務業務',
      '庶務',
      '施設管理',
      '契約管理',
      'Excel',
      '法務知識',
      'リスク管理',
    ],
    企画部: [
      '企画立案',
      '事業計画',
      '市場調査',
      'PowerPoint',
      'データ分析',
      'プロジェクト管理',
    ],
    システム部: [
      'インフラ',
      'ネットワーク',
      'セキュリティ',
      'Linux',
      'Windows Server',
      'クラウド',
    ],
    品質管理部: [
      '品質管理',
      'ISO',
      '検査業務',
      '改善活動',
      'データ分析',
      '統計解析',
    ],
    法務部: [
      '法務',
      '契約書作成',
      'コンプライアンス',
      '知的財産',
      'リーガルチェック',
      '訴訟対応',
    ],
  }

  // 性格パターン
  const personalities = [
    '積極的で人とのコミュニケーションが得意。新しいことに挑戦する意欲が高い。',
    '慎重で分析的。品質にこだわりを持つ。チームワークを重視する。',
    '人の話をよく聞く。調整能力が高い。安定志向。',
    'リーダーシップがあり、チームをまとめるのが得意。責任感が強い。',
    '創造性豊かで、新しいアイデアを生み出すのが得意。柔軟な思考を持つ。',
    '論理的思考が得意。問題解決能力が高い。効率を重視する。',
    '協調性があり、周囲との関係構築が上手。サポート精神旺盛。',
    '専門性を追求する姿勢。技術的な探究心が強い。',
    '顧客志向で、相手の立場に立って考えることができる。',
    '計画性があり、スケジュール管理が得意。几帳面で信頼性が高い。',
  ]

  // 希望・目標パターン
  const aspirations = [
    '管理職を目指したい。新しい技術分野にも興味がある。',
    '新しい技術を学び、アーキテクトを目指したい。',
    '人事制度の改善に取り組みたい。',
    'マーケティング戦略の企画・実行に携わりたい。',
    '財務分析のスペシャリストになりたい。',
    '組織運営の効率化に貢献したい。',
    '新規事業の企画・立ち上げに関わりたい。',
    'ITインフラの最適化とセキュリティ強化に取り組みたい。',
    '品質向上と業務改善のプロフェッショナルになりたい。',
    'コンプライアンス体制の強化に貢献したい。',
    'チームリーダーとしてメンバーの成長をサポートしたい。',
    '海外展開プロジェクトに参加したい。',
    'データサイエンスの知識を活かした分析業務に従事したい。',
    '顧客満足度向上のための施策を企画・実行したい。',
    '新しい分野でのキャリアチェンジを検討している。',
  ]

  // 人間関係パターン（冗談的な内容を含む）
  const relationshipPatterns = [
    '', // 空白（特に問題なし）
    '',
    '',
    '',
    '', // 大部分は空白にする
    '田中太郎さんとは過去に揉めたことがあるので、同じ部署は不可能です。',
    '佐藤花子さんとは過去に交際関係にあったので、同じ部署は避けてください。',
    '山田一郎さんとは犬猿の仲です。会議でも意見が対立しがちです。',
    '鈴木美咲さんとは元同僚で、お互いライバル意識が強すぎます。',
    '高橋健太さんとはランチの好みが合わず、毎日口論になります。',
    '渡辺由美さんとは音楽の趣味が正反対で、休憩時間が気まずいです。',
    '伊藤大輔さんとは野球チームが違うので、シーズン中は険悪になります。',
    '中村恵子さんとはコーヒーの淹れ方で大喧嘩したことがあります。',
    '小林翔太さんとは駐車場の件で揉めて以来、気まずい関係です。',
    '加藤真理さんとは元カップルで、周りが気を使ってしまいます。',
    '吉田拓也さんとは学生時代からの腐れ縁で、仕事に集中できません。',
    '松本智子さんとはお弁当の匂いで毎回文句を言われます。',
    '井上雄一さんとは政治の話で大激論になったことがあります。',
    '木村裕子さんとは元上司と部下の関係で、今でも敬語が抜けません。',
    '林慎一さんとはゲームの対戦で負けて以来、恨まれています。',
  ]

  // 名前リスト（姓）
  const surnames = [
    '田中',
    '佐藤',
    '鈴木',
    '高橋',
    '渡辺',
    '伊藤',
    '山本',
    '中村',
    '小林',
    '加藤',
    '吉田',
    '山田',
    '松本',
    '井上',
    '木村',
    '林',
    '清水',
    '山崎',
    '森',
    '池田',
    '橋本',
    '石川',
    '前田',
    '藤田',
    '後藤',
    '岡田',
    '長谷川',
    '村上',
    '近藤',
    '石井',
    '斎藤',
    '坂本',
    '遠藤',
    '青木',
    '藤井',
    '西村',
    '福田',
    '太田',
    '三浦',
    '岡本',
    '松田',
    '中島',
    '金子',
    '藤原',
    '原田',
    '小川',
    '中川',
    '野村',
    '竹内',
    '船橋',
  ]

  // 名前リスト（名）
  const givenNames = [
    '太郎',
    '花子',
    '一郎',
    '美咲',
    '健太',
    '由美',
    '大輔',
    '恵子',
    '翔太',
    '真理',
    '拓也',
    '智子',
    '雄一',
    '裕子',
    '慎一',
    '直美',
    '和也',
    '明美',
    '浩二',
    '久美子',
    '正人',
    '洋子',
    '秀樹',
    '典子',
    '博之',
    '幸子',
    '隆',
    '文子',
    '誠',
    '節子',
    '修',
    '悦子',
    '勇',
    '和子',
    '進',
    '敏子',
    '豊',
    '良子',
    '実',
    '春子',
    '清',
    '夏子',
    '昇',
    '秋子',
    '昭',
    '冬子',
    '光',
    '桜子',
    '望',
    '梅子',
  ]

  const employees: Employee[] = []

  for (let i = 1; i <= 50; i++) {
    const department =
      departments[Math.floor(Math.random() * departments.length)]
    const position = positions[Math.floor(Math.random() * positions.length)]
    const surname = surnames[Math.floor(Math.random() * surnames.length)]
    const givenName = givenNames[Math.floor(Math.random() * givenNames.length)]
    const name = `${surname}${givenName}`

    // 部署に応じたスキルを選択
    const departmentSkills = skillSets[department] || [
      'Excel',
      'PowerPoint',
      'Word',
    ]
    const numSkills = Math.floor(Math.random() * 4) + 2 // 2-5個のスキル
    const selectedSkills = departmentSkills
      .sort(() => 0.5 - Math.random())
      .slice(0, numSkills)

    const personality =
      personalities[Math.floor(Math.random() * personalities.length)]
    const aspiration =
      aspirations[Math.floor(Math.random() * aspirations.length)]

    // 経験年数を生成（1-15年）
    const experienceYears = Math.floor(Math.random() * 15) + 1
    const experience = `${selectedSkills.join(
      ', '
    )}, ${department}経験${experienceYears}年`

    // 人間関係をランダムに選択
    const relationship =
      relationshipPatterns[
        Math.floor(Math.random() * relationshipPatterns.length)
      ]

    employees.push({
      id: `E${String(i).padStart(3, '0')}`,
      name,
      department,
      position,
      personality,
      experience,
      aspirations: aspiration,
      relationships: relationship,
      skills: selectedSkills,
      rawData: {},
    })
  }

  const departmentData = extractDepartments(employees)

  return {
    employees,
    departments: departmentData,
    metadata: {
      totalEmployees: employees.length,
      totalDepartments: departmentData.length,
      processedAt: new Date(),
      sourceFile: 'sample_data_50_employees',
    },
  }
}
