// backend/src/services/testing/generator.ts
import { TestCase } from '../../types';
import { generateTestCases } from '../gemini/client';

export class TestGenerator {
    static async generateFromSpec(apiSpec: string): Promise<TestCase[]> {
        try {
            // Validate the API spec first
            const parsedSpec = this.validateAndParseSpec(apiSpec);

            try {
                // 🤖 TRY AI GENERATION FIRST
                console.log('🤖 Attempting AI-powered test generation...');
                const aiResponse = await generateTestCases(apiSpec);
                
                if (aiResponse) {
                    const testCases = JSON.parse(aiResponse);
                    const validatedTestCases = this.validateTestCases(testCases);
                    
                    if (validatedTestCases.length > 0) {
                        console.log(`✅ AI generated ${validatedTestCases.length} valid test cases`);
                        return validatedTestCases;
                    } else {
                        console.log('⚠️ AI generated invalid test cases, falling back to basic generation');
                    }
                }
            } catch (aiError) {
                console.error('❌ AI test generation failed:', aiError);
                console.log('🔄 Falling back to basic test case generation');
            }

            // 🛠️ FALLBACK TO IMPROVED BASIC GENERATION
            return this.generateBasicTestCases(parsedSpec);
            
        } catch (error) {
            console.error('Error generating test cases:', error);
            throw new Error('Failed to generate test cases from API spec');
        }
    }

    private static validateAndParseSpec(apiSpec: string): any {
        try {
            const spec = JSON.parse(apiSpec);
            
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
            console.log('❌ AI response is not an array');
            return [];
        }

        const validCases = testCases.filter(testCase => {
            const isValid = (
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
            
            if (!isValid) {
                console.log('❌ Invalid test case:', testCase);
            }
            
            return isValid;
        });

        console.log(`✅ ${validCases.length}/${testCases.length} test cases are valid`);
        return validCases;
    }

    private static generateBasicTestCases(spec: any): TestCase[] {
        console.log('🛠️ Generating basic test cases...');
        const testCases: TestCase[] = [];
        
        Object.entries(spec.paths).forEach(([path, methods]: [string, any]) => {
            Object.entries(methods).forEach(([method, details]: [string, any]) => {
                testCases.push(this.generateSuccessCase(path, method, details));
            });
        });
        
        console.log(`✅ Generated ${testCases.length} basic test cases`);
        return testCases;
    }

    private static generateSuccessCase(path: string, method: string, details: any): TestCase {
        const expectedStatus = method.toLowerCase() === 'post' ? 201 : 200;
        
        // Start with basic status check
        const assertions = [`status code should be ${expectedStatus}`];
        
        // Add smart assertions based on endpoint patterns
        if (method.toLowerCase() === 'get') {
            if (path === '/posts') {
                assertions.push('has property "id"');
                assertions.push('has property "title"');
            } else if (path === '/posts/1') {
                assertions.push('has property "id"');
                assertions.push('has property "title"');
                assertions.push('has property "body"');
            } else if (path === '/users') {
                assertions.push('has property "name"');
                assertions.push('has property "email"');
            } else if (path === '/users/1') {
                assertions.push('has property "name"');
                assertions.push('has property "email"');
                assertions.push('has property "username"');
            }
        }
        
        return {
            name: `${method.toUpperCase()} ${path} - Happy Path`,
            endpoint: path,
            method: method.toUpperCase(),
            params: {},
            expectedStatus,
            assertions
        };
    }
}