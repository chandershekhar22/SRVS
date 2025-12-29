import express from 'express';
import cors from 'cors';
import crypto from 'crypto';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Test email for mock respondents
const TEST_EMAIL = process.env.TEST_EMAIL || 'test@example.com';
console.log(`[MOCK-API] Test respondent email: ${TEST_EMAIL}`);

const app = express();
const PORT = 3001;

app.use(cors());
app.use(express.json());

// Store for mock respondents (simulates external panel database)
let mockRespondents = [];

// Generate ZKP query based on selected attributes and respondent data
const generateZkpQueryFromAttributes = (attributesRequiringProof, respondentData = {}) => {
  if (!attributesRequiringProof || attributesRequiringProof.length === 0) {
    return {
      query: "age >= 18 AND age <= 65",
      conditions: [{ attr: 'age', op: '>=', value: 18 }, { attr: 'age', op: '<=', value: 65 }],
      logic: 'AND'
    };
  }

  const conditions = [];
  const queryParts = [];

  attributesRequiringProof.forEach(attr => {
    const attrLower = attr.toLowerCase().replace(' ', '_');

    switch (attrLower) {
      case 'age':
        // Always use age range
        const age = respondentData.age || 30;
        const minAge = Math.max(18, age - 5);
        const maxAge = Math.min(65, age + 10);
        queryParts.push(`age >= ${minAge} AND age <= ${maxAge}`);
        conditions.push({ attr: 'age', op: '>=', value: minAge });
        conditions.push({ attr: 'age', op: '<=', value: maxAge });
        break;

      case 'income':
        // Use income range
        const income = respondentData.income || 50000;
        const minIncome = Math.floor(income * 0.8);
        const maxIncome = Math.floor(income * 1.5);
        queryParts.push(`income >= ${minIncome} AND income <= ${maxIncome}`);
        conditions.push({ attr: 'income', op: '>=', value: minIncome });
        conditions.push({ attr: 'income', op: '<=', value: maxIncome });
        break;

      case 'gender':
        const gender = respondentData.gender || 'Male';
        queryParts.push(`gender = '${gender}'`);
        conditions.push({ attr: 'gender', op: '=', value: gender });
        break;

      case 'location':
        const location = respondentData.location || 'New York';
        queryParts.push(`location = '${location}'`);
        conditions.push({ attr: 'location', op: '=', value: location });
        break;

      case 'education':
        const education = respondentData.education || 'Bachelor';
        queryParts.push(`education = '${education}'`);
        conditions.push({ attr: 'education', op: '=', value: education });
        break;

      case 'occupation':
      case 'job_title':
        const jobTitle = respondentData.job_title || respondentData.occupation || 'Engineer';
        queryParts.push(`job_title = '${jobTitle}'`);
        conditions.push({ attr: 'job_title', op: '=', value: jobTitle });
        break;

      case 'industry':
        const industry = respondentData.industry || 'Technology';
        queryParts.push(`industry = '${industry}'`);
        conditions.push({ attr: 'industry', op: '=', value: industry });
        break;

      case 'seniority':
        const seniority = respondentData.seniority || 'Mid';
        queryParts.push(`seniority = '${seniority}'`);
        conditions.push({ attr: 'seniority', op: '=', value: seniority });
        break;

      case 'department':
        const department = respondentData.department || 'Engineering';
        queryParts.push(`department = '${department}'`);
        conditions.push({ attr: 'department', op: '=', value: department });
        break;

      case 'company_size':
        const companySize = respondentData.company_size || '51-200';
        queryParts.push(`company_size = '${companySize}'`);
        conditions.push({ attr: 'company_size', op: '=', value: companySize });
        break;

      default:
        if (respondentData[attrLower]) {
          queryParts.push(`${attrLower} = '${respondentData[attrLower]}'`);
          conditions.push({ attr: attrLower, op: '=', value: respondentData[attrLower] });
        }
    }
  });

  return {
    query: queryParts.length > 0 ? queryParts.join(' AND ') : "age >= 18 AND age <= 65",
    conditions,
    logic: 'AND'
  };
};

// Legacy: Sample ZKP queries (kept for backward compatibility)
const zkpQueryTemplates = [
  { query: "age >= 20 AND age <= 40 AND job_title = 'Engineer'", conditions: [{ attr: 'age', op: '>=', value: 20 }, { attr: 'age', op: '<=', value: 40 }, { attr: 'job_title', op: '=', value: 'Engineer' }], logic: 'AND' },
  { query: "age >= 25 AND age <= 45 AND income >= 40000 AND income <= 100000", conditions: [{ attr: 'age', op: '>=', value: 25 }, { attr: 'age', op: '<=', value: 45 }, { attr: 'income', op: '>=', value: 40000 }, { attr: 'income', op: '<=', value: 100000 }], logic: 'AND' },
  { query: "education = 'Master' AND seniority = 'Senior'", conditions: [{ attr: 'education', op: '=', value: 'Master' }, { attr: 'seniority', op: '=', value: 'Senior' }], logic: 'AND' },
  { query: "location = 'New York' AND age >= 25 AND age <= 50", conditions: [{ attr: 'location', op: '=', value: 'New York' }, { attr: 'age', op: '>=', value: 25 }, { attr: 'age', op: '<=', value: 50 }], logic: 'AND' },
  { query: "job_title = 'Manager' AND income >= 60000 AND income <= 150000", conditions: [{ attr: 'job_title', op: '=', value: 'Manager' }, { attr: 'income', op: '>=', value: 60000 }, { attr: 'income', op: '<=', value: 150000 }], logic: 'AND' },
  { query: "age >= 18 AND age <= 35 AND gender = 'Female'", conditions: [{ attr: 'age', op: '>=', value: 18 }, { attr: 'age', op: '<=', value: 35 }, { attr: 'gender', op: '=', value: 'Female' }], logic: 'AND' },
  { query: "income >= 50000 AND income <= 120000 AND location = 'Chicago'", conditions: [{ attr: 'income', op: '>=', value: 50000 }, { attr: 'income', op: '<=', value: 120000 }, { attr: 'location', op: '=', value: 'Chicago' }], logic: 'AND' },
  { query: "department = 'Engineering' AND seniority = 'Lead'", conditions: [{ attr: 'department', op: '=', value: 'Engineering' }, { attr: 'seniority', op: '=', value: 'Lead' }], logic: 'AND' },
  { query: "age >= 30 AND age <= 55 AND education = 'PhD'", conditions: [{ attr: 'age', op: '>=', value: 30 }, { attr: 'age', op: '<=', value: 55 }, { attr: 'education', op: '=', value: 'PhD' }], logic: 'AND' },
  { query: "industry = 'Technology' AND company_size = '201-500'", conditions: [{ attr: 'industry', op: '=', value: 'Technology' }, { attr: 'company_size', op: '=', value: '201-500' }], logic: 'AND' }
];

// Function to evaluate ZKP query against actual data
const evaluateZkpQuery = (actualData, queryTemplate) => {
  const { conditions, logic } = queryTemplate;

  const results = conditions.map(cond => {
    const actualValue = actualData[cond.attr];
    switch (cond.op) {
      case '>': return actualValue > cond.value;
      case '>=': return actualValue >= cond.value;
      case '<': return actualValue < cond.value;
      case '<=': return actualValue <= cond.value;
      case '=': return actualValue === cond.value;
      case '!=': return actualValue !== cond.value;
      default: return false;
    }
  });

  if (logic === 'AND') {
    return results.every(r => r);
  } else if (logic === 'OR') {
    return results.some(r => r);
  }
  return false;
};

// Get a random query template
const getRandomQuery = () => {
  return zkpQueryTemplates[Math.floor(Math.random() * zkpQueryTemplates.length)];
};

// Define attribute categories for verification method recommendations
const DOCUMENT_ATTRIBUTES = ['age', 'gender', 'income', 'location', 'education'];
const LINKEDIN_ATTRIBUTES = ['job_title', 'industry', 'company_size', 'occupation', 'seniority', 'department'];

// Generate initial mock data on startup
// panelId ensures unique respondent IDs across different panel companies
const generateMockRespondents = (count = 20, panelId = 'DEFAULT') => {
  const names = ['John Doe', 'Jane Smith', 'Bob Wilson', 'Alice Brown', 'Charlie Davis',
                 'Eva Martinez', 'Frank Miller', 'Grace Lee', 'Henry Taylor', 'Iris Johnson',
                 'Jack White', 'Karen Black', 'Leo Green', 'Mia Clark', 'Noah Adams'];
  const domains = ['gmail.com', 'yahoo.com', 'outlook.com', 'company.com'];
  const locations = ['New York', 'Los Angeles', 'Chicago', 'Houston', 'Phoenix', 'San Diego'];
  const genders = ['Male', 'Female', 'Non-binary', 'Prefer not to say'];
  const jobTitles = ['Software Engineer', 'Product Manager', 'Data Analyst', 'Marketing Director', 'Sales Manager', 'HR Specialist', 'Finance Manager', 'Operations Lead'];
  const industries = ['Technology', 'Healthcare', 'Finance', 'Retail', 'Manufacturing', 'Education', 'Media', 'Consulting'];
  const companySizes = ['1-10', '11-50', '51-200', '201-500', '501-1000', '1000+'];
  const seniorities = ['Entry', 'Mid', 'Senior', 'Lead', 'Manager', 'Director', 'VP', 'C-Level'];
  const departments = ['Engineering', 'Product', 'Marketing', 'Sales', 'HR', 'Finance', 'Operations', 'Legal'];
  const educations = ['High School', 'Bachelor', 'Master', 'PhD'];

  const respondents = [];

  for (let i = 0; i < count; i++) {
    const name = names[Math.floor(Math.random() * names.length)];
    const email = `${name.toLowerCase().replace(' ', '.')}${i}@${domains[Math.floor(Math.random() * domains.length)]}`;

    // This is the ACTUAL data (would be private in real scenario)
    const actualData = {
      name,
      email,
      age: Math.floor(Math.random() * 40) + 20,
      gender: genders[Math.floor(Math.random() * genders.length)],
      income: Math.floor(Math.random() * 150000) + 30000,
      location: locations[Math.floor(Math.random() * locations.length)],
      job_title: jobTitles[Math.floor(Math.random() * jobTitles.length)],
      industry: industries[Math.floor(Math.random() * industries.length)],
      company_size: companySizes[Math.floor(Math.random() * companySizes.length)],
      seniority: seniorities[Math.floor(Math.random() * seniorities.length)],
      department: departments[Math.floor(Math.random() * departments.length)],
      education: educations[Math.floor(Math.random() * educations.length)]
    };

    // Generate hashed/encrypted version (ZKP compliant)
    // Include panelId to ensure uniqueness across different panel companies
    const respondentId = `RSP-${panelId}-${Date.now()}-${crypto.randomBytes(4).toString('hex')}`;
    const salt = crypto.randomBytes(16).toString('hex');

    const hashedData = crypto
      .createHash('sha256')
      .update(JSON.stringify({ ...actualData, salt }))
      .digest('hex');

    // Assign a random ZKP query to this respondent
    const zkpQuery = getRandomQuery();

    respondents.push({
      id: respondentId,
      // Actual data (stored privately, never sent in ZKP mode)
      _privateData: actualData,
      // ZKP compliant data (only this is synced)
      hashedData,
      proofStatus: 'pending',
      // ZKP Query - the condition panel company wants to verify
      zkpQuery: zkpQuery.query,
      zkpQueryConditions: zkpQuery.conditions,
      zkpQueryLogic: zkpQuery.logic,
      // ZKP Result - will be 'pending' until verification, then 'Yes' or 'No'
      zkpResult: 'pending',
      attributeHashes: {
        age: crypto.createHash('sha256').update(`age:${actualData.age}:${salt}`).digest('hex'),
        gender: crypto.createHash('sha256').update(`gender:${actualData.gender}:${salt}`).digest('hex'),
        income: crypto.createHash('sha256').update(`income:${actualData.income}:${salt}`).digest('hex'),
        location: crypto.createHash('sha256').update(`location:${actualData.location}:${salt}`).digest('hex'),
        job_title: crypto.createHash('sha256').update(`job_title:${actualData.job_title}:${salt}`).digest('hex'),
        industry: crypto.createHash('sha256').update(`industry:${actualData.industry}:${salt}`).digest('hex'),
        company_size: crypto.createHash('sha256').update(`company_size:${actualData.company_size}:${salt}`).digest('hex'),
        seniority: crypto.createHash('sha256').update(`seniority:${actualData.seniority}:${salt}`).digest('hex'),
        department: crypto.createHash('sha256').update(`department:${actualData.department}:${salt}`).digest('hex'),
        education: crypto.createHash('sha256').update(`education:${actualData.education}:${salt}`).digest('hex')
      },
      createdAt: new Date().toISOString()
    });
  }

  return respondents;
};

// Initialize mock data
mockRespondents = generateMockRespondents(20);

// Add test respondent with the verification email
const addTestRespondent = () => {
  const salt = crypto.randomBytes(16).toString('hex');
  const testData = {
    name: 'Test User',
    email: TEST_EMAIL,
    age: 25,
    income: 50000,
    location: 'New York',
    occupation: 'Engineer',
    education: 'Bachelor'
  };

  // Generate query based on test attributes
  const testAttrs = ['age', 'occupation', 'income', 'education'];
  const testZkpQuery = generateZkpQueryFromAttributes(testAttrs, testData);

  const testRespondent = {
    id: `RSP-TEST-${crypto.randomBytes(4).toString('hex')}`,
    _privateData: testData,
    hashedData: crypto.createHash('sha256').update(JSON.stringify({ ...testData, salt })).digest('hex'),
    proofStatus: 'pending',
    zkpQuery: testZkpQuery.query,
    zkpQueryConditions: testZkpQuery.conditions,
    zkpQueryLogic: testZkpQuery.logic,
    zkpResult: 'pending',
    // Add default attributes for verification
    attributesRequiringProof: testAttrs,
    recommendedVerificationMethods: ['linkedin', 'document'],
    attributeHashes: {
      age: crypto.createHash('sha256').update(`age:${testData.age}:${salt}`).digest('hex'),
      income: crypto.createHash('sha256').update(`income:${testData.income}:${salt}`).digest('hex'),
      location: crypto.createHash('sha256').update(`location:${testData.location}:${salt}`).digest('hex'),
      occupation: crypto.createHash('sha256').update(`occupation:${testData.occupation}:${salt}`).digest('hex'),
      education: crypto.createHash('sha256').update(`education:${testData.education}:${salt}`).digest('hex')
    },
    createdAt: new Date().toISOString(),
    isTestAccount: true
  };

  mockRespondents.unshift(testRespondent);
  console.log(`[TEST] Added test respondent: ${TEST_EMAIL}`);
  return testRespondent;
};

const testRespondent = addTestRespondent();

// ============== API ENDPOINTS ==============

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', message: 'Mock Panel API is running', port: PORT });
});

// Get all respondents (ZKP mode - only IDs and hashes)
app.get('/api/respondents', (req, res) => {
  const apiKey = req.headers.authorization?.split(' ')[1];

  if (!apiKey) {
    return res.status(401).json({ error: 'API key required' });
  }

  // Return ZKP-compliant data only (no private data)
  const zkpRespondents = mockRespondents.map(r => ({
    id: r.id,
    hashedData: r.hashedData,
    proofStatus: r.proofStatus,
    attributeHashes: r.attributeHashes,
    createdAt: r.createdAt
  }));

  res.json({
    success: true,
    count: zkpRespondents.length,
    respondents: zkpRespondents
  });
});

// Sync endpoint - returns new/updated respondents since last sync
app.post('/api/sync', (req, res) => {
  const apiKey = req.headers.authorization?.split(' ')[1];
  const { userId, panelId, timestamp, lastSyncTime } = req.body;

  if (!apiKey) {
    return res.status(401).json({ error: 'API key required' });
  }

  // Use panelId from request, or generate a default one
  const effectivePanelId = panelId || `PNL-${crypto.randomBytes(3).toString('hex').toUpperCase()}`;
  console.log(`[SYNC] Panel ID: ${effectivePanelId}`);

  // Simulate getting new respondents since last sync
  const newCount = Math.floor(Math.random() * 8) + 3; // 3-10 new respondents
  const newRespondents = generateMockRespondents(newCount, effectivePanelId);

  // Always add a respondent with the TEST_EMAIL for verification testing
  const salt = crypto.randomBytes(16).toString('hex');
  const testEmailData = {
    name: 'Test Respondent',
    email: TEST_EMAIL,
    age: 28,
    income: 60000,
    location: 'Chicago',
    occupation: 'Developer',
    education: 'Master'
  };

  // Generate query based on test attributes
  const testAttributes = ['age', 'income', 'occupation', 'education'];
  const testSyncQuery = generateZkpQueryFromAttributes(testAttributes, testEmailData);

  const testEmailRespondent = {
    id: `RSP-${effectivePanelId}-TEST-${crypto.randomBytes(4).toString('hex')}`,
    _privateData: testEmailData,
    hashedData: crypto.createHash('sha256').update(JSON.stringify({ ...testEmailData, salt })).digest('hex'),
    proofStatus: 'pending',
    zkpQuery: testSyncQuery.query,
    zkpQueryConditions: testSyncQuery.conditions,
    zkpQueryLogic: testSyncQuery.logic,
    zkpResult: 'pending',
    // Add default attributes for verification
    attributesRequiringProof: testAttributes,
    recommendedVerificationMethods: ['linkedin', 'document'],
    attributeHashes: {
      age: crypto.createHash('sha256').update(`age:${testEmailData.age}:${salt}`).digest('hex'),
      income: crypto.createHash('sha256').update(`income:${testEmailData.income}:${salt}`).digest('hex'),
      location: crypto.createHash('sha256').update(`location:${testEmailData.location}:${salt}`).digest('hex'),
      occupation: crypto.createHash('sha256').update(`occupation:${testEmailData.occupation}:${salt}`).digest('hex'),
      education: crypto.createHash('sha256').update(`education:${testEmailData.education}:${salt}`).digest('hex')
    },
    createdAt: new Date().toISOString(),
    isTestAccount: true
  };

  // Add test email respondent to the beginning
  newRespondents.unshift(testEmailRespondent);
  console.log(`[SYNC] Added test respondent with email: ${TEST_EMAIL}`);

  // Add to our mock database
  mockRespondents = [...mockRespondents, ...newRespondents];

  // Randomly select attributes requiring proof for each respondent
  const allAttributes = ['age', 'gender', 'income', 'location', 'job_title', 'industry', 'company_size', 'seniority', 'department', 'education'];

  // Function to determine recommended verification methods based on attributes
  const getRecommendedMethods = (attrs) => {
    const hasDocumentAttrs = attrs.some(a => DOCUMENT_ATTRIBUTES.includes(a));
    const hasLinkedInAttrs = attrs.some(a => LINKEDIN_ATTRIBUTES.includes(a));

    if (hasDocumentAttrs && hasLinkedInAttrs) {
      return ['linkedin', 'document'];
    } else if (hasLinkedInAttrs) {
      return ['linkedin'];
    } else if (hasDocumentAttrs) {
      return ['document'];
    }
    return ['linkedin']; // Default
  };

  const zkpRespondents = newRespondents.map(r => {
    const attrCount = Math.floor(Math.random() * 4) + 2; // 2-5 attributes
    const shuffled = [...allAttributes].sort(() => 0.5 - Math.random());
    const selectedAttributes = shuffled.slice(0, attrCount);
    const recommendedMethods = getRecommendedMethods(selectedAttributes);

    // Generate ZKP query based on selected attributes and respondent data
    const zkpQueryObj = generateZkpQueryFromAttributes(selectedAttributes, r._privateData);

    // Store attributes in the mockRespondents array so they persist for verification
    const respondentInDb = mockRespondents.find(resp => resp.id === r.id);
    if (respondentInDb) {
      respondentInDb.attributesRequiringProof = selectedAttributes;
      respondentInDb.recommendedVerificationMethods = recommendedMethods;
      respondentInDb.zkpQuery = zkpQueryObj.query;
      respondentInDb.zkpQueryConditions = zkpQueryObj.conditions;
      respondentInDb.zkpQueryLogic = zkpQueryObj.logic;
    }

    return {
      id: r.id,
      hashedData: r.hashedData,
      proofStatus: 'pending',
      attributesRequiringProof: selectedAttributes,
      recommendedVerificationMethods: recommendedMethods,
      attributeHashes: r.attributeHashes,
      // Include ZKP Query based on selected attributes
      zkpQuery: zkpQueryObj.query,
      zkpResult: r.zkpResult,
      syncedAt: timestamp,
      // Include email and name for verification emails (demo/testing only)
      // In production, this would be handled differently
      email: r._privateData?.email,
      name: r._privateData?.name
    };
  });

  res.json({
    success: true,
    syncedAt: timestamp,
    zkpCompliant: true,
    dataPoints: {
      respondentsAdded: newCount,
      respondentsUpdated: 0,
      failedRecords: 0
    },
    respondents: zkpRespondents,
    message: `Synced ${newCount} respondents (ZKP mode - IDs and encrypted data only)`
  });
});

// Request ZK Proof for respondents
app.post('/api/proof/request', (req, res) => {
  const apiKey = req.headers.authorization?.split(' ')[1];
  const { respondentIds, respondents } = req.body;

  if (!apiKey) {
    return res.status(401).json({ error: 'API key required' });
  }

  if (!respondentIds || respondentIds.length === 0) {
    return res.status(400).json({ error: 'No respondent IDs provided' });
  }

  // Simulate proof request processing
  const proofRequests = respondentIds.map(id => ({
    respondentId: id,
    proofRequestId: `PRF-${Date.now()}-${crypto.randomBytes(4).toString('hex')}`,
    status: 'requested',
    requestedAt: new Date().toISOString(),
    estimatedCompletionTime: '24-48 hours'
  }));

  // Update proof status in our mock database
  mockRespondents = mockRespondents.map(r => {
    if (respondentIds.includes(r.id)) {
      return { ...r, proofStatus: 'processing' };
    }
    return r;
  });

  res.json({
    success: true,
    message: `ZK Proof requested for ${respondentIds.length} respondent(s)`,
    proofRequests
  });
});

// Verify a proof (simulate verification callback)
app.post('/api/proof/verify', (req, res) => {
  const { proofRequestId, respondentId, proof } = req.body;

  // Simulate verification (randomly succeed/fail for demo)
  const verified = Math.random() > 0.1; // 90% success rate

  if (verified) {
    mockRespondents = mockRespondents.map(r => {
      if (r.id === respondentId) {
        return { ...r, proofStatus: 'verified' };
      }
      return r;
    });
  }

  res.json({
    success: true,
    verified,
    respondentId,
    proofRequestId,
    verifiedAt: verified ? new Date().toISOString() : null,
    message: verified ? 'Proof verified successfully' : 'Proof verification failed'
  });
});

// Get proof status for a respondent
app.get('/api/proof/status/:respondentId', (req, res) => {
  const { respondentId } = req.params;
  const respondent = mockRespondents.find(r => r.id === respondentId);

  if (!respondent) {
    return res.status(404).json({ error: 'Respondent not found' });
  }

  res.json({
    respondentId,
    proofStatus: respondent.proofStatus,
    hashedData: respondent.hashedData,
    zkpQuery: respondent.zkpQuery,
    zkpResult: respondent.zkpResult
  });
});

// Get ZKP status for multiple respondents (batch)
app.post('/api/proof/status/batch', (req, res) => {
  const apiKey = req.headers.authorization?.split(' ')[1];
  const { respondentIds } = req.body;

  if (!apiKey) {
    return res.status(401).json({ error: 'API key required' });
  }

  if (!respondentIds || respondentIds.length === 0) {
    return res.status(400).json({ error: 'No respondent IDs provided' });
  }

  const results = respondentIds.map(id => {
    const respondent = mockRespondents.find(r => r.id === id);
    if (!respondent) {
      return { respondentId: id, found: false };
    }
    return {
      respondentId: id,
      found: true,
      proofStatus: respondent.proofStatus,
      zkpQuery: respondent.zkpQuery,
      zkpResult: respondent.zkpResult
    };
  });

  res.json({
    success: true,
    results
  });
});

// Admin: View all data (for testing only - would not exist in production)
app.get('/api/admin/respondents', (req, res) => {
  const adminKey = req.headers['x-admin-key'];

  if (adminKey !== 'admin-secret-key') {
    return res.status(403).json({ error: 'Admin access required' });
  }

  // Returns full data including private info (for testing only)
  res.json({
    warning: 'This endpoint exposes private data - for testing only!',
    count: mockRespondents.length,
    respondents: mockRespondents
  });
});

// Reset mock data
app.post('/api/admin/reset', (req, res) => {
  const adminKey = req.headers['x-admin-key'];

  if (adminKey !== 'admin-secret-key') {
    return res.status(403).json({ error: 'Admin access required' });
  }

  const count = req.body.count || 20;
  mockRespondents = generateMockRespondents(count);

  res.json({
    success: true,
    message: `Reset with ${count} new mock respondents`
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`
╔══════════════════════════════════════════════════════════════╗
║           MOCK PANEL PROVIDER API (ZKP Testing)              ║
╠══════════════════════════════════════════════════════════════╣
║  Server running on: http://localhost:${PORT}                    ║
║  Initial respondents: ${mockRespondents.length}                                  ║
╠══════════════════════════════════════════════════════════════╣
║  ENDPOINTS:                                                  ║
║  GET  /health              - Health check                    ║
║  GET  /api/respondents     - Get all respondents (ZKP)       ║
║  POST /api/sync            - Sync new respondents            ║
║  POST /api/proof/request   - Request ZK proof                ║
║  POST /api/proof/verify    - Verify a proof                  ║
║  GET  /api/proof/status/:id - Get proof status               ║
║                                                              ║
║  ADMIN (x-admin-key: admin-secret-key):                      ║
║  GET  /api/admin/respondents - View all data (testing)       ║
║  POST /api/admin/reset       - Reset mock data               ║
╚══════════════════════════════════════════════════════════════╝
  `);
});
