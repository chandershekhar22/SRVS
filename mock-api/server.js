import express from 'express';
import cors from 'cors';
import crypto from 'crypto';
import nodemailer from 'nodemailer';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Email configuration - only TEST_EMAIL is needed
// SMTP credentials are now provided by panel companies when sending emails
const EMAIL_CONFIG = {
  testEmail: process.env.TEST_EMAIL || 'joshichandu975@gmail.com'
};

console.log(`[EMAIL] Test respondent email configured: ${EMAIL_CONFIG.testEmail}`);
console.log('[EMAIL] Panel companies will provide their own SMTP credentials when sending emails');

const app = express();
const PORT = 3001;

app.use(cors());
app.use(express.json());

// Store for mock respondents (simulates external panel database)
let mockRespondents = [];

// Store for verification tokens
const verificationTokens = new Map();

// Store for sent emails (for demo/logging)
const sentEmails = [];

// Sample ZKP queries that panel companies might ask
const zkpQueryTemplates = [
  { query: "age > 25 AND occupation = 'Doctor'", conditions: [{ attr: 'age', op: '>', value: 25 }, { attr: 'occupation', op: '=', value: 'Doctor' }], logic: 'AND' },
  { query: "age >= 20 AND income > 50000", conditions: [{ attr: 'age', op: '>=', value: 20 }, { attr: 'income', op: '>', value: 50000 }], logic: 'AND' },
  { query: "education = 'Master' OR education = 'PhD'", conditions: [{ attr: 'education', op: '=', value: 'Master' }, { attr: 'education', op: '=', value: 'PhD' }], logic: 'OR' },
  { query: "location = 'New York' AND age >= 30", conditions: [{ attr: 'location', op: '=', value: 'New York' }, { attr: 'age', op: '>=', value: 30 }], logic: 'AND' },
  { query: "occupation = 'Engineer' AND income >= 60000", conditions: [{ attr: 'occupation', op: '=', value: 'Engineer' }, { attr: 'income', op: '>=', value: 60000 }], logic: 'AND' },
  { query: "age > 21 AND education != 'High School'", conditions: [{ attr: 'age', op: '>', value: 21 }, { attr: 'education', op: '!=', value: 'High School' }], logic: 'AND' },
  { query: "income >= 40000 AND location = 'Chicago'", conditions: [{ attr: 'income', op: '>=', value: 40000 }, { attr: 'location', op: '=', value: 'Chicago' }], logic: 'AND' },
  { query: "occupation = 'Teacher' OR occupation = 'Manager'", conditions: [{ attr: 'occupation', op: '=', value: 'Teacher' }, { attr: 'occupation', op: '=', value: 'Manager' }], logic: 'OR' },
  { query: "age >= 18 AND age <= 35", conditions: [{ attr: 'age', op: '>=', value: 18 }, { attr: 'age', op: '<=', value: 35 }], logic: 'AND' },
  { query: "education = 'Bachelor' AND occupation = 'Analyst'", conditions: [{ attr: 'education', op: '=', value: 'Bachelor' }, { attr: 'occupation', op: '=', value: 'Analyst' }], logic: 'AND' }
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
    email: EMAIL_CONFIG.testEmail,
    age: 25,
    income: 50000,
    location: 'New York',
    occupation: 'Engineer',
    education: 'Bachelor'
  };

  // Assign a specific test query
  const testZkpQuery = { query: "age >= 20 AND occupation = 'Engineer'", conditions: [{ attr: 'age', op: '>=', value: 20 }, { attr: 'occupation', op: '=', value: 'Engineer' }], logic: 'AND' };

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
    attributesRequiringProof: ['age', 'occupation', 'income', 'education'],
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
  console.log(`[TEST] Added test respondent: ${EMAIL_CONFIG.testEmail}`);
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
    email: EMAIL_CONFIG.testEmail,
    age: 28,
    income: 60000,
    location: 'Chicago',
    occupation: 'Developer',
    education: 'Master'
  };

  // Assign a test query for the test respondent
  const testSyncQuery = { query: "age >= 25 AND income >= 50000", conditions: [{ attr: 'age', op: '>=', value: 25 }, { attr: 'income', op: '>=', value: 50000 }], logic: 'AND' };

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
    attributesRequiringProof: ['age', 'income', 'occupation', 'education'],
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
  console.log(`[SYNC] Added test respondent with email: ${EMAIL_CONFIG.testEmail}`);

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

    // Store attributes in the mockRespondents array so they persist for verification
    const respondentInDb = mockRespondents.find(resp => resp.id === r.id);
    if (respondentInDb) {
      respondentInDb.attributesRequiringProof = selectedAttributes;
      respondentInDb.recommendedVerificationMethods = recommendedMethods;
    }

    return {
      id: r.id,
      hashedData: r.hashedData,
      proofStatus: 'pending',
      attributesRequiringProof: selectedAttributes,
      recommendedVerificationMethods: recommendedMethods,
      attributeHashes: r.attributeHashes,
      // Include ZKP Query and Result
      zkpQuery: r.zkpQuery,
      zkpResult: r.zkpResult,
      syncedAt: timestamp
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

// ============== EMAIL VERIFICATION ENDPOINTS ==============

// Send verification email to a single respondent
app.post('/api/email/send', (req, res) => {
  const apiKey = req.headers.authorization?.split(' ')[1];
  const { respondentId, baseUrl } = req.body;

  if (!apiKey) {
    return res.status(401).json({ error: 'API key required' });
  }

  const respondent = mockRespondents.find(r => r.id === respondentId);
  if (!respondent) {
    return res.status(404).json({ error: 'Respondent not found' });
  }

  // Generate verification token
  const token = crypto.randomBytes(32).toString('hex');
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

  verificationTokens.set(token, {
    respondentId,
    email: respondent._privateData.email,
    createdAt: new Date().toISOString(),
    expiresAt: expiresAt.toISOString(),
    used: false
  });

  // Generate verification link
  const verificationLink = `${baseUrl || 'http://localhost:5173'}/verify/${token}`;

  // Simulate email sending
  const emailData = {
    to: respondent._privateData.email,
    subject: 'Verify Your Profile - Survey Respondent Verification',
    body: `
      Hello ${respondent._privateData.name},

      You have been invited to verify your profile attributes for survey participation.

      Please click the link below to complete your verification:
      ${verificationLink}

      This link will expire on ${expiresAt.toLocaleDateString()}.

      If you did not request this verification, please ignore this email.

      Best regards,
      Survey Verification Team
    `,
    verificationLink,
    token,
    sentAt: new Date().toISOString()
  };

  sentEmails.push(emailData);

  // Update respondent status
  respondent.emailSent = true;
  respondent.emailSentAt = new Date().toISOString();

  console.log(`[EMAIL] Sent to ${respondent._privateData.email} - Token: ${token.substring(0, 8)}...`);

  res.json({
    success: true,
    message: `Verification email sent to ${respondent._privateData.email}`,
    respondentId,
    verificationLink,
    token,
    expiresAt: expiresAt.toISOString()
  });
});

// Send verification emails to multiple respondents (bulk) - SENDS REAL EMAILS
app.post('/api/email/send-bulk', async (req, res) => {
  const apiKey = req.headers.authorization?.split(' ')[1];
  const { respondentIds, baseUrl, smtpUser, smtpPass } = req.body;

  if (!apiKey) {
    return res.status(401).json({ error: 'API key required' });
  }

  if (!respondentIds || respondentIds.length === 0) {
    return res.status(400).json({ error: 'No respondent IDs provided' });
  }

  // Validate SMTP credentials from panelist
  if (!smtpUser || !smtpPass) {
    return res.status(400).json({ error: 'SMTP credentials (smtpUser and smtpPass) are required' });
  }

  // Create a dynamic transporter using panelist's SMTP credentials
  let panelTransporter;
  try {
    panelTransporter = nodemailer.createTransport({
      host: 'smtp.gmail.com',
      port: 587,
      secure: false,
      auth: {
        user: smtpUser,
        pass: smtpPass
      },
      // Connection pool settings for better reliability
      pool: true,
      maxConnections: 5,
      maxMessages: 100,
      // Timeout settings
      connectionTimeout: 10000,
      greetingTimeout: 10000,
      socketTimeout: 30000
    });

    // Verify the connection
    await panelTransporter.verify();
    console.log(`[EMAIL] SMTP verified for panel email: ${smtpUser}`);

    // Add a small delay to let the SMTP connection fully establish
    // This fixes the issue where first-time emails fail silently
    await new Promise(resolve => setTimeout(resolve, 500));
    console.log(`[EMAIL] SMTP connection ready for ${smtpUser}`);
  } catch (error) {
    console.error(`[EMAIL] SMTP verification failed for ${smtpUser}:`, error.message);
    return res.status(400).json({
      error: `SMTP authentication failed: ${error.message}. Please check your email and app password.`
    });
  }

  const results = [];
  const failed = [];
  const emailPromises = [];

  for (const respondentId of respondentIds) {
    const respondent = mockRespondents.find(r => r.id === respondentId);

    if (!respondent) {
      failed.push({ respondentId, error: 'Not found' });
      continue;
    }

    // Generate verification token
    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    verificationTokens.set(token, {
      respondentId,
      email: respondent._privateData.email,
      name: respondent._privateData.name,
      createdAt: new Date().toISOString(),
      expiresAt: expiresAt.toISOString(),
      used: false
    });

    const verificationLink = `${baseUrl || 'http://localhost:5173'}/verify/${token}`;

    // Email content - using panelist's email as the sender (Zero-Knowledge Proof - no personal data in email)
    const emailContent = {
      from: smtpUser,
      to: respondent._privateData.email,
      subject: 'Your Survey Respondent ID - Action Required',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h2 style="color: #333;">Survey Verification</h2>
          <p>You have been invited to participate in surveys. Below is your unique Respondent ID:</p>

          <div style="text-align: center; margin: 30px 0; padding: 25px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); border-radius: 12px;">
            <p style="color: rgba(255,255,255,0.9); font-size: 14px; margin: 0 0 10px 0; text-transform: uppercase; letter-spacing: 1px;">Your Respondent ID</p>
            <p style="color: white; font-size: 24px; font-weight: bold; font-family: 'Courier New', monospace; margin: 0; letter-spacing: 2px; word-break: break-all;">
              ${respondentId}
            </p>
          </div>

          <p style="color: #666; text-align: center; font-size: 14px; margin-bottom: 25px;">
            <strong>Important:</strong> Save this Respondent ID. You will use it to sign in to the survey platform.
          </p>

          <p>Click the button below to verify and set up your account:</p>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${verificationLink}" style="display: inline-block; padding: 14px 28px; background-color: #007bff; color: white; text-decoration: none; border-radius: 5px; font-weight: bold;">
              Verify & Create Account
            </a>
          </div>
          <p style="color: #666; font-size: 12px;">Or copy this link: <a href="${verificationLink}">${verificationLink}</a></p>
          <p style="color: #666; font-size: 12px;">This link will expire on ${expiresAt.toLocaleDateString()}.</p>
          <hr style="border: 1px solid #eee; margin: 20px 0;">
          <p style="color: #999; font-size: 12px;">
            <strong>Zero-Knowledge Proof System:</strong> No personal information is stored. Only your Respondent ID is used for identification.<br><br>
            If you did not request this, please ignore this email.<br>
            Best regards, Survey Verification Team
          </p>
        </div>
      `,
      text: `Survey Verification\n\nYou have been invited to participate in surveys.\n\n========================================\nYOUR RESPONDENT ID: ${respondentId}\n========================================\n\nIMPORTANT: Save this Respondent ID. You will use it to sign in to the survey platform.\n\nClick here to verify and create your account: ${verificationLink}\n\nThis link expires on ${expiresAt.toLocaleDateString()}.\n\nZero-Knowledge Proof System: No personal information is stored. Only your Respondent ID is used for identification.\n\nBest regards,\nSurvey Verification Team`
    };

    // Store email data for logging
    sentEmails.push({
      ...emailContent,
      respondentId,
      token,
      sentAt: new Date().toISOString()
    });

    // Update respondent
    respondent.emailSent = true;
    respondent.emailSentAt = new Date().toISOString();
    respondent.verificationToken = token;

    // Send email using panelist's transporter
    emailPromises.push(
      panelTransporter.sendMail(emailContent)
        .then(info => {
          console.log(`[EMAIL] Real email sent from ${smtpUser} to ${respondent._privateData.email} - MessageId: ${info.messageId}`);
          results.push({
            respondentId,
            email: respondent._privateData.email,
            verificationLink,
            token: token.substring(0, 8) + '...',
            realEmailSent: true,
            messageId: info.messageId,
            sentFrom: smtpUser
          });
        })
        .catch(error => {
          console.error(`[EMAIL] Failed to send to ${respondent._privateData.email}:`, error.message);
          failed.push({
            respondentId,
            email: respondent._privateData.email,
            error: error.message
          });
        })
    );
  }

  // Wait for all emails to be sent
  if (emailPromises.length > 0) {
    await Promise.all(emailPromises);
  }

  // Close the transporter
  panelTransporter.close();

  console.log(`[BULK EMAIL] Sent ${results.length} emails from ${smtpUser}, ${failed.length} failed`);

  res.json({
    success: true,
    message: `Sent ${results.length} verification emails from ${smtpUser}`,
    sent: results.length,
    failed: failed.length,
    sentFrom: smtpUser,
    results,
    failedDetails: failed
  });
});

// Verify a token (called when user clicks the link)
app.get('/api/verify/:token', (req, res) => {
  const { token } = req.params;

  const tokenData = verificationTokens.get(token);

  if (!tokenData) {
    return res.status(404).json({ error: 'Invalid or expired token' });
  }

  if (new Date(tokenData.expiresAt) < new Date()) {
    return res.status(410).json({ error: 'Token has expired' });
  }

  if (tokenData.used) {
    return res.status(410).json({ error: 'Token has already been used' });
  }

  // Return respondent info for verification page
  const respondent = mockRespondents.find(r => r.id === tokenData.respondentId);

  // Calculate recommended verification methods based on attributes
  const attrs = respondent?.attributesRequiringProof || [];
  const hasDocumentAttrs = attrs.some(a => DOCUMENT_ATTRIBUTES.includes(a));
  const hasLinkedInAttrs = attrs.some(a => LINKEDIN_ATTRIBUTES.includes(a));

  let recommendedMethods = ['linkedin'];
  if (hasDocumentAttrs && hasLinkedInAttrs) {
    recommendedMethods = ['linkedin', 'document'];
  } else if (hasLinkedInAttrs) {
    recommendedMethods = ['linkedin'];
  } else if (hasDocumentAttrs) {
    recommendedMethods = ['document'];
  }

  res.json({
    valid: true,
    respondentId: tokenData.respondentId,
    email: tokenData.email,
    name: tokenData.name,
    attributesRequiringProof: attrs,
    recommendedVerificationMethods: recommendedMethods,
    zkpQuery: respondent?.zkpQuery || null,
    message: 'Token is valid. Please complete your verification.'
  });
});

// Complete verification (after user submits proof)
app.post('/api/verify/:token/complete', (req, res) => {
  const { token } = req.params;
  const { proofData } = req.body;

  const tokenData = verificationTokens.get(token);

  if (!tokenData) {
    return res.status(404).json({ error: 'Invalid token' });
  }

  if (tokenData.used) {
    return res.status(410).json({ error: 'Token already used' });
  }

  // Mark token as used
  tokenData.used = true;
  tokenData.usedAt = new Date().toISOString();

  // Update respondent proof status and calculate ZKP result
  const respondent = mockRespondents.find(r => r.id === tokenData.respondentId);
  let zkpResultValue = 'pending';

  if (respondent) {
    respondent.proofStatus = 'verified';
    respondent.verifiedAt = new Date().toISOString();

    // Calculate ZKP result based on actual data and query conditions
    if (respondent.zkpQueryConditions && respondent.zkpQueryLogic && respondent._privateData) {
      const queryResult = evaluateZkpQuery(respondent._privateData, {
        conditions: respondent.zkpQueryConditions,
        logic: respondent.zkpQueryLogic
      });
      zkpResultValue = queryResult ? 'Yes' : 'No';
      respondent.zkpResult = zkpResultValue;
    }
  }

  res.json({
    success: true,
    message: 'Verification completed successfully',
    respondentId: tokenData.respondentId,
    zkpResult: zkpResultValue
  });
});

// Get all sent emails (for debugging)
app.get('/api/admin/emails', (req, res) => {
  const adminKey = req.headers['x-admin-key'];

  if (adminKey !== 'admin-secret-key') {
    return res.status(403).json({ error: 'Admin access required' });
  }

  res.json({
    count: sentEmails.length,
    emails: sentEmails.slice(-50) // Last 50 emails
  });
});

// ============== TEST EMAIL INFO ENDPOINT ==============
// Returns info about how to send emails (SMTP credentials provided by panelist)
app.get('/api/email/info', (req, res) => {
  res.json({
    message: 'Email sending requires SMTP credentials from the panel company',
    howToSend: 'Use the "Send Verification to All" button in the Panelists page',
    testEmail: EMAIL_CONFIG.testEmail,
    note: 'Panelists must provide their own SMTP email and App Password when sending emails'
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
