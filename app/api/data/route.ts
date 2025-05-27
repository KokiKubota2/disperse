import dataStore from '@/lib/data-store'
import { NextRequest, NextResponse } from 'next/server'

export async function GET() {
  try {
    // データストアを初期化（ファイルから読み込み）
    await dataStore.initialize()

    const data = dataStore.getData()

    if (!data) {
      return NextResponse.json({
        success: false,
        message:
          'データが読み込まれていません。まずExcelファイルを読み込んでください。',
      })
    }

    return NextResponse.json({
      success: true,
      data,
      employees: dataStore.getEmployees(),
      departments: dataStore.getDepartments(),
    })
  } catch (error) {
    console.error('データ取得エラー:', error)

    return NextResponse.json(
      { error: 'データの取得に失敗しました' },
      { status: 500 }
    )
  }
}

export async function DELETE() {
  try {
    // データをクリア
    dataStore.clearData()

    return NextResponse.json({
      success: true,
      message: 'データを正常にクリアしました',
    })
  } catch (error) {
    console.error('データクリアエラー:', error)

    return NextResponse.json(
      { error: 'データのクリアに失敗しました' },
      { status: 500 }
    )
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const { action, employeeId, departmentName } = body

    switch (action) {
      case 'getEmployee':
        if (!employeeId) {
          return NextResponse.json(
            { error: '従業員IDが指定されていません' },
            { status: 400 }
          )
        }

        const employee = dataStore.getEmployee(employeeId)
        if (!employee) {
          return NextResponse.json(
            { error: '指定された従業員が見つかりません' },
            { status: 404 }
          )
        }

        return NextResponse.json({
          success: true,
          employee,
        })

      case 'getDepartment':
        if (!departmentName) {
          return NextResponse.json(
            { error: '部署名が指定されていません' },
            { status: 400 }
          )
        }

        const department = dataStore.getDepartment(departmentName)
        if (!department) {
          return NextResponse.json(
            { error: '指定された部署が見つかりません' },
            { status: 404 }
          )
        }

        return NextResponse.json({
          success: true,
          department,
        })

      default:
        return NextResponse.json(
          { error: '無効なアクションです' },
          { status: 400 }
        )
    }
  } catch (error) {
    console.error('データ操作エラー:', error)

    return NextResponse.json(
      { error: 'データ操作に失敗しました' },
      { status: 500 }
    )
  }
}
