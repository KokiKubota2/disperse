import { Department, Employee } from '@/types/employee'
import { PerformanceMetrics } from '@/types/metrics'
import { AnalysisRequest, TransferProposal } from '@/types/proposal'
import { openai } from './openai'

/**
 * 従業員の適性分析結果
 */
interface EmployeeAnalysis {
  employeeId: string
  personalityTraits: string[]
  skillCategories: string[]
  careerGoals: string[]
  strengths: string[]
  developmentAreas: string[]
  departmentFit: Record<string, number> // 部署名 -> 適合度スコア (0-1)
}

/**
 * 部署の要件分析結果
 */
interface DepartmentRequirements {
  departmentName: string
  requiredSkills: string[]
  preferredPersonality: string[]
  workStyle: string
  growthOpportunities: string[]
  challenges: string[]
}

/**
 * AI分析エンジンクラス
 */
export class AIAnalyzer {
  private readonly maxRetries = 3
  private readonly retryDelay = 1000

  /**
   * AIレスポンスからJSONを安全に抽出
   */
  private extractJSON(content: string): any {
    try {
      console.log('AI応答の生データ:', content)

      // マークダウンのコードブロックを除去
      let cleanContent = content
        .replace(/```json\n?/g, '')
        .replace(/```\n?/g, '')
        .trim()

      console.log('マークダウン除去後:', cleanContent)

      // JSONオブジェクトの開始と終了を見つける
      const startIndex = cleanContent.indexOf('{')
      const endIndex = cleanContent.lastIndexOf('}')

      if (startIndex === -1 || endIndex === -1 || startIndex >= endIndex) {
        console.error('JSONオブジェクトが見つからない:', {
          startIndex,
          endIndex,
          content: cleanContent,
        })
        throw new Error('有効なJSONオブジェクトが見つかりません')
      }

      cleanContent = cleanContent.substring(startIndex, endIndex + 1)
      console.log('抽出されたJSON文字列:', cleanContent)

      const parsed = JSON.parse(cleanContent)
      console.log('解析成功:', parsed)
      return parsed
    } catch (error) {
      console.error('JSON解析エラー詳細:', {
        error: error instanceof Error ? error.message : error,
        originalContent: content,
        contentLength: content.length,
        contentPreview: content.substring(0, 200) + '...',
      })
      throw new Error(
        `JSONの解析に失敗しました: ${
          error instanceof Error ? error.message : '不明なエラー'
        }`
      )
    }
  }

  /**
   * 従業員の詳細分析を実行（リトライ機能付き）
   */
  async analyzeEmployee(employee: Employee): Promise<EmployeeAnalysis> {
    const startTime = Date.now()
    let lastError: Error | null = null

    for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
      try {
        console.log(
          `従業員 ${employee.id} の分析開始 (試行 ${attempt}/${this.maxRetries})`
        )

        const prompt = this.buildEmployeeAnalysisPrompt(employee)

        const response = await Promise.race([
          openai.chat.completions.create({
            model: 'gpt-4o-mini',
            messages: [
              {
                role: 'system',
                content: `あなたは人事分析の専門家です。従業員の情報を分析して、性格特性、スキル、キャリア目標、強み、成長領域、各部署への適合度を評価してください。

【重要な指示】
1. 回答は必ず有効なJSONオブジェクトのみを返してください
2. マークダウンのコードブロック（\`\`\`json）は使用しないでください
3. 説明文や追加のテキストは一切含めないでください
4. JSONオブジェクトの前後に余分な文字を入れないでください

以下の正確なJSON形式で返してください：
{
  "personalityTraits": ["特性1", "特性2"],
  "skillCategories": ["カテゴリ1", "カテゴリ2"],
  "careerGoals": ["目標1", "目標2"],
  "strengths": ["強み1", "強み2"],
  "developmentAreas": ["成長領域1", "成長領域2"],
  "departmentFit": {
    "営業部": 0.8,
    "開発部": 0.6,
    "人事部": 0.4,
    "マーケティング部": 0.7,
    "経理部": 0.3,
    "総務部": 0.5,
    "企画部": 0.6,
    "システム部": 0.4,
    "品質管理部": 0.5,
    "法務部": 0.2
  }
}`,
              },
              {
                role: 'user',
                content: prompt,
              },
            ],
            temperature: 0.3,
            max_tokens: 1000,
          }),
          // 30秒タイムアウト
          new Promise<never>((_, reject) =>
            setTimeout(
              () => reject(new Error('API呼び出しがタイムアウトしました')),
              30000
            )
          ),
        ])

        const content = response.choices[0]?.message?.content
        if (!content) {
          throw new Error('AI分析の応答が空です')
        }

        const analysis = this.extractJSON(content)

        console.log(
          `従業員 ${employee.id} の分析完了 (${Date.now() - startTime}ms)`
        )

        return {
          employeeId: employee.id,
          ...analysis,
        }
      } catch (error) {
        lastError = error instanceof Error ? error : new Error('不明なエラー')
        console.error(
          `従業員分析エラー (${employee.id}) 試行 ${attempt}:`,
          lastError.message
        )

        if (attempt < this.maxRetries) {
          console.log(`${this.retryDelay}ms後にリトライします...`)
          await new Promise((resolve) => setTimeout(resolve, this.retryDelay))
        }
      }
    }

    throw new Error(
      `従業員 ${employee.name} の分析に失敗しました (${
        this.maxRetries
      }回試行): ${lastError?.message || '不明なエラー'}`
    )
  }

  /**
   * 部署の要件分析を実行
   */
  async analyzeDepartmentRequirements(
    department: Department,
    employees: Employee[]
  ): Promise<DepartmentRequirements> {
    try {
      const departmentEmployees = employees.filter(
        (emp) => emp.department === department.name
      )
      const prompt = this.buildDepartmentAnalysisPrompt(
        department,
        departmentEmployees
      )

      const response = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: `あなたは組織分析の専門家です。部署の情報と所属従業員の情報を分析して、その部署の要件と特徴を評価してください。

重要: 回答は必ず有効なJSONオブジェクトのみを返してください。マークダウンのコードブロック（\`\`\`json）や説明文は一切含めないでください。

以下のJSON形式で返してください：
{
  "requiredSkills": ["必要スキル1", "必要スキル2", ...],
  "preferredPersonality": ["好ましい性格1", "好ましい性格2", ...],
  "workStyle": "働き方の説明",
  "growthOpportunities": ["成長機会1", "成長機会2", ...],
  "challenges": ["課題1", "課題2", ...]
}`,
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        temperature: 0.3,
        max_tokens: 800,
      })

      const content = response.choices[0]?.message?.content
      if (!content) {
        throw new Error('部署分析の応答が空です')
      }

      const analysis = this.extractJSON(content)

      return {
        departmentName: department.name,
        ...analysis,
      }
    } catch (error) {
      console.error(`部署分析エラー (${department.name}):`, error)
      throw new Error(
        `部署 ${department.name} の分析に失敗しました: ${
          error instanceof Error ? error.message : '不明なエラー'
        }`
      )
    }
  }

  /**
   * 自然言語条件に基づいて候補者を検索・提案
   */
  async findCandidatesWithCondition(
    employees: Employee[],
    departments: Department[],
    condition: string
  ): Promise<{
    candidates: Employee[]
    reasoning: string
    suggestions: string[]
    clarificationQuestions?: string[]
  }> {
    try {
      const prompt = `
あなたは人事分析の専門家です。以下の条件に基づいて適切な候補者を選出し、詳細な分析を提供してください。

【条件】
${condition}

【従業員リスト】
${employees
  .map(
    (emp) => `
ID: ${emp.id}
名前: ${emp.name}
部署: ${emp.department}
役職: ${emp.position}
性格: ${emp.personality}
経験・スキル: ${emp.experience}
希望・目標: ${emp.aspirations}
保有スキル: ${emp.skills.join(', ')}
---`
  )
  .join('\n')}

【部署情報】
${departments
  .map(
    (dept) => `
部署名: ${dept.name}
説明: ${dept.description}
必要スキル: ${dept.requiredSkills.join(', ')}
現在のメンバー数: ${dept.currentMembers.length}名
---`
  )
  .join('\n')}

以下のJSON形式で回答してください：
{
  "selectedEmployeeIds": ["候補者のID1", "候補者のID2", ...],
  "reasoning": "候補者選出の詳細な理由（200文字程度）",
  "suggestions": ["追加の提案1", "追加の提案2", ...],
  "clarificationQuestions": ["確認したい質問1", "確認したい質問2", ...]
}

重要: 
- 条件を正確に解釈し、適切な候補者を選出してください
- 候補者が見つからない場合は空配列を返してください
- 条件が曖昧な場合は clarificationQuestions で確認事項を提示してください
- 回答は必ず有効なJSONオブジェクトのみを返してください
`

      const response = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content:
              'あなたは人事分析の専門家です。条件に基づいて適切な候補者を選出し、詳細な分析を提供してください。',
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        temperature: 0.2,
        max_tokens: 1500,
      })

      const content = response.choices[0]?.message?.content
      if (!content) {
        throw new Error('候補者検索の応答が空です')
      }

      const result = this.extractJSON(content)
      const selectedIds = result.selectedEmployeeIds || []
      const candidates = employees.filter((emp) => selectedIds.includes(emp.id))

      console.log(
        `条件「${condition}」により ${candidates.length}名の候補者を選出`
      )

      return {
        candidates,
        reasoning: result.reasoning || '候補者を選出しました。',
        suggestions: result.suggestions || [],
        clarificationQuestions: result.clarificationQuestions,
      }
    } catch (error) {
      console.error('候補者検索エラー:', error)
      throw new Error(
        `候補者の検索に失敗しました: ${
          error instanceof Error ? error.message : '不明なエラー'
        }`
      )
    }
  }

  /**
   * 自然言語条件に基づいて従業員をフィルタリング（後方互換性のため）
   */
  private async filterEmployeesByCondition(
    employees: Employee[],
    condition: string
  ): Promise<Employee[]> {
    try {
      const result = await this.findCandidatesWithCondition(
        employees,
        [], // 部署情報は簡易版では不要
        condition
      )
      return result.candidates
    } catch (error) {
      console.error('従業員フィルタリングエラー:', error)
      console.log('条件指定を無視して全従業員を対象とします')
      return employees
    }
  }

  /**
   * 異動提案を生成（従来の機能）
   */
  async generateTransferProposals(
    employees: Employee[],
    departments: Department[],
    options: AnalysisRequest = {}
  ): Promise<TransferProposal[]> {
    const startTime = Date.now()
    const proposals: TransferProposal[] = []
    let successCount = 0
    let errorCount = 0

    try {
      // 分析対象の従業員を決定
      let targetEmployees = options.employeeIds
        ? employees.filter((emp) => options.employeeIds!.includes(emp.id))
        : employees

      // 自然言語条件が指定されている場合、フィルタリングを実行
      if (
        options.naturalLanguageCondition &&
        options.naturalLanguageCondition.trim()
      ) {
        console.log(
          `自然言語条件でフィルタリング: "${options.naturalLanguageCondition}"`
        )
        targetEmployees = await this.filterEmployeesByCondition(
          targetEmployees,
          options.naturalLanguageCondition
        )
      }

      console.log(`異動提案生成開始: ${targetEmployees.length}名の従業員を分析`)

      // 各従業員の分析と提案生成
      for (let i = 0; i < targetEmployees.length; i++) {
        const employee = targetEmployees[i]
        const progressPercent = Math.round(
          ((i + 1) / targetEmployees.length) * 100
        )

        try {
          console.log(
            `[${i + 1}/${targetEmployees.length}] 従業員 ${employee.name} (${
              employee.id
            }) の分析開始`
          )

          const employeeAnalysis = await this.analyzeEmployee(employee)
          const proposal = await this.generateEmployeeTransferProposal(
            employee,
            employeeAnalysis,
            departments,
            options
          )

          if (proposal) {
            proposals.push(proposal)
            successCount++
            console.log(
              `✓ 従業員 ${employee.name} の提案生成完了 (進行: ${progressPercent}%)`
            )
          } else {
            console.log(
              `- 従業員 ${employee.name} は適切な異動先なし (進行: ${progressPercent}%)`
            )
          }
        } catch (error) {
          errorCount++
          console.error(
            `✗ 従業員 ${employee.name} (${employee.id}) の提案生成エラー:`,
            {
              error: error instanceof Error ? error.message : error,
              progress: `${i + 1}/${targetEmployees.length}`,
            }
          )
          // 個別のエラーは記録するが、全体の処理は続行
        }
      }

      const processingTime = Date.now() - startTime
      console.log(`異動提案生成完了:`, {
        totalEmployees: targetEmployees.length,
        successfulProposals: proposals.length,
        successCount,
        errorCount,
        processingTime: `${processingTime}ms`,
      })

      return proposals
    } catch (error) {
      console.error('異動提案生成エラー:', error)
      throw new Error(
        `異動提案の生成に失敗しました: ${
          error instanceof Error ? error.message : '不明なエラー'
        }`
      )
    }
  }

  /**
   * 個別従業員の異動提案を生成（従来の機能）
   */
  private async generateEmployeeTransferProposal(
    employee: Employee,
    analysis: EmployeeAnalysis,
    departments: Department[],
    options: AnalysisRequest
  ): Promise<TransferProposal | null> {
    const startTime = Date.now()

    try {
      // 現在の部署以外で適合度の高い部署を特定
      const currentDept = employee.department
      const candidateDepartments = Object.entries(analysis.departmentFit)
        .filter(([deptName, score]) => deptName !== currentDept && score > 0.6)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 3) // 上位3部署

      if (candidateDepartments.length === 0) {
        return null // 適切な異動先がない
      }

      const bestDepartment = candidateDepartments[0]
      const [targetDepartment, confidenceScore] = bestDepartment

      // 異動理由を生成
      const reasoning = await this.generateTransferReasoning(
        employee,
        analysis,
        currentDept,
        targetDepartment,
        options
      )

      const processingTime = Date.now() - startTime

      return {
        employeeId: employee.id,
        employeeName: employee.name,
        fromDepartment: currentDept,
        toDepartment: targetDepartment,
        confidenceScore: Math.round(confidenceScore * 100) / 100,
        reasoning,
        aiModel: 'openai',
        processingTime,
        timestamp: new Date(),
      }
    } catch (error) {
      console.error(`従業員 ${employee.id} の提案生成エラー:`, error)
      return null
    }
  }

  /**
   * 異動理由を生成（従来の機能）
   */
  private async generateTransferReasoning(
    employee: Employee,
    analysis: EmployeeAnalysis,
    fromDept: string,
    toDept: string,
    options: AnalysisRequest
  ): Promise<string> {
    if (!options.options?.includeReasons) {
      return `${employee.name}さんのスキルと適性を考慮した結果、${toDept}への異動が適切と判断されました。`
    }

    try {
      const prompt = `
従業員情報：
- 名前: ${employee.name}
- 現在の部署: ${fromDept}
- 役職: ${employee.position}
- 性格: ${employee.personality}
- 経験・スキル: ${employee.experience}
- 希望・目標: ${employee.aspirations}

分析結果：
- 強み: ${analysis.strengths.join(', ')}
- 成長領域: ${analysis.developmentAreas.join(', ')}
- キャリア目標: ${analysis.careerGoals.join(', ')}

提案: ${fromDept} → ${toDept}への異動

この異動提案の理由を、従業員の成長とキャリア目標の実現、組織への貢献の観点から200文字程度で説明してください。
`

      const response = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content:
              'あなたは人事コンサルタントです。従業員の異動理由を分かりやすく説明してください。',
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        temperature: 0.4,
        max_tokens: 300,
      })

      return (
        response.choices[0]?.message?.content ||
        `${employee.name}さんのスキルと適性を考慮した結果、${toDept}への異動が適切と判断されました。`
      )
    } catch (error) {
      console.error('異動理由生成エラー:', error)
      return `${employee.name}さんのスキルと適性を考慮した結果、${toDept}への異動が適切と判断されました。`
    }
  }

  /**
   * 特定の部署への異動提案を生成
   */
  async generateTargetedTransferProposals(
    candidates: Employee[],
    targetDepartment: string,
    condition: string,
    options: AnalysisRequest = {}
  ): Promise<TransferProposal[]> {
    const proposals: TransferProposal[] = []

    for (const employee of candidates) {
      try {
        // 現在の部署と同じ場合はスキップ
        if (employee.department === targetDepartment) {
          console.log(
            `${employee.name}は既に${targetDepartment}に所属しています`
          )
          continue
        }

        const employeeAnalysis = await this.analyzeEmployee(employee)

        // 対象部署への適合度を確認
        const targetFitScore =
          employeeAnalysis.departmentFit[targetDepartment] || 0

        // 異動理由を生成
        const reasoning = await this.generateTargetedTransferReasoning(
          employee,
          employeeAnalysis,
          targetDepartment,
          condition,
          options
        )

        const proposal: TransferProposal = {
          employeeId: employee.id,
          employeeName: employee.name,
          fromDepartment: employee.department,
          toDepartment: targetDepartment,
          confidenceScore: Math.max(targetFitScore, 0.6), // 最低0.6の信頼度
          reasoning,
          aiModel: 'openai',
          processingTime: 0,
          timestamp: new Date(),
        }

        proposals.push(proposal)
        console.log(`✓ ${employee.name}の${targetDepartment}への異動提案を生成`)
      } catch (error) {
        console.error(`${employee.name}の提案生成エラー:`, error)
      }
    }

    return proposals
  }

  /**
   * 対象部署への異動理由を生成
   */
  private async generateTargetedTransferReasoning(
    employee: Employee,
    analysis: EmployeeAnalysis,
    targetDepartment: string,
    condition: string,
    options: AnalysisRequest
  ): Promise<string> {
    try {
      const prompt = `
従業員情報：
- 名前: ${employee.name}
- 現在の部署: ${employee.department}
- 役職: ${employee.position}
- 性格: ${employee.personality}
- 経験・スキル: ${employee.experience}
- 希望・目標: ${employee.aspirations}
- 保有スキル: ${employee.skills.join(', ')}

分析結果：
- 強み: ${analysis.strengths.join(', ')}
- 成長領域: ${analysis.developmentAreas.join(', ')}
- キャリア目標: ${analysis.careerGoals.join(', ')}

異動条件: ${condition}
提案: ${employee.department} → ${targetDepartment}への異動

この異動提案の理由を、指定された条件と従業員の適性を踏まえて200文字程度で説明してください。
なぜこの従業員が条件に適合し、${targetDepartment}で活躍できるかを具体的に述べてください。
`

      const response = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content:
              'あなたは人事コンサルタントです。指定された条件に基づく異動理由を分かりやすく説明してください。',
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        temperature: 0.4,
        max_tokens: 300,
      })

      return (
        response.choices[0]?.message?.content ||
        `${employee.name}さんは指定された条件に適合し、${targetDepartment}での活躍が期待されます。`
      )
    } catch (error) {
      console.error('異動理由生成エラー:', error)
      return `${employee.name}さんは指定された条件に適合し、${targetDepartment}での活躍が期待されます。`
    }
  }

  /**
   * 対話形式での候補者絞り込み
   */
  async refineCandidate(
    candidates: Employee[],
    originalCondition: string,
    userFeedback: string
  ): Promise<{
    refinedCandidates: Employee[]
    reasoning: string
    nextQuestions?: string[]
  }> {
    try {
      const prompt = `
あなたは人事分析の専門家です。ユーザーのフィードバックに基づいて候補者を絞り込んでください。

【元の条件】
${originalCondition}

【現在の候補者】
${candidates
  .map(
    (emp) => `
ID: ${emp.id}
名前: ${emp.name}
部署: ${emp.department}
役職: ${emp.position}
性格: ${emp.personality}
経験・スキル: ${emp.experience}
希望・目標: ${emp.aspirations}
保有スキル: ${emp.skills.join(', ')}
---`
  )
  .join('\n')}

【ユーザーのフィードバック】
${userFeedback}

フィードバックを踏まえて候補者を絞り込み、以下のJSON形式で回答してください：
{
  "refinedEmployeeIds": ["絞り込み後の候補者ID1", "候補者ID2", ...],
  "reasoning": "絞り込みの理由（150文字程度）",
  "nextQuestions": ["さらに確認したい質問1", "質問2", ...]
}

重要: 回答は必ず有効なJSONオブジェクトのみを返してください。
`

      const response = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content:
              'あなたは人事分析の専門家です。ユーザーのフィードバックに基づいて適切に候補者を絞り込んでください。',
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        temperature: 0.2,
        max_tokens: 1000,
      })

      const content = response.choices[0]?.message?.content
      if (!content) {
        throw new Error('候補者絞り込みの応答が空です')
      }

      const result = this.extractJSON(content)
      const refinedIds = result.refinedEmployeeIds || []
      const refinedCandidates = candidates.filter((emp) =>
        refinedIds.includes(emp.id)
      )

      return {
        refinedCandidates,
        reasoning: result.reasoning || '候補者を絞り込みました。',
        nextQuestions: result.nextQuestions,
      }
    } catch (error) {
      console.error('候補者絞り込みエラー:', error)
      return {
        refinedCandidates: candidates,
        reasoning: 'フィードバックの処理中にエラーが発生しました。',
      }
    }
  }

  /**
   * 従業員分析用プロンプトを構築
   */
  private buildEmployeeAnalysisPrompt(employee: Employee): string {
    return `
以下の従業員情報を分析してください：

【基本情報】
- 名前: ${employee.name}
- 部署: ${employee.department}
- 役職: ${employee.position}

【性格・特徴】
${employee.personality}

【経歴・スキル】
${employee.experience}

【希望・目標】
${employee.aspirations}

【保有スキル】
${employee.skills.join(', ')}

この情報から、以下の部署への適合度を0-1のスコアで評価してください：
営業部, 開発部, 人事部, マーケティング部, 経理部, 総務部, 企画部, システム部, 品質管理部, 法務部
`
  }

  /**
   * 部署分析用プロンプトを構築
   */
  private buildDepartmentAnalysisPrompt(
    department: Department,
    employees: Employee[]
  ): string {
    const employeeProfiles = employees
      .map((emp) => `- ${emp.name} (${emp.position}): ${emp.skills.join(', ')}`)
      .join('\n')

    return `
以下の部署情報を分析してください：

【部署名】
${department.name}

【部署説明】
${department.description}

【現在の必要スキル】
${department.requiredSkills.join(', ')}

【所属メンバー】
${employeeProfiles}

この情報から、部署の特徴と要件を分析してください。
`
  }

  /**
   * パフォーマンスメトリクスを生成
   */
  generateMetrics(
    proposals: TransferProposal[],
    totalProcessingTime: number,
    tokenUsage: { prompt: number; completion: number; total: number },
    errors: number = 0
  ): PerformanceMetrics {
    const successfulProposals = proposals.length
    const totalAttempts = successfulProposals + errors
    const successRate =
      totalAttempts > 0 ? successfulProposals / totalAttempts : 0

    // OpenAI料金計算 (概算)
    const inputCostPer1K = 0.00015 // $0.00015 per 1K input tokens
    const outputCostPer1K = 0.0006 // $0.0006 per 1K output tokens
    const estimatedCost =
      (tokenUsage.prompt / 1000) * inputCostPer1K +
      (tokenUsage.completion / 1000) * outputCostPer1K

    return {
      aiAnalysis: {
        responseTime: totalProcessingTime,
        tokenUsage,
        cost: estimatedCost,
        successRate,
        errorCount: errors,
      },
      systemMetrics: {
        fileProcessingTime: 0, // AI分析では該当なし
        memoryUsage: process.memoryUsage().heapUsed / 1024 / 1024, // MB
        dataSize: proposals.length,
      },
      timestamp: new Date(),
      aiModel: 'openai',
    }
  }
}

// シングルトンインスタンス
export const aiAnalyzer = new AIAnalyzer()
