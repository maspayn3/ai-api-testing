import { useState } from 'react'
import { useQuery, useMutation } from '@tanstack/react-query'
import axios from 'axios'

interface TestCase {
  name: string
  endpoint: string
  method: string
  params: Record<string, any>
  expectedStatus: number
  assertions: string[]
}

interface TestResult {
  testCase: TestCase
  passed: boolean
  duration: number
  statusCode: number
  assertionResults: Array<{
    assertion: string
    passed: boolean
    error?: string
  }>
}

interface TestSuiteResult {
  id: string
  results: TestResult[]
  summary: {
    total: number
    passed: number
    failed: number
    duration: number
  }
}

export function Dashboard() {
  const [apiSpec, setApiSpec] = useState('')
  const [baseUrl, setBaseUrl] = useState('https://jsonplaceholder.typicode.com')
  const [testResults, setTestResults] = useState<TestSuiteResult | null>(null)

  // Sample API spec for quick testing
  const sampleApiSpec = {
    "openapi": "3.0.0",
    "info": {
      "title": "Sample API",
      "version": "1.0.0"
    },
    "paths": {
      "/posts": {
        "get": {
          "responses": {
            "200": {
              "description": "List of posts"
            }
          }
        }
      },
      "/posts/1": {
        "get": {
          "responses": {
            "200": {
              "description": "Single post"
            }
          }
        }
      }
    }
  }

  const generateTestsMutation = useMutation({
    mutationFn: async (spec: any) => {
      const { data } = await axios.post('/api/tests/generate', {
        apiSpec: spec
      })
      return data
    }
  })

  const runTestsMutation = useMutation({
    mutationFn: async ({ baseUrl, apiSpec }: { baseUrl: string, apiSpec: any }) => {
      const { data } = await axios.post('/api/tests/run', {
        baseUrl,
        apiSpec
      })
      return data
    },
    onSuccess: (data: TestSuiteResult) => {
      setTestResults(data)
    }
  })

  const handleGenerateTests = async () => {
    try {
      const spec = apiSpec ? JSON.parse(apiSpec) : sampleApiSpec
      await generateTestsMutation.mutateAsync(spec)
    } catch (error) {
      console.error('Error generating tests:', error)
    }
  }

  const handleRunTests = async () => {
    try {
      const spec = apiSpec ? JSON.parse(apiSpec) : sampleApiSpec
      await runTestsMutation.mutateAsync({ baseUrl, apiSpec: spec })
    } catch (error) {
      console.error('Error running tests:', error)
    }
  }

  const handleUseSample = () => {
    setApiSpec(JSON.stringify(sampleApiSpec, null, 2))
  }

  return (
    <div className="space-y-6">
      {/* API Configuration */}
      <div className="bg-white shadow rounded-lg p-6">
        <h2 className="text-lg font-medium text-gray-900 mb-4">API Configuration</h2>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Base URL
            </label>
            <input
              type="text"
              value={baseUrl}
              onChange={(e) => setBaseUrl(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="https://api.example.com"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              OpenAPI Specification (JSON)
              <button
                onClick={handleUseSample}
                className="ml-2 text-sm text-blue-600 hover:text-blue-800"
              >
                Use Sample
              </button>
            </label>
            <textarea
              value={apiSpec}
              onChange={(e) => setApiSpec(e.target.value)}
              rows={10}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-sm"
              placeholder="Paste your OpenAPI spec here or click 'Use Sample'"
            />
          </div>

          <div className="flex space-x-4">
            <button
              onClick={handleGenerateTests}
              disabled={generateTestsMutation.isPending}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
            >
              {generateTestsMutation.isPending ? 'Generating...' : 'Generate Tests'}
            </button>
            
            <button
              onClick={handleRunTests}
              disabled={runTestsMutation.isPending}
              className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50"
            >
              {runTestsMutation.isPending ? 'Running...' : 'Run Tests'}
            </button>
          </div>
        </div>
      </div>

      {/* Test Results Summary */}
      {testResults && (
        <div className="bg-white shadow rounded-lg p-6">
          <h2 className="text-lg font-medium text-gray-900 mb-4">Test Results</h2>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h3 className="font-medium text-blue-800">Total Tests</h3>
              <p className="text-2xl font-bold text-blue-600">{testResults.summary.total}</p>
            </div>
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <h3 className="font-medium text-green-800">Passed</h3>
              <p className="text-2xl font-bold text-green-600">{testResults.summary.passed}</p>
            </div>
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <h3 className="font-medium text-red-800">Failed</h3>
              <p className="text-2xl font-bold text-red-600">{testResults.summary.failed}</p>
            </div>
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
              <h3 className="font-medium text-gray-800">Duration</h3>
              <p className="text-2xl font-bold text-gray-600">{testResults.summary.duration}ms</p>
            </div>
          </div>
        </div>
      )}

      {/* Detailed Results */}
      {testResults && (
        <div className="bg-white shadow rounded-lg p-6">
          <h2 className="text-lg font-medium text-gray-900 mb-4">Test Details</h2>
          <div className="space-y-4">
            {testResults.results.map((result, index) => (
              <div
                key={index}
                className={`border rounded-lg p-4 ${
                  result.passed ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-medium">{result.testCase.name}</h3>
                  <span
                    className={`px-2 py-1 text-xs rounded-full ${
                      result.passed
                        ? 'bg-green-100 text-green-800'
                        : 'bg-red-100 text-red-800'
                    }`}
                  >
                    {result.passed ? 'PASSED' : 'FAILED'}
                  </span>
                </div>
                <div className="text-sm text-gray-600">
                  <p><strong>Endpoint:</strong> {result.testCase.method} {result.testCase.endpoint}</p>
                  <p><strong>Expected Status:</strong> {result.testCase.expectedStatus}</p>
                  <p><strong>Actual Status:</strong> {result.statusCode}</p>
                  <p><strong>Duration:</strong> {result.duration}ms</p>
                  
                  {result.assertionResults.length > 0 && (
                    <div className="mt-2">
                      <strong>Assertions:</strong>
                      <ul className="mt-1 list-disc list-inside">
                        {result.assertionResults.map((assertion, i) => (
                          <li
                            key={i}
                            className={assertion.passed ? 'text-green-600' : 'text-red-600'}
                          >
                            {assertion.assertion} {assertion.passed ? '✓' : '✗'}
                            {assertion.error && (
                              <span className="text-red-500 text-xs"> - {assertion.error}</span>
                            )}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Generated Tests Preview */}
      {generateTestsMutation.data && (
        <div className="bg-white shadow rounded-lg p-6">
          <h2 className="text-lg font-medium text-gray-900 mb-4">Generated Test Cases</h2>
          <div className="space-y-2">
            {generateTestsMutation.data.testCases?.map((test: TestCase, index: number) => (
              <div key={index} className="border border-gray-200 rounded p-3">
                <h4 className="font-medium">{test.name}</h4>
                <p className="text-sm text-gray-600">
                  {test.method} {test.endpoint} → {test.expectedStatus}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}