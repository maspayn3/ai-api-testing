// src/services/testing/__tests__/runner.test.ts
import { DynamicTestRunner } from '../runner';
import { TestCase } from '../../../types';
import { BASE_URL } from '../../../../test/setup';

describe('TestRunner', () => {
  let runner: DynamicTestRunner;

  beforeEach(() => {
    runner = new DynamicTestRunner(BASE_URL);
  });

  describe('Basic HTTP Methods', () => {
    it('should handle GET requests successfully', async () => {
      const testCase: TestCase = {
        name: 'Get Users Test',
        endpoint: '/users',
        method: 'GET',
        params: {},
        expectedStatus: 200,
        assertions: [
          'status code should be 200',
          'has property "id"',
          'array length should be 2'
        ]
      };

      const result = await runner.runTest(testCase);
      expect(result.passed).toBe(true);
      expect(result.statusCode).toBe(200);
      expect(result.assertionResults.every(a => a.passed)).toBe(true);
    });

    it('should handle POST requests with data', async () => {
      const testCase: TestCase = {
        name: 'Create User Test',
        endpoint: '/users',
        method: 'POST',
        params: {
          name: 'New User',
          email: 'new@example.com'
        },
        expectedStatus: 201,
        assertions: [
          'status code should be 201',
          'has property "name"',
          'contains "New User"'
        ]
      };

      const result = await runner.runTest(testCase);
      expect(result.passed).toBe(true);
      expect(result.statusCode).toBe(201);
    });
  });

  describe('Assertion Testing', () => {
    it('should handle property existence assertions', async () => {
      const testCase: TestCase = {
        name: 'Property Check Test',
        endpoint: '/users/1',
        method: 'GET',
        params: {},
        expectedStatus: 200,
        assertions: [
          'has property "name"',
          'has property "email"'
        ]
      };

      const result = await runner.runTest(testCase);
      expect(result.passed).toBe(true);
      expect(result.assertionResults).toHaveLength(2);
      expect(result.assertionResults.every(a => a.passed)).toBe(true);
    });

    it('should handle contains assertions', async () => {
      const testCase: TestCase = {
        name: 'Content Check Test',
        endpoint: '/users/1',
        method: 'GET',
        params: {},
        expectedStatus: 200,
        assertions: ['contains "Test User"']
      };

      const result = await runner.runTest(testCase);
      expect(result.passed).toBe(true);
    });

    it('should handle array length assertions', async () => {
        const testCase: TestCase = {
          name: 'Array Length Test',
          endpoint: '/users',
          method: 'GET',
          params: {},
          expectedStatus: 200,
          assertions: ['array length should be 2']
        };
      
        const result = await runner.runTest(testCase);
        console.log('Array length test result:', {
          passed: result.passed,
          assertions: result.assertionResults,
          data: result.responseData
        });
        expect(result.passed).toBe(true);
    });
  });

  describe('Error Handling', () => {
    it('should handle 404 errors correctly', async () => {
      const testCase: TestCase = {
        name: 'Not Found Test',
        endpoint: '/nonexistent',
        method: 'GET',
        params: {},
        expectedStatus: 404,
        assertions: ['status code should be 404']
      };

      const result = await runner.runTest(testCase);
      expect(result.passed).toBe(true);
      expect(result.statusCode).toBe(404);
    });

    it('should handle invalid endpoints gracefully', async () => {
      const testCase: TestCase = {
        name: 'Invalid URL Test',
        endpoint: 'http://invalid-url',
        method: 'GET',
        params: {},
        expectedStatus: 200,
        assertions: []
      };

      const result = await runner.runTest(testCase);
      expect(result.passed).toBe(false);
      expect(result.error).toBeTruthy();
    });
  });
});