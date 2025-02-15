// backend/src/api/routes/tests.ts
import { Router, Request, Response } from 'express';
import { TestGenerator } from '../../services/testing/generator';
import { TestRunner } from '../../services/testing/runner';
import { TestSuiteConfig, TestSuiteResult } from '../../types';
import { v4 as uuidv4 } from 'uuid';

const router = Router();

// Store test results in memory for now
const testResults: Record<string, TestSuiteResult> = {};

// POST /api/tests/generate - Generate tests from API spec
router.post('/generate', async (req: Request, res: Response) => {
    try {
        const { apiSpec } = req.body;
        if (!apiSpec) {
            return res.status(400).json({ error: 'API specification is required' });
        }

        const testCases = await TestGenerator.generateFromSpec(JSON.stringify(apiSpec));

        return res.json({ testCases });
    } catch (error) {
        console.error('Error generating tests:', error);
        return res.status(500).json({ error: 'Failed to generate tests' });
    }
});

// POST /api/tests/run - Run a test suite
router.post('/run', async (req: Request, res: Response) => {
    try {
        const config: TestSuiteConfig = req.body;
        if (!config.baseUrl || !config.apiSpec) {
            return res.status(400).json({ error: 'Base URL and API specification are required' });
        }

        const testCases = await TestGenerator.generateFromSpec(JSON.stringify(config.apiSpec));
        const runner = new TestRunner(config.baseUrl);
        
        const startTime = new Date();
        const results = await Promise.all(testCases.map(testCase => runner.runTest(testCase)));
        const endTime = new Date();

        const summary = {
            total: results.length,
            passed: results.filter(r => r.passed).length,
            failed: results.filter(r => !r.passed).length,
            duration: endTime.getTime() - startTime.getTime()
        };

        const testSuiteResult: TestSuiteResult = {
            id: uuidv4(),
            config,
            results,
            startTime,
            endTime,
            summary
        };

        testResults[testSuiteResult.id] = testSuiteResult;
        return res.json(testSuiteResult);
    } catch (error) {
        console.error('Error running tests:', error);
        return res.status(500).json({ error: 'Failed to run tests' });
    }
});

// GET /api/tests/:id - Get test suite results
router.get('/:id', (req: Request, res: Response) => {
    const { id } = req.params;
    const result = testResults[id];
    
    if (!result) {
        return res.status(404).json({ error: 'Test suite not found' });
    }
    
    return res.json(result);
});

export const testRoutes = router;