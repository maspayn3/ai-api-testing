import { Router } from 'express';

const router = Router();

// GET /api/analysis - Get analysis results
router.get('/', async (req, res) => {
  try {
    res.json({ message: 'Analysis endpoint working' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch analysis' });
  }
});

// POST /api/analysis - Run new analysis
router.post('/', async (req, res) => {
  try {
    res.json({ message: 'Analysis creation endpoint' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to create analysis' });
  }
});

export const analysisRoutes = router;