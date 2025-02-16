// src/api/routes/__tests__/tests.test.ts
import request from 'supertest';
import app from '../../server';
import { TestGenerator } from '../../../services/testing/generator';
import { TestRunner } from '../../../services/testing/runner';

// Mock the TestGenerator and TestRunner
jest.mock('../../../services/testing/generator');
jest.mock('../../../services/testing/runner');

describe('Test Routes', () => {
    const sampleApiSpec = {
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
                            description: 'Returns users list'
                        }
                    }
                }
            }
        }
    };

    beforeEach(() => {
        jest.resetAllMocks();
    });

    describe('POST /api/tests/generate', () => {
        it('should generate test cases from API spec', async () => {
            const mockTestCases = [
                {
                    name: 'Get Users Test',
                    endpoint: '/users',
                    method: 'GET',
                    params: {},
                    expectedStatus: 200,
                    assertions: ['status code should be 200']
                }
            ];

            // Mock the TestGenerator
            (TestGenerator.generateFromSpec as jest.Mock).mockResolvedValue(mockTestCases);

            const response = await request(app)
                .post('/api/tests/generate')
                .send({ apiSpec: sampleApiSpec });

            expect(response.status).toBe(200);
            expect(response.body).toHaveProperty('id');
            expect(response.body).toHaveProperty('testCases');
            expect(response.body.testCases).toHaveLength(1);
            expect(TestGenerator.generateFromSpec).toHaveBeenCalled();
        });

        it('should handle missing API spec', async () => {
            const response = await request(app)
                .post('/api/tests/generate')
                .send({});

            expect(response.status).toBe(400);
            expect(response.body).toHaveProperty('error');
        });
    });

    describe('POST /api/tests/run', () => {
        it('should run tests with generationId', async () => {
            // First generate test cases
            const mockTestCases = [
                {
                    name: 'Get Users Test',
                    endpoint: '/users',
                    method: 'GET',
                    params: {},
                    expectedStatus: 200,
                    assertions: ['status code should be 200']
                }
            ];

            (TestGenerator.generateFromSpec as jest.Mock).mockResolvedValue(mockTestCases);

            // Mock the TestRunner
            (TestRunner.prototype.runTest as jest.Mock).mockResolvedValue({
                passed: true,
                duration: 100,
                statusCode: 200,
                assertionResults: [{ passed: true }]
            });

            // Generate test cases first
            const generateResponse = await request(app)
                .post('/api/tests/generate')
                .send({ apiSpec: sampleApiSpec });

            const generationId = generateResponse.body.id;

            // Run the tests
            const response = await request(app)
                .post('/api/tests/run')
                .send({
                    baseUrl: 'http://test-api.com',
                    generationId
                });

            expect(response.status).toBe(200);
            expect(response.body).toHaveProperty('id');
            expect(response.body).toHaveProperty('results');
            expect(response.body).toHaveProperty('summary');
        });

        it('should run tests with direct API spec', async () => {
            const mockTestCases = [
                {
                    name: 'Get Users Test',
                    endpoint: '/users',
                    method: 'GET',
                    params: {},
                    expectedStatus: 200,
                    assertions: ['status code should be 200']
                }
            ];

            (TestGenerator.generateFromSpec as jest.Mock).mockResolvedValue(mockTestCases);
            (TestRunner.prototype.runTest as jest.Mock).mockResolvedValue({
                passed: true,
                duration: 100,
                statusCode: 200,
                assertionResults: [{ passed: true }]
            });

            const response = await request(app)
                .post('/api/tests/run')
                .send({
                    baseUrl: 'http://test-api.com',
                    apiSpec: sampleApiSpec
                });

            expect(response.status).toBe(200);
            expect(response.body).toHaveProperty('summary');
            expect(response.body.summary.passed).toBe(1);
        });

        it('should handle missing baseUrl', async () => {
            const response = await request(app)
                .post('/api/tests/run')
                .send({
                    apiSpec: sampleApiSpec
                });

            expect(response.status).toBe(400);
            expect(response.body).toHaveProperty('error');
        });
    });

    describe('GET /api/tests/:id', () => {
        it('should retrieve test results', async () => {
            // First run some tests
            const mockTestCases = [{
                name: 'Test',
                endpoint: '/test',
                method: 'GET',
                params: {},
                expectedStatus: 200,
                assertions: []
            }];

            (TestGenerator.generateFromSpec as jest.Mock).mockResolvedValue(mockTestCases);
            (TestRunner.prototype.runTest as jest.Mock).mockResolvedValue({
                passed: true,
                duration: 100,
                statusCode: 200,
                assertionResults: [{ passed: true }]
            });

            const runResponse = await request(app)
                .post('/api/tests/run')
                .send({
                    baseUrl: 'http://test-api.com',
                    apiSpec: sampleApiSpec
                });

            const resultsId = runResponse.body.id;

            // Retrieve the results
            const response = await request(app)
                .get(`/api/tests/${resultsId}`);

            expect(response.status).toBe(200);
            expect(response.body).toHaveProperty('results');
            expect(response.body).toHaveProperty('summary');
        });

        it('should handle non-existent result ID', async () => {
            const response = await request(app)
                .get('/api/tests/nonexistent-id');

            expect(response.status).toBe(404);
            expect(response.body).toHaveProperty('error');
        });
    });
});