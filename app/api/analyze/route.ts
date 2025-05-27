import { aiAnalyzer } from '@/lib/ai/analyzer'
import dataStore from '@/lib/data-store'
import { AnalysisRequest } from '@/types/proposal'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const body: AnalysisRequest = await request.json()

    // データストアを初期化
    await dataStore.initialize()

    // データストアから従業員と部署データを取得
    const employees = dataStore.getEmployees()
    const departments = dataStore.getDepartments()
    const data = dataStore.getData()

    console.log('データストア状況:', {
      hasData: !!data,
      employeeCount: employees.length,
      departmentCount: departments.length,
    })

    if (employees.length === 0) {
      return NextResponse.json(
        {
          error:
            'データが読み込まれていません。先にExcelファイルを読み込んでください。',
          debug: {
            hasData: !!data,
            employeeCount: employees.length,
            departmentCount: departments.length,
          },
        },
        { status: 400 }
      )
    }

    const startTime = Date.now()
    const tokenUsage = { prompt: 0, completion: 0, total: 0 }
    let errorCount = 0

    try {
      // maxEmployeesオプションが指定されている場合、従業員数を制限
      let targetEmployees = employees
      if (body.options?.maxEmployees && body.options.maxEmployees > 0) {
        targetEmployees = employees.slice(0, body.options.maxEmployees)
      }

      console.log('AI分析開始:', {
        totalEmployeeCount: employees.length,
        targetEmployeeCount: targetEmployees.length,
        departmentCount: departments.length,
        options: body.options,
      })

      // AI分析・提案を実行
      const proposals = await aiAnalyzer.generateTransferProposals(
        targetEmployees,
        departments,
        body
      )

      const totalProcessingTime = Date.now() - startTime

      console.log('AI分析完了:', {
        proposalCount: proposals.length,
        processingTime: totalProcessingTime,
      })

      // パフォーマンスメトリクスを生成
      const metrics = aiAnalyzer.generateMetrics(
        proposals,
        totalProcessingTime,
        tokenUsage,
        errorCount
      )

      // 結果をデータストアに保存
      dataStore.addProposals(proposals)
      dataStore.addMetrics(metrics)

      return NextResponse.json({
        success: true,
        proposals,
        metrics,
        message: `${proposals.length}件の異動提案を生成しました`,
      })
    } catch (error) {
      errorCount++
      console.error('AI分析エラー:', {
        error: error instanceof Error ? error.message : error,
        stack: error instanceof Error ? error.stack : undefined,
        employeeCount: employees.length,
        processingTime: Date.now() - startTime,
      })

      return NextResponse.json(
        {
          error:
            error instanceof Error
              ? error.message
              : 'AI分析中にエラーが発生しました',
          details: error instanceof Error ? error.stack : undefined,
          debug: {
            employeeCount: employees.length,
            departmentCount: departments.length,
            processingTime: Date.now() - startTime,
          },
        },
        { status: 500 }
      )
    }
  } catch (error) {
    console.error('API エラー:', error)
    return NextResponse.json(
      { error: 'リクエストの処理中にエラーが発生しました' },
      { status: 500 }
    )
  }
}

export async function GET() {
  try {
    // データストアを初期化
    await dataStore.initialize()

    // 保存された提案とメトリクスを取得
    const proposals = dataStore.getProposals()
    const metrics = dataStore.getMetrics()

    return NextResponse.json({
      proposals,
      metrics,
      hasData: proposals.length > 0,
    })
  } catch (error) {
    console.error('データ取得エラー:', error)
    return NextResponse.json(
      { error: 'データの取得中にエラーが発生しました' },
      { status: 500 }
    )
  }
}
