import express from 'express';
import crypto from 'crypto';

const router = express.Router();

// Configuration from environment
const MOCK_API_URL = process.env.MOCK_API_URL || 'http://localhost:3001';
const USE_MOCK_API = process.env.USE_MOCK_API === 'true';

// Generate a hash for ZKP - encrypts actual data
const generateHash = (data) => {
  return crypto.createHash('sha256').update(JSON.stringify(data)).digest('hex');
};

// Generate encrypted attribute indicators (without revealing actual values)
const generateEncryptedAttributes = () => {
  const attributes = ['age', 'income', 'location', 'occupation', 'education'];
  // Randomly select 1-3 attributes that need verification
  const count = Math.floor(Math.random() * 3) + 1;
  const shuffled = attributes.sort(() => 0.5 - Math.random());
  return shuffled.slice(0, count);
};

// Sync data endpoint - ZKP compliant (only IDs and encrypted data)
router.post('/sync', async (req, res) => {
  try {
    const { userId, timestamp } = req.body;
    const apiKey = req.headers.authorization?.split(' ')[1];

    if (!apiKey) {
      return res.status(401).json({ message: 'API key required' });
    }

    if (!userId) {
      return res.status(400).json({ message: 'User ID required' });
    }

    // If Mock API is enabled, fetch from external mock server
    if (USE_MOCK_API) {
      try {
        const mockResponse = await fetch(`${MOCK_API_URL}/api/sync`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`
          },
          body: JSON.stringify({ userId, timestamp })
        });

        if (mockResponse.ok) {
          const mockData = await mockResponse.json();
          console.log(`[SYNC] Fetched ${mockData.respondents?.length || 0} respondents from Mock API`);
          return res.json(mockData);
        }
      } catch (mockError) {
        console.log('[SYNC] Mock API unavailable, falling back to local generation');
      }
    }

    // Fallback: Generate ZKP-compliant respondent data locally
    const respondentCount = Math.floor(Math.random() * 10) + 5;
    const respondents = [];

    for (let i = 0; i < respondentCount; i++) {
      const respondentId = `RSP-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

      // Create encrypted/hashed data commitment (no actual PII)
      const dataCommitment = generateHash({
        respondentId,
        timestamp: new Date().toISOString(),
        salt: crypto.randomBytes(16).toString('hex')
      });

      respondents.push({
        id: respondentId,
        hashedData: dataCommitment,
        proofStatus: 'pending',
        attributesRequiringProof: generateEncryptedAttributes(),
        syncedAt: timestamp,
        // Encrypted attribute hashes (not actual values)
        attributeHashes: {
          age: generateHash({ attr: 'age', salt: crypto.randomBytes(8).toString('hex') }),
          income: generateHash({ attr: 'income', salt: crypto.randomBytes(8).toString('hex') }),
          location: generateHash({ attr: 'location', salt: crypto.randomBytes(8).toString('hex') })
        }
      });
    }

    // Response with ZKP-compliant data
    const syncData = {
      success: true,
      syncedAt: timestamp,
      zkpCompliant: true,
      dataPoints: {
        respondentsAdded: respondents.length,
        respondentsUpdated: 0,
        failedRecords: 0
      },
      // Only send IDs and encrypted data - no PII
      respondents: respondents,
      message: 'Data synchronized successfully (ZKP mode - IDs and encrypted data only)'
    };

    res.json(syncData);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Proxy proof request to Mock API
router.post('/proof/request', async (req, res) => {
  try {
    const apiKey = req.headers.authorization?.split(' ')[1];

    if (!apiKey) {
      return res.status(401).json({ message: 'API key required' });
    }

    if (USE_MOCK_API) {
      try {
        const mockResponse = await fetch(`${MOCK_API_URL}/api/proof/request`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`
          },
          body: JSON.stringify(req.body)
        });

        if (mockResponse.ok) {
          const mockData = await mockResponse.json();
          return res.json(mockData);
        }
      } catch (mockError) {
        console.log('[PROOF] Mock API unavailable');
      }
    }

    // Fallback response
    const { respondentIds } = req.body;
    res.json({
      success: true,
      message: `ZK Proof requested for ${respondentIds?.length || 0} respondent(s)`,
      proofRequests: respondentIds?.map(id => ({
        respondentId: id,
        proofRequestId: `PRF-${Date.now()}-${crypto.randomBytes(4).toString('hex')}`,
        status: 'requested',
        requestedAt: new Date().toISOString()
      })) || []
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get sync history
router.get('/sync-history/:userId', (req, res) => {
  try {
    const { userId } = req.params;
    const apiKey = req.headers.authorization?.split(' ')[1];

    if (!apiKey) {
      return res.status(401).json({ message: 'API key required' });
    }

    const syncHistory = [
      {
        id: 1,
        timestamp: new Date(Date.now() - 2 * 60000).toISOString(),
        status: 'success',
        recordsCount: 250
      },
      {
        id: 2,
        timestamp: new Date(Date.now() - 1 * 60 * 60000).toISOString(),
        status: 'success',
        recordsCount: 340
      }
    ];

    res.json(syncHistory);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

export default router;
