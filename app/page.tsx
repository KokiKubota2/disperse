'use client'

import AnalysisPanel from '@/components/AnalysisPanel'
import ChatInterface from '@/components/ChatInterface'
import DataTable from '@/components/DataTable'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Department, Employee, ProcessedData } from '@/types/employee'
import { TransferProposal } from '@/types/proposal'
import {
  BarChart3,
  Bot,
  Database,
  FileSpreadsheet,
  LogOut,
  Upload,
} from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'

const Home = () => {
  const router = useRouter()
  const [data, setData] = useState<ProcessedData | null>(null)
  const [employees, setEmployees] = useState<Employee[]>([])
  const [departments, setDepartments] = useState<Department[]>([])
  const [loading, setLoading] = useState(false)
  const [activeTab, setActiveTab] = useState('chat')

  // 初期データ読み込み
  useEffect(() => {
    loadExistingData()
  }, [])

  const loadExistingData = async () => {
    try {
      const response = await fetch('/api/data')
      const result = await response.json()

      if (result.success && result.data) {
        setData(result.data)
        setEmployees(result.employees)
        setDepartments(result.departments)
      }
    } catch (error) {
      console.error('データ読み込みエラー:', error)
    }
  }

  const handleLoadSampleData = async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/load-excel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ useSampleData: true }),
      })

      const result = await response.json()

      if (result.success) {
        setData(result.data)
        setEmployees(result.data.employees)
        setDepartments(result.data.departments)
        setActiveTab('data')
      } else {
        alert('データの読み込みに失敗しました: ' + result.error)
      }
    } catch (error) {
      console.error('サンプルデータ読み込みエラー:', error)
      alert('データの読み込みに失敗しました')
    } finally {
      setLoading(false)
    }
  }

  const handleClearData = async () => {
    if (!confirm('データをクリアしますか？')) return

    try {
      const response = await fetch('/api/data', { method: 'DELETE' })
      const result = await response.json()

      if (result.success) {
        setData(null)
        setEmployees([])
        setDepartments([])
        setActiveTab('chat')
      }
    } catch (error) {
      console.error('データクリアエラー:', error)
    }
  }

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' })
      router.push('/login')
      router.refresh()
    } catch (error) {
      console.error('Logout error:', error)
    }
  }

  return (
    <div className='min-h-screen bg-gray-50'>
      {/* ヘッダー */}
      <header className='bg-white border-b border-gray-200'>
        <div className='max-w-7xl mx-auto px-4 sm:px-6 lg:px-8'>
          <div className='flex justify-between items-center h-16'>
            <div className='flex items-center'>
              <Bot className='h-8 w-8 text-blue-600 mr-3' />
              <div>
                <h1 className='text-xl font-semibold text-gray-900'>
                  Disperse POC
                </h1>
                <p className='text-sm text-gray-500'>人事異動支援システム</p>
              </div>
            </div>
            <div className='flex items-center gap-4'>
              {data && (
                <Badge variant='secondary'>
                  {data.metadata.totalEmployees}人のデータ読み込み済み
                </Badge>
              )}
              <Button variant='outline' onClick={handleLogout}>
                <LogOut className='h-4 w-4 mr-2' />
                ログアウト
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* メインコンテンツ */}
      <main className='max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8'>
        <Tabs
          value={activeTab}
          onValueChange={setActiveTab}
          className='space-y-6'>
          <TabsList className='grid w-full grid-cols-3'>
            <TabsTrigger value='chat' className='flex items-center gap-2'>
              <Bot className='h-4 w-4' />
              AI チャット
            </TabsTrigger>
            <TabsTrigger value='data' className='flex items-center gap-2'>
              <Database className='h-4 w-4' />
              データ管理
            </TabsTrigger>
            <TabsTrigger value='analysis' className='flex items-center gap-2'>
              <BarChart3 className='h-4 w-4' />
              分析・提案
            </TabsTrigger>
          </TabsList>

          <TabsContent value='chat' className='space-y-6'>
            <div className='grid grid-cols-1 lg:grid-cols-3 gap-8'>
              {/* 左側: 機能カード */}
              <div className='lg:col-span-1 space-y-6'>
                <Card>
                  <CardHeader>
                    <CardTitle className='flex items-center gap-2'>
                      <FileSpreadsheet className='h-5 w-5' />
                      データ管理
                    </CardTitle>
                    <CardDescription>
                      従業員データの読み込みと管理
                    </CardDescription>
                  </CardHeader>
                  <CardContent className='space-y-3'>
                    <Button
                      className='w-full'
                      onClick={handleLoadSampleData}
                      disabled={loading}>
                      <Upload className='h-4 w-4 mr-2' />
                      {loading ? '読み込み中...' : 'サンプルデータ読み込み'}
                    </Button>
                    {data && (
                      <Button
                        variant='outline'
                        className='w-full'
                        onClick={handleClearData}>
                        データクリア
                      </Button>
                    )}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className='flex items-center gap-2'>
                      <BarChart3 className='h-5 w-5' />
                      分析・提案
                    </CardTitle>
                    <CardDescription>
                      AI による人事異動分析と提案
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Button
                      className='w-full'
                      disabled={!data}
                      onClick={() => {
                        if (data) {
                          setActiveTab('analysis')
                        }
                      }}>
                      異動提案生成
                      {!data && (
                        <span className='ml-2 text-xs bg-yellow-100 text-yellow-800 px-2 py-1 rounded'>
                          データが必要
                        </span>
                      )}
                    </Button>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>システム情報</CardTitle>
                  </CardHeader>
                  <CardContent className='space-y-2'>
                    <div className='flex justify-between text-sm'>
                      <span className='text-gray-600'>バージョン:</span>
                      <span className='font-mono'>POC v0.1.0</span>
                    </div>
                    <div className='flex justify-between text-sm'>
                      <span className='text-gray-600'>環境:</span>
                      <span className='font-mono'>開発</span>
                    </div>
                    <div className='flex justify-between text-sm'>
                      <span className='text-gray-600'>AI モデル:</span>
                      <span className='font-mono'>GPT-4o-mini</span>
                    </div>
                    {data && (
                      <>
                        <div className='flex justify-between text-sm'>
                          <span className='text-gray-600'>従業員数:</span>
                          <span className='font-mono'>
                            {data.metadata.totalEmployees}人
                          </span>
                        </div>
                        <div className='flex justify-between text-sm'>
                          <span className='text-gray-600'>部署数:</span>
                          <span className='font-mono'>
                            {data.metadata.totalDepartments}部署
                          </span>
                        </div>
                      </>
                    )}
                  </CardContent>
                </Card>
              </div>

              {/* 右側: チャットインターフェース */}
              <div className='lg:col-span-2 min-w-0 overflow-hidden'>
                <ChatInterface />
              </div>
            </div>
          </TabsContent>

          <TabsContent value='data' className='space-y-6'>
            {data ? (
              <DataTable
                employees={employees}
                departments={departments}
                onEmployeeSelect={(employee) => {
                  console.log('選択された従業員:', employee)
                }}
              />
            ) : (
              <Card>
                <CardContent className='p-8 text-center'>
                  <Database className='h-12 w-12 text-muted-foreground mx-auto mb-4' />
                  <h3 className='text-lg font-semibold mb-2'>
                    データが読み込まれていません
                  </h3>
                  <p className='text-muted-foreground mb-4'>
                    従業員データを表示するには、まずデータを読み込んでください。
                  </p>
                  <Button onClick={handleLoadSampleData} disabled={loading}>
                    <Upload className='h-4 w-4 mr-2' />
                    {loading ? '読み込み中...' : 'サンプルデータ読み込み'}
                  </Button>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value='analysis' className='space-y-6'>
            <AnalysisPanel
              employeeCount={employees.length}
              onAnalysisComplete={(proposals: TransferProposal[]) => {
                console.log('分析完了:', proposals)
              }}
            />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  )
}

export default Home
