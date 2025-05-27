import dataStore from '@/lib/data-store'
import { generateSampleData, parseExcelFile } from '@/lib/excel-parser'
import { NextRequest, NextResponse } from 'next/server'
import path from 'path'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { filePath, useSampleData } = body

    let processedData

    if (useSampleData) {
      // サンプルデータを使用
      processedData = generateSampleData()
    } else {
      // 実際のExcelファイルを読み込み
      if (!filePath) {
        return NextResponse.json(
          { error: 'ファイルパスが指定されていません' },
          { status: 400 }
        )
      }

      // セキュリティ: ファイルパスの検証
      const fullPath = path.resolve(filePath)
      const dataDir = path.resolve(process.cwd(), 'data', 'excel')

      if (!fullPath.startsWith(dataDir)) {
        return NextResponse.json(
          { error: '指定されたファイルパスは許可されていません' },
          { status: 403 }
        )
      }

      processedData = await parseExcelFile(fullPath)
    }

    // データストアに保存
    dataStore.setData(processedData)

    return NextResponse.json({
      success: true,
      data: processedData,
      message: useSampleData
        ? 'サンプルデータを読み込みました'
        : 'Excelファイルを正常に読み込みました',
    })
  } catch (error) {
    console.error('Excel読み込みエラー:', error)

    return NextResponse.json(
      {
        error: 'ファイルの読み込みに失敗しました',
        details: error instanceof Error ? error.message : '不明なエラー',
      },
      { status: 500 }
    )
  }
}

export async function GET() {
  try {
    // 利用可能なExcelファイルのリストを返す
    const { promises: fs } = await import('fs')
    const excelDir = path.join(process.cwd(), 'data', 'excel')

    try {
      const files = await fs.readdir(excelDir)
      const excelFiles = files.filter(
        (file) => file.endsWith('.xlsx') || file.endsWith('.xls')
      )

      return NextResponse.json({
        success: true,
        files: excelFiles,
        sampleDataAvailable: true,
      })
    } catch (dirError) {
      // ディレクトリが存在しない場合
      return NextResponse.json({
        success: true,
        files: [],
        sampleDataAvailable: true,
        message:
          'Excelディレクトリが見つかりません。サンプルデータをご利用ください。',
      })
    }
  } catch (error) {
    console.error('ファイルリスト取得エラー:', error)

    return NextResponse.json(
      { error: 'ファイルリストの取得に失敗しました' },
      { status: 500 }
    )
  }
}
