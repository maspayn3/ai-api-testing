import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import axios from 'axios'

interface TestResult {
  id: string
  name: string
  status: 'passed' | 'failed' | 'running'
  duration: number
  timestamp: string
}

export function Dashboard() {
  const [selectedTest, setSelectedTest] = useState<string | null>(null)

  const { data: testResults, isLoading } = useQuery({
    queryKey: ['testResults'],
    queryFn: async () => {
      const { data } = await axios.get<TestResult[]>('/api/tests')
      return data
    },
  })

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="bg-white shadow rounded-lg p-6">
        <h2 className="text-lg font-medium text-gray-900 mb-4">Test Results</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Placeholder for test results */}
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <h3 className="font-medium text-green-800">Passed Tests</h3>
            <p className="text-2xl font-bold text-green-600">0</p>
          </div>
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <h3 className="font-medium text-red-800">Failed Tests</h3>
            <p className="text-2xl font-bold text-red-600">0</p>
          </div>
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h3 className="font-medium text-blue-800">Running Tests</h3>
            <p className="text-2xl font-bold text-blue-600">0</p>
          </div>
        </div>
      </div>

      <div className="bg-white shadow rounded-lg p-6">
        <h2 className="text-lg font-medium text-gray-900 mb-4">Recent Tests</h2>
        {/* Test list will go here */}
      </div>
    </div>
  )
}