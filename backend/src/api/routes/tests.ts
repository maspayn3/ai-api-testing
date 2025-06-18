// backend/src/api/routes/tests.ts - UPDATED TO USE DYNAMIC RUNNER
import { Router, Request, Response } from 'express';
import { TestGenerator } from '../../services/testing/generator';
import { DynamicTestRunner } from '../../services/testing/runner';
import { TestCase, TestSuiteConfig, TestSuiteResult } from '../../types';
import { v4 as uuidv4 } from 'uuid';

const router = Router();

// Store test results in memory for now
const testResults: Record<string, TestSuiteResult> = {};
const generatedTestCases: Record<string, { timestamp: Date; apiSpec: any; testCases: TestCase[]; }> = {};

router.get('/debug', (req: Request, res: Response) => {
    res.json({
        status: 'ok',
        message: 'Using Dynamic Test Runner - Auto-discovery enabled! 🚀',
        storedData: {
            generatedTestCases: Object.keys(generatedTestCases).length,
            testResults: Object.keys(testResults).length
        }
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
                }, {}),
                runnerType: 'Dynamic Auto-Discovery Runner' // 🚀 NEW INFO
            }
        });
    } catch (error) {
        console.error('Error generating tests:', error);
        return res.status(500).json({ error: 'Failed to generate tests' });
    }
});

// POST /api/tests/run - Run a test suite with DYNAMIC RUNNER
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

        // 🚀 USE DYNAMIC RUNNER
        const runner = new DynamicTestRunner(baseUrl);
        const startTime = new Date();
        
        console.log(`🚀 Running ${testCases.length} tests with Dynamic Auto-Discovery...`);
        
        const results = await Promise.all(
            testCases.map(testCase => runner.runTest(testCase))
        );
        const endTime = new Date();

        const summary = {
            total: results.length,
            passed: results.filter(r => r.passed).length,
            failed: results.filter(r => !r.passed).length,
            duration: endTime.getTime() - startTime.getTime(),
            runnerType: 'Dynamic Auto-Discovery',
            autoAssertions: results.reduce((total, r) => 
                total + r.assertionResults.filter(a => a.assertion.startsWith('Auto:')).length, 0
            ),
            explicitAssertions: results.reduce((total, r) => 
                total + r.assertionResults.filter(a => a.assertion.startsWith('Explicit:')).length, 0
            )
        };

        const testSuiteResult: TestSuiteResult = {
            id: uuidv4(),
            config: {
                name: `Dynamic Test Run ${new Date().toISOString()}`,
                baseUrl,
                apiSpec: apiSpec || generatedTestCases[generationId!].apiSpec
            },
            results,
            startTime,
            endTime,
            summary
        };

        testResults[testSuiteResult.id] = testSuiteResult;
        
        console.log(`✅ Test run complete: ${summary.passed}/${summary.total} passed`);
        console.log(`🔍 Auto-discovered ${summary.autoAssertions} assertions`);
        
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