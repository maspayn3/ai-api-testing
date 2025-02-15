// backend/src/services/testing/generator.ts
import { TestCase } from '../../types';
import { generateTestCases } from '../gemini/client';

export class TestGenerator {
    static async generateFromSpec(apiSpec: string): Promise<TestCase[]> {
        try {
            // Use the Gemini client to generate test cases

            console.log('Attempting to generate test cases with Gemini...');
            // Use the Gemini client to generate test cases
            const rawTestCases = await generateTestCases(apiSpec);
            console.log('Raw Gemini response:', rawTestCases);
            
            try {
                // Parse the Gemini response into structured test cases
                if (typeof rawTestCases === 'string') {
                    const jsonStr = rawTestCases.match(/\[[\s\S]*\]/)?.[0] || rawTestCases;
                    const testCases = JSON.parse(jsonStr);
                    return this.validateTestCases(testCases);
                }
                return [];
            } catch (parseError) {
                console.error('Error parsing test cases:', parseError);
                // Fallback to basic test case generation if AI generation fails
                return this.generateBasicTestCases(JSON.parse(apiSpec));
            }
        } catch (error) {
            console.error('Error generating test cases:', error);
            throw new Error('Failed to generate test cases from API spec');
        }
    }

    private static validateTestCases(testCases: any[]): TestCase[] {
        return testCases.filter(testCase => {
            return (
                testCase.name &&
                testCase.endpoint &&
                testCase.method &&
                typeof testCase.expectedStatus === 'number' &&
                Array.isArray(testCase.assertions)
            );
        });
    }

    private static generateBasicTestCases(spec: any): TestCase[] {
        const testCases: TestCase[] = [];
        
        Object.entries(spec.paths).forEach(([path, methods]: [string, any]) => {
            Object.entries(methods).forEach(([method, details]: [string, any]) => {
                testCases.push({
                    name: `Test ${method.toUpperCase()} ${path}`,
                    endpoint: path,
                    method: method.toUpperCase(),
                    params: {},
                    expectedStatus: 200,
                    assertions: [
                        `Response should have status code ${details.responses['200'] ? '200' : 'successful'}`
                    ]
                });
            });
        });
        
        return testCases;
    }
}