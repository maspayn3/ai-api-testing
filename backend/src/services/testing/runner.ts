// backend/src/services/testing/runner.ts
import axios, { AxiosResponse } from 'axios';
import { TestCase, TestResult, AssertionResult } from '../../types/index';
import _ from 'lodash';

export class TestRunner {
    private baseUrl: string;

    constructor(baseUrl: string) {
        this.baseUrl = baseUrl;
    }

    async runTest(testCase: TestCase): Promise<TestResult> {
        const startTime = Date.now();
        let response: AxiosResponse;
        
        try {
            const headers = testCase.params.headers || {};
            const requestData = _.omit(testCase.params, ['headers']);

            response = await axios({
                method: testCase.method,
                url: `${this.baseUrl}${testCase.endpoint}`,
                data: testCase.method !== 'GET' ? requestData : undefined,
                params: testCase.method === 'GET' ? requestData : undefined,
                headers,
                validateStatus: () => true,
                timeout: 30000,
            });

            const duration = Date.now() - startTime;
            const assertionResults = await this.runAssertions(testCase, response);
            const passed = this.evaluateTestResult(assertionResults, response.status, testCase.expectedStatus);

            return {
                testCase,
                passed,
                duration,
                statusCode: response.status,
                assertionResults,
                response
            };
        } catch (err) {
            const error = err as Error;
            const errorResponse = {
                data: null,
                status: 0,
                statusText: error.message,
                headers: {},
                config: {},
            } as AxiosResponse;

            return {
                testCase,
                passed: false,
                duration: Date.now() - startTime,
                statusCode: 0,
                error: error.message,
                assertionResults: [],
                response: errorResponse
            };
        }
    }

    private evaluateAssertion(assertion: string, response: AxiosResponse): {
        passed: boolean;
        actual?: any;
        expected?: any;
        error?: string;
    } {
        const statusCheck = /status (?:code )?(?:should be |is |equals? )?(\d+)/i;
        const containsCheck = /contains? (?:a |an )?['"]?([^'"]+)['"]?/i;
        const hasPropertyCheck = /has (?:a |an )?(?:property |field |attribute )?['"]?([^'"]+)['"]?/i;
        const arrayLengthCheck = /(?:array |list )?length (?:should be |is |equals )?(\d+)/i;

        try {
            // Status code check
            const statusMatch = assertion.match(statusCheck);
            if (statusMatch) {
                const expectedStatus = parseInt(statusMatch[1]);
                return {
                    passed: response.status === expectedStatus,
                    actual: response.status,
                    expected: expectedStatus
                };
            }

            // Contains check
            const containsMatch = assertion.match(containsCheck);
            if (containsMatch) {
                const searchTerm = containsMatch[1];
                const stringContent = JSON.stringify(response.data);
                return {
                    passed: stringContent.includes(searchTerm),
                    actual: stringContent,
                    expected: searchTerm
                };
            }

            // Property existence check - Modified to handle arrays
            const propertyMatch = assertion.match(hasPropertyCheck);
            if (propertyMatch) {
                const propertyPath = propertyMatch[1];
                const data = response.data;
                
                // If response is an array, check if any element has the property
                if (Array.isArray(data)) {
                    const hasProperty = data.some(item => _.has(item, propertyPath));
                    return {
                        passed: hasProperty,
                        actual: data,
                        expected: `Property '${propertyPath}' should exist in array elements`
                    };
                }
                
                return {
                    passed: _.has(data, propertyPath),
                    actual: data,
                    expected: `Property '${propertyPath}' should exist`
                };
            }

            // Array length check - Simplified to handle direct array responses
            const lengthMatch = assertion.match(arrayLengthCheck);
            if (lengthMatch) {
                console.log('Array length check debug:');
                console.log('- Assertion:', assertion);
                console.log('- Response data:', response.data);
                console.log('- Is Array?', Array.isArray(response.data));
                
                const expectedLength = parseInt(lengthMatch[1]);
                let actualLength: number | null = null;

                // First check if response.data is directly an array
                if (Array.isArray(response.data)) {
                    actualLength = response.data.length;
                } 
                // Then check for nested arrays in common response formats
                else if (response.data?.results && Array.isArray(response.data.results)) {
                    actualLength = response.data.results.length;
                } 
                // Finally check if response.data.data is an array (another common format)
                else if (response.data?.data && Array.isArray(response.data.data)) {
                    actualLength = response.data.data.length;
                }

                if (actualLength === null) {
                    return {
                        passed: false,
                        error: 'Response is not an array or does not contain an array in a recognized format'
                    };
                }

                return {
                    passed: actualLength === expectedLength,
                    actual: actualLength,
                    expected: expectedLength
                };
            }

            return {
                passed: false,
                error: `Unsupported assertion pattern: ${assertion}`
            };
        } catch (error) {
            return {
                passed: false,
                error: `Error evaluating assertion: ${error}`
            };
        }
    }

    private async runAssertions(testCase: TestCase, response: AxiosResponse): Promise<AssertionResult[]> {
        return testCase.assertions.map(assertion => {
            try {
                const result = this.evaluateAssertion(assertion, response);
                return {
                    assertion,
                    passed: result.passed,
                    actual: result.actual,
                    expected: result.expected,
                    error: result.error
                };
            } catch (error) {
                const err = error as Error;
                return {
                    assertion,
                    passed: false,
                    error: err.message
                };
            }
        });
    }

    private evaluateTestResult(
        assertionResults: AssertionResult[],
        actualStatus: number,
        expectedStatus: number
    ): boolean {
        const statusMatches = actualStatus === expectedStatus;
        const assertionsPassed = assertionResults.every(result => result.passed);
        return statusMatches && assertionsPassed;
    }
}