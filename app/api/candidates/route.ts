import { aiAnalyzer } from '@/lib/ai/analyzer'
import dataStore from '@/lib/data-store'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { action, condition, candidates, userFeedback } = body

    // データストアを初期化
    await dataStore.initialize()

    // データストアから従業員と部署データを取得
    const employees = dataStore.getEmployees()
    const departments = dataStore.getDepartments()

    if (employees.length === 0) {
      return NextResponse.json(
        {
          error:
            'データが読み込まれていません。先にExcelファイルを読み込んでください。',
        },
        { status: 400 }
      )
    }

    switch (action) {
      case 'search': {
        // 初回候補者検索
        const result = await aiAnalyzer.findCandidatesWithCondition(
          employees,
          departments,
          condition
        )

        return NextResponse.json({
          success: true,
          candidates: result.candidates,
          reasoning: result.reasoning,
          suggestions: result.suggestions,
          clarificationQuestions: result.clarificationQuestions,
        })
      }

      case 'refine': {
        // 候補者絞り込み
        const candidateEmployees = employees.filter((emp) =>
          candidates.includes(emp.id)
        )

        const result = await aiAnalyzer.refineCandidate(
          candidateEmployees,
          condition,
          userFeedback
        )

        return NextResponse.json({
          success: true,
          refinedCandidates: result.refinedCandidates,
          reasoning: result.reasoning,
          nextQuestions: result.nextQuestions,
        })
      }

      case 'generateProposals': {
        // 異動提案生成
        const candidateEmployees = employees.filter((emp) =>
          candidates.includes(emp.id)
        )

        console.log(
          `対話形式候補者選出: ${candidateEmployees.length}名の候補者に対して異動提案を生成`
        )

        // 対象部署を条件から抽出
        const targetDepartment = extractTargetDepartment(condition, departments)

        let proposals
        if (targetDepartment) {
          // 特定部署への異動提案を生成
          proposals = await aiAnalyzer.generateTargetedTransferProposals(
            candidateEmployees,
            targetDepartment,
            condition
          )
        } else {
          // 人間関係を考慮した異動提案を生成
          proposals =
            await aiAnalyzer.generateTransferProposalsWithRelationships(
              candidateEmployees,
              departments,
              {
                // naturalLanguageConditionは渡さない（再フィルタリングを防ぐため）
                options: {
                  includeReasons: true,
                  confidenceThreshold: 0.6,
                },
              }
            )
        }

        // 対話形式候補者選出では、既存の提案をクリアしてから新しい提案のみを保存
        dataStore.clearProposals()
        dataStore.addProposals(proposals)

        console.log(
          `対話形式候補者選出: ${proposals.length}件の異動提案を生成しました（人間関係制約考慮済み）`
        )

        return NextResponse.json({
          success: true,
          proposals,
        })
      }

      case 'generateProposalsWithoutRelationships': {
        // 従来の異動提案生成（人間関係制約なし）
        const candidateEmployees = employees.filter((emp) =>
          candidates.includes(emp.id)
        )

        console.log(
          `対話形式候補者選出: ${candidateEmployees.length}名の候補者に対して従来の異動提案を生成`
        )

        // 対象部署を条件から抽出
        const targetDepartment = extractTargetDepartment(condition, departments)

        let proposals
        if (targetDepartment) {
          // 特定部署への異動提案を生成
          proposals = await aiAnalyzer.generateTargetedTransferProposals(
            candidateEmployees,
            targetDepartment,
            condition
          )
        } else {
          // 通常の異動提案を生成（対話形式では候補者が既に選出済みなので再フィルタリングしない）
          proposals = await aiAnalyzer.generateTransferProposals(
            candidateEmployees,
            departments,
            {
              // naturalLanguageConditionは渡さない（再フィルタリングを防ぐため）
              options: {
                includeReasons: true,
                confidenceThreshold: 0.6,
              },
            }
          )
        }

        // 対話形式候補者選出では、既存の提案をクリアしてから新しい提案のみを保存
        dataStore.clearProposals()
        dataStore.addProposals(proposals)

        console.log(
          `対話形式候補者選出: ${proposals.length}件の従来の異動提案を生成しました`
        )

        return NextResponse.json({
          success: true,
          proposals,
        })
      }

      default:
        return NextResponse.json(
          { error: '無効なアクションです' },
          { status: 400 }
        )
    }
  } catch (error) {
    console.error('候補者選出API エラー:', error)
    return NextResponse.json(
      {
        error: `候補者選出中にエラーが発生しました: ${
          error instanceof Error ? error.message : '不明なエラー'
        }`,
      },
      { status: 500 }
    )
  }
}

function extractTargetDepartment(
  condition: string,
  departments: any[]
): string | null {
  const departmentNames = departments.map((d) => d.name)
  for (const deptName of departmentNames) {
    if (condition.includes(deptName)) {
      return deptName
    }
  }
  return null
}
