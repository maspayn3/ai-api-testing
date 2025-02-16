// backend/src/services/testing/generator.ts
import { TestCase } from '../../types';
import { generateTestCases } from '../gemini/client';

export class TestGenerator {
    static async generateFromSpec(apiSpec: string): Promise<TestCase[]> {
        try {
            // Validate the API spec first
            const parsedSpec = this.validateAndParseSpec(apiSpec);

            try {
                // Attempt AI-powered test generation

                const rawTestCases = await generateTestCases(apiSpec);

                if (typeof rawTestCases === 'string') {
                    try {
                        // Extract JSON array from the response
                        const jsonStr = rawTestCases.match(/\[[\s\S]*\]/)?.[0] || rawTestCases;
                        const testCases = JSON.parse(jsonStr);
                        
                        // Validate and return the AI-generated test cases
                        const validatedTestCases = this.validateTestCases(testCases);
                        if (validatedTestCases.length > 0) {
                            return validatedTestCases;
                        }
                    } catch (parseError) {
                        console.error('Error parsing AI-generated test cases:', parseError);
                    }
                }

                // If AI generation fails or produces no valid test cases, fall back to basic generation
                console.log('Falling back to basic test case generation');
                return this.generateBasicTestCases(parsedSpec);
            } catch (aiError) {
                console.error('Error in AI test generation:', aiError);
                return this.generateBasicTestCases(parsedSpec);
            }
        } catch (error) {
            console.error('Error generating test cases:', error);
            throw new Error('Failed to generate test cases from API spec');
        }
    }

    private static validateAndParseSpec(apiSpec: string): any {
        try {
            const spec = JSON.parse(apiSpec);
            
            // Basic OpenAPI spec validation
            if (!spec.paths || typeof spec.paths !== 'object') {
                throw new Error('Invalid OpenAPI specification: missing or invalid paths');
            }

            return spec;
        } catch (error) {
            throw new Error('Invalid OpenAPI specification: ' + (error as Error).message);
        }
    }

    private static validateTestCases(testCases: any[]): TestCase[] {
        if (!Array.isArray(testCases)) {
            return [];
        }

        return testCases.filter(testCase => {
            return (
                typeof testCase === 'object' &&
                testCase !== null &&
                typeof testCase.name === 'string' &&
                typeof testCase.endpoint === 'string' &&
                typeof testCase.method === 'string' &&
                ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'].includes(testCase.method.toUpperCase()) &&
                typeof testCase.expectedStatus === 'number' &&
                Array.isArray(testCase.assertions) &&
                testCase.assertions.every((assertion: any) => typeof assertion === 'string') &&
                (testCase.params === undefined || typeof testCase.params === 'object')
            );
        });
    }

    private static generateBasicTestCases(spec: any): TestCase[] {
        const testCases: TestCase[] = [];
        
        Object.entries(spec.paths).forEach(([path, methods]: [string, any]) => {
            Object.entries(methods).forEach(([method, details]: [string, any]) => {
                // Generate success case
                testCases.push(this.generateSuccessCase(path, method, details));

                // Generate error cases if specified in the API spec
                if (details.responses) {
                    Object.entries(details.responses)
                        .filter(([code]) => code !== '200' && code !== '201')
                        .forEach(([code, response]: [string, any]) => {
                            testCases.push(this.generateErrorCase(path, method, parseInt(code), response));
                        });
                }

                // Generate parameter validation cases if parameters are specified
                if (details.parameters) {
                    testCases.push(...this.generateParameterTestCases(path, method, details.parameters));
                }
            });
        });
        
        return testCases;
    }

    private static generateSuccessCase(path: string, method: string, details: any): TestCase {
        const expectedStatus = method.toLowerCase() === 'post' ? 201 : 200;
        
        return {
            name: `Test ${method.toUpperCase()} ${path} Success`,
            endpoint: path,
            method: method.toUpperCase(),
            params: this.generateDefaultParams(details.parameters || []),
            expectedStatus,
            assertions: [
                `status code should be ${expectedStatus}`,
                ...(details.responses[expectedStatus.toString()]?.description 
                    ? [`contains "${details.responses[expectedStatus.toString()].description}"`] 
                    : [])
            ]
        };
    }

    private static generateErrorCase(path: string, method: string, statusCode: number, response: any): TestCase {
        return {
            name: `Test ${method.toUpperCase()} ${path} ${statusCode}`,
            endpoint: path,
            method: method.toUpperCase(),
            params: {},
            expectedStatus: statusCode,
            assertions: [
                `status code should be ${statusCode}`,
                ...(response.description ? [`contains "${response.description}"`] : [])
            ]
        };
    }

    private static generateParameterTestCases(path: string, method: string, parameters: any[]): TestCase[] {
        const testCases: TestCase[] = [];
        
        parameters.forEach(param => {
            if (param.required) {
                // Test missing required parameter
                testCases.push({
                    name: `Test ${method.toUpperCase()} ${path} Missing Required ${param.name}`,
                    endpoint: path,
                    method: method.toUpperCase(),
                    params: {},
                    expectedStatus: 400,
                    assertions: [
                        'status code should be 400',
                        `contains "${param.name} is required"`
                    ]
                });
            }
        });
        
        return testCases;
    }

    private static generateDefaultParams(parameters: any[]): Record<string, any> {
        const params: Record<string, any> = {};
        
        parameters.forEach(param => {
            if (param.required) {
                // Generate default values based on parameter type
                switch (param.schema?.type) {
                    case 'integer':
                        params[param.name] = 1;
                        break;
                    case 'string':
                        params[param.name] = 'test';
                        break;
                    case 'boolean':
                        params[param.name] = true;
                        break;
                    default:
                        params[param.name] = 'test';
                }
            }
        });
        
        return params;
    }
}