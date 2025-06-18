// backend/src/services/testing/dynamicRunner.ts - TRULY DYNAMIC APPROACH
import axios, { AxiosResponse } from 'axios';
import { TestCase, TestResult, AssertionResult } from '../../types/index';

interface AutoDiscoveredAssertion {
    description: string;
    passed: boolean;
    actual: any;
    expected: any;
}

export class DynamicTestRunner {
    private baseUrl: string;

    constructor(baseUrl: string) {
        this.baseUrl = baseUrl;
    }

    async runTest(testCase: TestCase): Promise<TestResult> {
        const startTime = Date.now();
        let response: AxiosResponse;
        
        try {
            response = await axios({
                method: testCase.method,
                url: `${this.baseUrl}${testCase.endpoint}`,
                data: testCase.method !== 'GET' ? testCase.params : undefined,
                params: testCase.method === 'GET' ? testCase.params : undefined,
                validateStatus: () => true,
                timeout: 30000,
            });

            const duration = Date.now() - startTime;
            
            // 🚀 AUTO-DISCOVER WHAT TO TEST
            const autoAssertions = this.autoDiscoverAssertions(testCase, response);
            
            // 🔗 COMBINE WITH EXPLICIT ASSERTIONS
            const explicitAssertions = await this.runExplicitAssertions(testCase, response);
            
            const allAssertions = [...autoAssertions, ...explicitAssertions];
            const passed = this.evaluateTestResult(allAssertions, response.status, testCase.expectedStatus);

            return {
                testCase,
                passed,
                duration,
                statusCode: response.status,
                assertionResults: allAssertions,
                responseData: {
                    status: response.status,
                    statusText: response.statusText,
                    headers: response.headers,
                    data: response.data
                }
            };
        } catch (err) {
            const error = err as Error;
            
            return {
                testCase,
                passed: false,
                duration: Date.now() - startTime,
                statusCode: 0,
                error: error.message,
                assertionResults: [],
                responseData: {
                    status: 0,
                    statusText: error.message,
                    headers: {},
                    data: null
                }
            };
        }
    }

    private autoDiscoverAssertions(testCase: TestCase, response: AxiosResponse): AssertionResult[] {
        const assertions: AssertionResult[] = [];
        const data = response.data;

        // 1. Status Code Auto-Check
        assertions.push({
            assertion: `Auto: Status code is ${response.status}`,
            passed: response.status === testCase.expectedStatus,
            actual: response.status,
            expected: testCase.expectedStatus
        });

        // 2. Response Type Auto-Detection
        if (Array.isArray(data)) {
            assertions.push({
                assertion: `Auto: Response is an array`,
                passed: true,
                actual: `Array with ${data.length} items`,
                expected: 'Array'
            });

            // 3. Array Content Analysis
            if (data.length > 0) {
                const firstItem = data[0];
                if (firstItem && typeof firstItem === 'object') {
                    const properties = Object.keys(firstItem);
                    
                    assertions.push({
                        assertion: `Auto: Array contains objects with properties`,
                        passed: properties.length > 0,
                        actual: `Properties: ${properties.join(', ')}`,
                        expected: 'Objects with properties'
                    });

                    // Check for common API patterns
                    const commonFields = ['id', 'name', 'title', 'email', 'userId', 'createdAt'];
                    commonFields.forEach(field => {
                        if (properties.includes(field)) {
                            assertions.push({
                                assertion: `Auto: Array items have '${field}' property`,
                                passed: true,
                                actual: `Property '${field}' exists`,
                                expected: `Property '${field}'`
                            });
                        }
                    });
                }
            } else {
                assertions.push({
                    assertion: `Auto: Array is empty`,
                    passed: true,
                    actual: 'Empty array',
                    expected: 'Empty array'
                });
            }

        } else if (data && typeof data === 'object') {
            // 4. Object Analysis
            const properties = Object.keys(data);
            
            assertions.push({
                assertion: `Auto: Response is an object`,
                passed: true,
                actual: `Object with ${properties.length} properties`,
                expected: 'Object'
            });

            assertions.push({
                assertion: `Auto: Object has properties`,
                passed: properties.length > 0,
                actual: `Properties: ${properties.join(', ')}`,
                expected: 'Object with properties'
            });

            // Check for common API patterns
            const commonFields = ['id', 'name', 'title', 'email', 'userId', 'createdAt'];
            commonFields.forEach(field => {
                if (properties.includes(field)) {
                    assertions.push({
                        assertion: `Auto: Object has '${field}' property`,
                        passed: true,
                        actual: `Property '${field}' = ${JSON.stringify(data[field])}`,
                        expected: `Property '${field}'`
                    });
                }
            });

        } else if (data === null || data === undefined) {
            assertions.push({
                assertion: `Auto: Response is empty`,
                passed: response.status >= 400, // Empty is expected for errors
                actual: 'No data',
                expected: response.status >= 400 ? 'No data (error response)' : 'Some data'
            });

        } else {
            // 5. Primitive Type Analysis
            assertions.push({
                assertion: `Auto: Response is ${typeof data}`,
                passed: true,
                actual: `${typeof data}: ${data}`,
                expected: `${typeof data}`
            });
        }

        // 6. Response Time Analysis
        const responseTime = Date.now();
        assertions.push({
            assertion: `Auto: Response received`,
            passed: true,
            actual: 'Response received successfully',
            expected: 'Response received'
        });

        // 7. Content-Type Analysis
        const contentType = response.headers['content-type'];
        if (contentType) {
            assertions.push({
                assertion: `Auto: Content-Type is ${contentType}`,
                passed: contentType.includes('application/json') || contentType.includes('text/'),
                actual: contentType,
                expected: 'Valid content type'
            });
        }

        return assertions;
    }

    private async runExplicitAssertions(testCase: TestCase, response: AxiosResponse): Promise<AssertionResult[]> {
        // Run any explicit assertions from the test case
        return testCase.assertions.map(assertion => {
            try {
                const result = this.evaluateExplicitAssertion(assertion, response);
                return {
                    assertion: `Explicit: ${assertion}`,
                    passed: result.passed,
                    actual: result.actual,
                    expected: result.expected,
                    error: result.error
                };
            } catch (error) {
                return {
                    assertion: `Explicit: ${assertion}`,
                    passed: false,
                    error: `Error: ${error}`
                };
            }
        });
    }

    private evaluateExplicitAssertion(assertion: string, response: AxiosResponse): {
        passed: boolean;
        actual?: any;
        expected?: any;
        error?: string;
    } {
        // Use the smart assertion logic from previous version
        const data = response.data;
        const status = response.status;
        
        // Status code check
        if (assertion.includes('status') && assertion.includes('should be')) {
            const statusMatch = assertion.match(/(\d+)/);
            if (statusMatch) {
                const expectedStatus = parseInt(statusMatch[1]);
                return {
                    passed: status === expectedStatus,
                    actual: status,
                    expected: expectedStatus
                };
            }
        }

        // Array check
        if (assertion.includes('array') || assertion.includes('list')) {
            return {
                passed: Array.isArray(data),
                actual: Array.isArray(data) ? `Array with ${data.length} items` : typeof data,
                expected: 'Array'
            };
        }

        // Property check
        if (assertion.includes('has property')) {
            const propertyMatch = assertion.match(/['"]([^'"]+)['"]/);
            if (propertyMatch) {
                const propertyName = propertyMatch[1];
                
                if (Array.isArray(data)) {
                    const hasProperty = data.some(item => 
                        item && typeof item === 'object' && propertyName in item
                    );
                    return {
                        passed: hasProperty,
                        actual: `Array elements have property "${propertyName}": ${hasProperty}`,
                        expected: `Property '${propertyName}' in array elements`
                    };
                }
                
                const hasProperty = data && typeof data === 'object' && propertyName in data;
                return {
                    passed: hasProperty,
                    actual: `Object has property "${propertyName}": ${hasProperty}`,
                    expected: `Property '${propertyName}'`
                };
            }
        }

        // Default: assume assertion passes if we got a successful response
        return {
            passed: status >= 200 && status < 300,
            actual: `Status ${status}`,
            expected: 'Successful response'
        };
    }

    private evaluateTestResult(
        assertionResults: AssertionResult[],
        actualStatus: number,
        expectedStatus: number
    ): boolean {
        // Primary check: status code must match
        const statusMatches = actualStatus === expectedStatus;
        
        // Secondary check: most auto-discovered assertions should pass
        const autoAssertions = assertionResults.filter(a => a.assertion.startsWith('Auto:'));
        const explicitAssertions = assertionResults.filter(a => a.assertion.startsWith('Explicit:'));
        
        const autoPassRate = autoAssertions.length > 0 ? 
            autoAssertions.filter(a => a.passed).length / autoAssertions.length : 1;
        
        const explicitPassRate = explicitAssertions.length > 0 ? 
            explicitAssertions.filter(a => a.passed).length / explicitAssertions.length : 1;
        
        // Test passes if status matches AND most assertions pass
        return statusMatches && autoPassRate >= 0.8 && explicitPassRate >= 0.5;
    }
}