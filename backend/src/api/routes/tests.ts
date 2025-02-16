// backend/src/api/routes/tests.ts
import { Router, Request, Response } from 'express';
import { TestGenerator } from '../../services/testing/generator';
import { TestRunner } from '../../services/testing/runner';
import { TestCase, TestSuiteConfig, TestSuiteResult } from '../../types';
import { v4 as uuidv4 } from 'uuid';

const router = Router();

// Store test results in memory for now
const testResults: Record<string, TestSuiteResult> = {};

// Store generated test cases
interface GeneratedTestStore {
    timestamp: Date;
    apiSpec: any;
    testCases: TestCase[];
}

const generatedTestCases: Record<string, GeneratedTestStore> = {};

router.get('/debug', (req: Request, res: Response) => {
    res.json({
        status: 'ok',
        storedData: {
            generatedTestCases: Object.keys(generatedTestCases).length,
            testResults: Object.keys(testResults).length
        },
        routes: [
            { path: '/tests/generate', methods: ['POST'] },
            { path: '/tests/run', methods: ['POST'] },
            { path: '/tests/:id', methods: ['GET'] },
            { path: '/tests/generated/:id', methods: ['GET'] },
            { path: '/tests/debug', methods: ['GET'] }
        ]
    });
});

// POST /api/tests/generate - Generate tests from API spec
router.post('/generate', async (req: Request, res: Response) => {
    try {
        const { apiSpec } = req.body;
        if (!apiSpec) {
            return res.status(400).json({ error: 'API specification is required' });
        }

        const testCases = await TestGenerator.generateFromSpec(JSON.stringify(apiSpec));
        const generationId = uuidv4();

        generatedTestCases[generationId] = {
            timestamp: new Date(),
            apiSpec,
            testCases
        };

        return res.json({
            id: generationId,
            testCases,
            summary: {
                total: testCases.length,
                methods: testCases.reduce((acc: Record<string, number>, tc) => {
                    acc[tc.method] = (acc[tc.method] || 0) + 1;
                    return acc;
                }, {})
            }
        });
    } catch (error) {
        console.error('Error generating tests:', error);
        return res.status(500).json({ error: 'Failed to generate tests' });
    }
});

// POST /api/tests/run - Run a test suite
router.post('/run', async (req: Request, res: Response) => {
    try {
        const { baseUrl, generationId, apiSpec } = req.body;
        
        if (!baseUrl) {
            return res.status(400).json({ error: 'Base URL is required' });
        }

        let testCases: TestCase[];

        if (generationId) {
            const generated = generatedTestCases[generationId];
            if (!generated) {
                return res.status(404).json({ error: 'Test cases not found' });
            }
            testCases = generated.testCases;
        } else if (apiSpec) {
            testCases = await TestGenerator.generateFromSpec(JSON.stringify(apiSpec));
        } else {
            return res.status(400).json({ 
                error: 'Either generationId or apiSpec is required' 
            });
        }

        const runner = new TestRunner(baseUrl);
        const startTime = new Date();
        const results = await Promise.all(
            testCases.map(testCase => runner.runTest(testCase))
        );
        const endTime = new Date();

        const summary = {
            total: results.length,
            passed: results.filter(r => r.passed).length,
            failed: results.filter(r => !r.passed).length,
            duration: endTime.getTime() - startTime.getTime()
        };

        const testSuiteResult: TestSuiteResult = {
            id: uuidv4(),
            config: {
                name: `Test Run ${new Date().toISOString()}`,
                baseUrl,
                apiSpec: apiSpec || generatedTestCases[generationId!].apiSpec
            },
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

// GET /api/tests/generated/:id - Get generated test cases
router.get('/generated/:id', (req: Request, res: Response) => {
    const { id } = req.params;
    const generated = generatedTestCases[id];
    
    if (!generated) {
        return res.status(404).json({ error: 'Generated test cases not found' });
    }
    
    return res.json({
        testCases: generated.testCases,
        timestamp: generated.timestamp
    });
});



export const testRoutes = router;