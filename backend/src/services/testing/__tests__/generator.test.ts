// src/services/testing/__tests__/generator.test.ts
import { TestGenerator } from '../generator';
import { generateTestCases } from '../../gemini/client';

// Mock the Gemini client
jest.mock('../../gemini/client');
const mockGenerateTestCases = generateTestCases as jest.MockedFunction<typeof generateTestCases>;

describe('TestGenerator', () => {
    beforeEach(() => {
        // Reset mocks before each test
        jest.clearAllMocks();
    });

    describe('generateFromSpec', () => {
        it('should generate test cases from a valid OpenAPI spec', async () => {
            const mockSpec = {
                openapi: '3.0.0',
                info: {
                    title: 'Test API',
                    version: '1.0.0'
                },
                paths: {
                    '/users': {
                        get: {
                            responses: {
                                '200': {
                                    description: 'Successful response'
                                }
                            }
                        }
                    }
                }
            };

            // Mock successful AI-generated test cases
            mockGenerateTestCases.mockResolvedValueOnce(JSON.stringify([
                {
                    name: 'Get Users Success Test',
                    endpoint: '/users',
                    method: 'GET',
                    params: {},
                    expectedStatus: 200,
                    assertions: ['status code should be 200']
                }
            ]));

            const testCases = await TestGenerator.generateFromSpec(JSON.stringify(mockSpec));

            expect(testCases).toHaveLength(1);
            expect(testCases[0]).toMatchObject({
                name: 'Get Users Success Test',
                endpoint: '/users',
                method: 'GET',
                expectedStatus: 200
            });
            expect(mockGenerateTestCases).toHaveBeenCalledTimes(1);
        });

        it('should fall back to basic generation if AI generation fails', async () => {
            const mockSpec = {
                openapi: '3.0.0',
                info: {
                    title: 'Test API',
                    version: '1.0.0'
                },
                paths: {
                    '/users': {
                        get: {
                            responses: {
                                '200': {
                                    description: 'Success'
                                }
                            }
                        },
                        post: {
                            responses: {
                                '201': {
                                    description: 'Created'
                                }
                            }
                        }
                    }
                }
            };

            // Mock AI generation failure
            mockGenerateTestCases.mockRejectedValueOnce(new Error('AI generation failed'));

            const testCases = await TestGenerator.generateFromSpec(JSON.stringify(mockSpec));

            expect(testCases).toHaveLength(2); // One for GET, one for POST
            expect(testCases[0]).toMatchObject({
                method: 'GET',
                endpoint: '/users'
            });
            expect(testCases[1]).toMatchObject({
                method: 'POST',
                endpoint: '/users'
            });
        });

        it('should validate generated test cases', async () => {
            // Mock AI returning invalid test cases
            mockGenerateTestCases.mockResolvedValueOnce(JSON.stringify([
                {
                    // Missing required fields
                    name: 'Invalid Test'
                },
                {
                    // Valid test case
                    name: 'Valid Test',
                    endpoint: '/users',
                    method: 'GET',
                    params: {},
                    expectedStatus: 200,
                    assertions: ['status code should be 200']
                }
            ]));

            const testCases = await TestGenerator.generateFromSpec(JSON.stringify({
                openapi: '3.0.0',
                paths: {
                    '/users': {
                        get: {
                            responses: { '200': { description: 'Success' } }
                        }
                    }
                }
            }));

            expect(testCases).toHaveLength(1); // Only the valid test case should remain
            expect(testCases[0].name).toBe('Valid Test');
        });

        it('should handle invalid OpenAPI specs gracefully', async () => {
            const invalidSpec = {
                invalid: 'spec'
            };

            await expect(TestGenerator.generateFromSpec(JSON.stringify(invalidSpec)))
                .rejects
                .toThrow('Failed to generate test cases from API spec');
        });

        it('should generate comprehensive test cases for complex endpoints', async () => {
            const complexSpec = {
                openapi: '3.0.0',
                paths: {
                    '/users/{id}': {
                        get: {
                            parameters: [
                                {
                                    name: 'id',
                                    in: 'path',
                                    required: true,
                                    schema: { type: 'integer' }
                                }
                            ],
                            responses: {
                                '200': { description: 'Success' },
                                '404': { description: 'Not Found' }
                            }
                        }
                    }
                }
            };

            mockGenerateTestCases.mockResolvedValueOnce(JSON.stringify([
                {
                    name: 'Get User Success',
                    endpoint: '/users/1',
                    method: 'GET',
                    params: {},
                    expectedStatus: 200,
                    assertions: ['status code should be 200']
                },
                {
                    name: 'Get User Not Found',
                    endpoint: '/users/999',
                    method: 'GET',
                    params: {},
                    expectedStatus: 404,
                    assertions: ['status code should be 404']
                }
            ]));

            const testCases = await TestGenerator.generateFromSpec(JSON.stringify(complexSpec));

            expect(testCases).toHaveLength(2);
            expect(testCases.map(tc => tc.expectedStatus)).toContain(404);
            expect(testCases.some(tc => tc.name.includes('Not Found'))).toBe(true);
        });

        it('should handle non-JSON AI responses gracefully', async () => {
            mockGenerateTestCases.mockResolvedValueOnce('Invalid non-JSON response');

            const mockSpec = {
                openapi: '3.0.0',
                paths: {
                    '/test': {
                        get: {
                            responses: { '200': { description: 'Success' } }
                        }
                    }
                }
            };

            const testCases = await TestGenerator.generateFromSpec(JSON.stringify(mockSpec));
            
            // Should fall back to basic generation
            expect(testCases).toHaveLength(1);
            expect(testCases[0]).toMatchObject({
                endpoint: '/test',
                method: 'GET'
            });
        });
    });
});