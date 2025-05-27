'use client'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Department, Employee } from '@/types/employee'
import { Building2, Search, User, Users } from 'lucide-react'
import { useEffect, useState } from 'react'

interface DataTableProps {
  employees: Employee[]
  departments: Department[]
  onEmployeeSelect?: (employee: Employee) => void
}

export default function DataTable({
  employees,
  departments,
  onEmployeeSelect,
}: DataTableProps) {
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedDepartment, setSelectedDepartment] = useState<string>('')
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string | null>(
    null
  )

  // 選択された従業員オブジェクトを取得
  const selectedEmployee = selectedEmployeeId
    ? employees.find((emp) => emp.id === selectedEmployeeId)
    : null

  // フィルタリング
  const filteredEmployees = employees.filter((employee) => {
    const matchesSearch =
      employee.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      employee.department.toLowerCase().includes(searchTerm.toLowerCase()) ||
      employee.position.toLowerCase().includes(searchTerm.toLowerCase()) ||
      employee.skills.some((skill) =>
        skill.toLowerCase().includes(searchTerm.toLowerCase())
      )

    const matchesDepartment =
      selectedDepartment === '' || employee.department === selectedDepartment

    return matchesSearch && matchesDepartment
  })

  // 選択された従業員がフィルタリング結果に含まれない場合、選択をクリア
  useEffect(() => {
    if (
      selectedEmployeeId &&
      !filteredEmployees.some((emp) => emp.id === selectedEmployeeId)
    ) {
      setSelectedEmployeeId(null)
    }
  }, [filteredEmployees, selectedEmployeeId])

  const handleEmployeeClick = (employee: Employee) => {
    setSelectedEmployeeId(employee.id)
    onEmployeeSelect?.(employee)
  }

  return (
    <div className='space-y-6'>
      {/* 統計情報 */}
      <div className='grid grid-cols-1 md:grid-cols-3 gap-4'>
        <Card>
          <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
            <CardTitle className='text-sm font-medium'>総従業員数</CardTitle>
            <Users className='h-4 w-4 text-muted-foreground' />
          </CardHeader>
          <CardContent>
            <div className='text-2xl font-bold'>{employees.length}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
            <CardTitle className='text-sm font-medium'>部署数</CardTitle>
            <Building2 className='h-4 w-4 text-muted-foreground' />
          </CardHeader>
          <CardContent>
            <div className='text-2xl font-bold'>{departments.length}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
            <CardTitle className='text-sm font-medium'>表示中</CardTitle>
            <User className='h-4 w-4 text-muted-foreground' />
          </CardHeader>
          <CardContent>
            <div className='text-2xl font-bold'>{filteredEmployees.length}</div>
          </CardContent>
        </Card>
      </div>

      {/* フィルター */}
      <Card>
        <CardHeader>
          <CardTitle>フィルター</CardTitle>
          <CardDescription>
            従業員データを検索・絞り込みできます
          </CardDescription>
        </CardHeader>
        <CardContent className='space-y-4'>
          <div className='flex flex-col sm:flex-row gap-4'>
            <div className='relative flex-1'>
              <Search className='absolute left-3 top-3 h-4 w-4 text-muted-foreground' />
              <Input
                placeholder='名前、部署、役職、スキルで検索...'
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className='pl-10'
              />
            </div>
            <select
              value={selectedDepartment}
              onChange={(e) => setSelectedDepartment(e.target.value)}
              className='px-3 py-2 border border-input bg-background rounded-md text-sm'>
              <option value=''>全部署</option>
              {departments.map((dept) => (
                <option key={dept.name} value={dept.name}>
                  {dept.name} ({dept.currentMembers.length}人)
                </option>
              ))}
            </select>
          </div>
          {selectedEmployee &&
            !filteredEmployees.some(
              (emp) => emp.id === selectedEmployee.id
            ) && (
              <div className='text-sm text-amber-600 bg-amber-50 p-2 rounded'>
                選択中の従業員「{selectedEmployee.name}
                」は現在のフィルター条件に該当しません
              </div>
            )}
        </CardContent>
      </Card>

      {/* 従業員リスト */}
      <div className='grid grid-cols-1 lg:grid-cols-2 gap-6'>
        {/* 従業員カード一覧 */}
        <div className='space-y-4'>
          <h3 className='text-lg font-semibold'>
            従業員一覧 ({filteredEmployees.length}人)
          </h3>
          <div className='space-y-3 max-h-96 overflow-y-auto p-1'>
            {filteredEmployees.map((employee) => (
              <Card
                key={employee.id}
                className={`cursor-pointer transition-all duration-200 hover:bg-muted/50 hover:shadow-md m-1 ${
                  selectedEmployeeId === employee.id
                    ? 'ring-2 ring-primary bg-primary/5 border-2 border-primary shadow-lg'
                    : 'hover:ring-1 hover:ring-muted-foreground/20 border border-border'
                }`}
                onClick={() => handleEmployeeClick(employee)}>
                <CardContent className='p-4'>
                  <div className='flex justify-between items-start mb-2'>
                    <div>
                      <h4 className='font-medium'>{employee.name}</h4>
                      <p className='text-sm text-muted-foreground'>
                        {employee.position}
                      </p>
                    </div>
                    <Badge variant='secondary'>{employee.department}</Badge>
                  </div>
                  <div className='flex flex-wrap gap-1 mt-2'>
                    {employee.skills.slice(0, 3).map((skill) => (
                      <Badge key={skill} variant='outline' className='text-xs'>
                        {skill}
                      </Badge>
                    ))}
                    {employee.skills.length > 3 && (
                      <Badge variant='outline' className='text-xs'>
                        +{employee.skills.length - 3}
                      </Badge>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
            {filteredEmployees.length === 0 && (
              <Card>
                <CardContent className='p-8 text-center'>
                  <Search className='h-12 w-12 text-muted-foreground mx-auto mb-4' />
                  <p className='text-muted-foreground'>
                    検索条件に該当する従業員が見つかりません
                  </p>
                </CardContent>
              </Card>
            )}
          </div>
        </div>

        {/* 詳細表示 */}
        <div>
          <h3 className='text-lg font-semibold mb-4'>詳細情報</h3>
          {selectedEmployee ? (
            <Card className='sticky top-4'>
              <CardHeader>
                <CardTitle className='flex items-center justify-between'>
                  {selectedEmployee.name}
                  <Badge>{selectedEmployee.department}</Badge>
                </CardTitle>
                <CardDescription>{selectedEmployee.position}</CardDescription>
              </CardHeader>
              <CardContent className='space-y-4'>
                <div>
                  <h5 className='font-medium mb-2'>性格・特徴</h5>
                  <p className='text-sm text-muted-foreground'>
                    {selectedEmployee.personality || '情報なし'}
                  </p>
                </div>

                <div>
                  <h5 className='font-medium mb-2'>経歴・経験</h5>
                  <p className='text-sm text-muted-foreground'>
                    {selectedEmployee.experience || '情報なし'}
                  </p>
                </div>

                <div>
                  <h5 className='font-medium mb-2'>希望・目標</h5>
                  <p className='text-sm text-muted-foreground'>
                    {selectedEmployee.aspirations || '情報なし'}
                  </p>
                </div>

                <div>
                  <h5 className='font-medium mb-2'>スキル</h5>
                  <div className='flex flex-wrap gap-2'>
                    {selectedEmployee.skills.map((skill) => (
                      <Badge key={skill} variant='secondary'>
                        {skill}
                      </Badge>
                    ))}
                  </div>
                </div>

                <div className='pt-4 border-t'>
                  <Button
                    variant='outline'
                    size='sm'
                    onClick={() => setSelectedEmployeeId(null)}
                    className='w-full'>
                    選択解除
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className='p-8 text-center'>
                <User className='h-12 w-12 text-muted-foreground mx-auto mb-4' />
                <p className='text-muted-foreground'>
                  従業員を選択すると詳細情報が表示されます
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* 部署情報 */}
      <Card>
        <CardHeader>
          <CardTitle>部署別統計</CardTitle>
          <CardDescription>各部署の人数とスキル分布</CardDescription>
        </CardHeader>
        <CardContent>
          <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4'>
            {departments.map((dept) => (
              <Card key={dept.name} className='p-4'>
                <h5 className='font-medium mb-2'>{dept.name}</h5>
                <p className='text-sm text-muted-foreground mb-3'>
                  {dept.currentMembers.length}人
                </p>
                <div className='space-y-2'>
                  <h6 className='text-xs font-medium text-muted-foreground'>
                    主要スキル
                  </h6>
                  <div className='flex flex-wrap gap-1'>
                    {dept.requiredSkills.slice(0, 4).map((skill) => (
                      <Badge key={skill} variant='outline' className='text-xs'>
                        {skill}
                      </Badge>
                    ))}
                    {dept.requiredSkills.length > 4 && (
                      <Badge variant='outline' className='text-xs'>
                        +{dept.requiredSkills.length - 4}
                      </Badge>
                    )}
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
