import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import dotenv from 'dotenv';
import crypto from 'crypto';
import nodemailer from 'nodemailer';
import { Resend } from 'resend';
import surveyRoutes from './routes/surveys.js';
import syncRoutes from './routes/sync.js';
import authRoutes from './routes/auth.js';

// Load environment variables FIRST before using them
dotenv.config();

// Initialize Resend if API key is provided
const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;
console.log(`[RESEND] API Key configured: ${process.env.RESEND_API_KEY ? 'Yes' : 'No'}`);

// Store for verification tokens
const verificationTokens = new Map();

// Store for completed verifications (persists after token expiry)
const completedVerifications = new Map();

// Store for sent emails (for logging)
const sentEmails = [];

// Attribute categories for verification method recommendations
const DOCUMENT_ATTRIBUTES = ['age', 'gender', 'income', 'location', 'education'];
const LINKEDIN_ATTRIBUTES = ['job_title', 'industry', 'company_size', 'occupation', 'seniority', 'department'];

// LinkedIn OAuth configuration
const LINKEDIN_CONFIG = {
  clientId: process.env.LINKEDIN_CLIENT_ID,
  clientSecret: process.env.LINKEDIN_CLIENT_SECRET,
  redirectUri: process.env.LINKEDIN_REDIRECT_URI || 'http://localhost:5173/auth/linkedin/callback',
  scope: 'openid profile email'
};

// Store for OAuth state tokens (to prevent CSRF)
const oauthStates = new Map();

const app = express();

// CORS configuration for production
const allowedOrigins = [
  'http://localhost:5173',
  'http://localhost:3000',
  process.env.FRONTEND_URL
].filter(Boolean);

// Middleware
app.use(cors({
  origin: function(origin, callback) {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    if (allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      callback(null, true); // Allow all origins in development - restrict in production if needed
    }
  },
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Database Connection
const mongoURI = process.env.MONGODB_URI || 'mongodb://localhost:27017/srvs';

mongoose.connect(mongoURI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
  .then(() => {
    console.log('✓ MongoDB connected successfully');
  })
  .catch(err => {
    console.error('✗ MongoDB connection error:', err.message);
    console.log('Continuing without database connection...');
  });

// Health check route
app.get('/api/health', (req, res) => {
  const status = mongoose.connection.readyState === 1 ? 'connected' : 'disconnected';
  res.json({ 
    status: 'Server is running',
    database: status
  });
});

// Survey routes
app.use('/api/surveys', surveyRoutes);

// Sync routes
app.use('/api', syncRoutes);

// Auth routes (register, login, me)
app.use('/api/auth', authRoutes);

// Root route
app.get('/', (req, res) => {
  res.json({ message: 'SRVS Backend API is running' });
});

// ============== LINKEDIN OAUTH ENDPOINTS ==============

// Get LinkedIn authorization URL
app.get('/api/auth/linkedin', (req, res) => {
  const { verificationToken } = req.query;

  if (!LINKEDIN_CONFIG.clientId) {
    return res.status(500).json({
      error: 'LinkedIn OAuth not configured. Please set LINKEDIN_CLIENT_ID in .env'
    });
  }

  // Generate a random state for CSRF protection
  const state = crypto.randomBytes(16).toString('hex');

  // Store state with verification token for later use
  oauthStates.set(state, {
    verificationToken,
    createdAt: Date.now(),
    expiresAt: Date.now() + 10 * 60 * 1000 // 10 minutes
  });

  // Build LinkedIn authorization URL
  const authUrl = new URL('https://www.linkedin.com/oauth/v2/authorization');
  authUrl.searchParams.set('response_type', 'code');
  authUrl.searchParams.set('client_id', LINKEDIN_CONFIG.clientId);
  authUrl.searchParams.set('redirect_uri', LINKEDIN_CONFIG.redirectUri);
  authUrl.searchParams.set('state', state);
  authUrl.searchParams.set('scope', LINKEDIN_CONFIG.scope);

  console.log('[LINKEDIN] Auth URL generated for verification token:', verificationToken?.substring(0, 8) + '...');

  res.json({
    success: true,
    authUrl: authUrl.toString(),
    state
  });
});

// Exchange authorization code for access token
app.post('/api/auth/linkedin/callback', async (req, res) => {
  const { code, state } = req.body;

  if (!code || !state) {
    return res.status(400).json({ error: 'Missing code or state parameter' });
  }

  // Verify state to prevent CSRF
  const stateData = oauthStates.get(state);
  if (!stateData) {
    return res.status(400).json({ error: 'Invalid state parameter' });
  }

  if (Date.now() > stateData.expiresAt) {
    oauthStates.delete(state);
    return res.status(400).json({ error: 'State has expired' });
  }

  // Clean up used state
  oauthStates.delete(state);

  try {
    // Exchange code for access token
    const tokenResponse = await fetch('https://www.linkedin.com/oauth/v2/accessToken', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        client_id: LINKEDIN_CONFIG.clientId,
        client_secret: LINKEDIN_CONFIG.clientSecret,
        redirect_uri: LINKEDIN_CONFIG.redirectUri
      })
    });

    if (!tokenResponse.ok) {
      const errorData = await tokenResponse.json();
      console.error('[LINKEDIN] Token exchange failed:', errorData);
      return res.status(400).json({
        error: 'Failed to exchange authorization code',
        details: errorData
      });
    }

    const tokenData = await tokenResponse.json();
    console.log('[LINKEDIN] Token exchange successful');

    // Authentication successful - we have a valid access token
    // This proves the user authenticated with LinkedIn

    res.json({
      success: true,
      authenticated: true,
      verificationToken: stateData.verificationToken,
      message: 'LinkedIn authentication successful'
    });

  } catch (error) {
    console.error('[LINKEDIN] OAuth error:', error);
    res.status(500).json({
      error: 'LinkedIn authentication failed',
      message: error.message
    });
  }
});

// Clean up expired OAuth states periodically
setInterval(() => {
  const now = Date.now();
  for (const [state, data] of oauthStates.entries()) {
    if (now > data.expiresAt) {
      oauthStates.delete(state);
    }
  }
}, 60000); // Clean up every minute

// ============== EMAIL VERIFICATION ENDPOINTS ==============

// Send verification emails to multiple respondents (bulk) - SENDS REAL EMAILS
app.post('/api/email/send-bulk', async (req, res) => {
  const { respondents, baseUrl, smtpUser, smtpPass, companyType, useResend } = req.body;

  if (!respondents || respondents.length === 0) {
    return res.status(400).json({ error: 'No respondents provided' });
  }

  // Check if we should use Resend API (for production/cloud deployment)
  const shouldUseResend = useResend || process.env.USE_RESEND === 'true' || (resend && !smtpUser);

  let transporter;
  let emailMethod = 'smtp';

  if (shouldUseResend) {
    if (!resend) {
      return res.status(400).json({
        error: 'Resend API key not configured. Please set RESEND_API_KEY environment variable or provide SMTP credentials.'
      });
    }
    emailMethod = 'resend';
    console.log('[EMAIL] Using Resend API for email delivery');
  } else {
    // Validate SMTP credentials
    if (!smtpUser || !smtpPass) {
      return res.status(400).json({ error: 'SMTP credentials (smtpUser and smtpPass) are required' });
    }

    // Create a dynamic transporter using provided SMTP credentials
    try {
      transporter = nodemailer.createTransport({
        host: 'smtp.gmail.com',
        port: 587,
        secure: false,
        auth: {
          user: smtpUser,
          pass: smtpPass
        },
        pool: true,
        maxConnections: 5,
        maxMessages: 100,
        connectionTimeout: 10000,
        greetingTimeout: 10000,
        socketTimeout: 30000
      });

      await transporter.verify();
      console.log(`[EMAIL] SMTP verified for: ${smtpUser}`);
      await new Promise(resolve => setTimeout(resolve, 500));
    } catch (error) {
      console.error(`[EMAIL] SMTP verification failed for ${smtpUser}:`, error.message);

      // Suggest using Resend if SMTP fails
      const suggestion = resend
        ? ' Try enabling "Use Resend API" option instead.'
        : ' Consider using Resend API for cloud deployments (set RESEND_API_KEY env variable).';

      return res.status(400).json({
        error: `SMTP authentication failed: ${error.message}. Please check your email and app password.${suggestion}`
      });
    }
  }

  const results = [];
  const failed = [];
  const emailPromises = [];

  for (const respondent of respondents) {
    const { id: respondentId, email, name, attributesRequiringProof, alreadyVerifiedAttributes } = respondent;

    if (!email) {
      failed.push({ respondentId, error: 'No email address' });
      continue;
    }

    // Check if this is a partial verification (has already verified some attributes)
    const isPartialVerification = alreadyVerifiedAttributes && alreadyVerifiedAttributes.length > 0;

    // Generate verification token
    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

    verificationTokens.set(token, {
      respondentId,
      email,
      name,
      attributesRequiringProof: attributesRequiringProof || [],
      alreadyVerifiedAttributes: alreadyVerifiedAttributes || [],
      isPartialVerification,
      createdAt: new Date().toISOString(),
      expiresAt: expiresAt.toISOString(),
      used: false
    });

    const verificationLink = `${baseUrl || process.env.FRONTEND_URL || 'http://localhost:5173'}/verify/${token}`;

    // Email content - different templates for panel vs insight companies
    // Also different template for partial verification (reminder to complete)
    let emailContent;
    const remainingAttrs = attributesRequiringProof || [];
    const verifiedAttrs = alreadyVerifiedAttributes || [];

    if (isPartialVerification) {
      // Partial verification reminder email
      emailContent = {
        from: smtpUser,
        to: email,
        subject: 'Complete your verification - just a few more steps',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <p style="color: #333; font-size: 16px; margin-bottom: 20px;">Hi ${name?.split(' ')[0] || 'there'},</p>
            <p style="color: #333; font-size: 16px; line-height: 1.6; margin-bottom: 20px;">
              You're almost there! You've already verified <strong>${verifiedAttrs.length}</strong> attribute(s).
            </p>
            <div style="background-color: #e8f5e9; padding: 15px; border-radius: 8px; margin-bottom: 20px;">
              <p style="color: #2e7d32; font-size: 14px; margin: 0 0 10px 0; font-weight: bold;">Already Verified:</p>
              <p style="color: #2e7d32; font-size: 14px; margin: 0;">${verifiedAttrs.join(', ') || 'None'}</p>
            </div>
            <div style="background-color: #fff3e0; padding: 15px; border-radius: 8px; margin-bottom: 20px;">
              <p style="color: #e65100; font-size: 14px; margin: 0 0 10px 0; font-weight: bold;">Remaining to Verify:</p>
              <p style="color: #e65100; font-size: 14px; margin: 0;">${remainingAttrs.join(', ') || 'None'}</p>
            </div>
            <p style="color: #333; font-size: 16px; line-height: 1.6; margin-bottom: 25px;">
              Complete your verification to unlock full access to studies.
            </p>
            <div style="text-align: center; margin: 30px 0;">
              <a href="${verificationLink}" style="display: inline-block; padding: 14px 28px; background-color: #ff9800; color: white; text-decoration: none; border-radius: 5px; font-weight: bold; font-size: 16px;">
                Complete Verification →
              </a>
            </div>
            <p style="color: #666; font-size: 14px; text-align: center; margin-bottom: 30px;">
              Only takes a minute to finish.
            </p>
            <hr style="border: 1px solid #eee; margin: 20px 0;">
            <p style="color: #999; font-size: 12px;">${companyType === 'insight' ? 'Insight' : 'Panel'} company</p>
          </div>
        `,
        text: `Hi ${name?.split(' ')[0] || 'there'},\n\nYou're almost there! You've already verified ${verifiedAttrs.length} attribute(s).\n\nAlready Verified: ${verifiedAttrs.join(', ') || 'None'}\nRemaining to Verify: ${remainingAttrs.join(', ') || 'None'}\n\nComplete your verification to unlock full access to studies.\n\nComplete Verification: ${verificationLink}\n\nOnly takes a minute to finish.\n\n${companyType === 'insight' ? 'Insight' : 'Panel'} company`
      };
    } else if (companyType === 'insight') {
      emailContent = {
        from: smtpUser,
        to: email,
        subject: 'Less data shared, faster access to studies',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <p style="color: #333; font-size: 16px; margin-bottom: 20px;">Hi ${name?.split(' ')[0] || 'there'},</p>
            <p style="color: #333; font-size: 16px; line-height: 1.6; margin-bottom: 20px;">
              We're introducing a simpler, more private way to qualify for research.
            </p>
            <p style="color: #333; font-size: 16px; line-height: 1.6; margin-bottom: 20px;">
              Verify once. Get a credential that proves your eligibility — without revealing your personal details every time.
            </p>
            <p style="color: #333; font-size: 16px; line-height: 1.6; margin-bottom: 25px;">
              Your data stays yours. Matching to studies gets faster.
            </p>
            <div style="text-align: center; margin: 30px 0;">
              <a href="${verificationLink}" style="display: inline-block; padding: 14px 28px; background-color: #007bff; color: white; text-decoration: none; border-radius: 5px; font-weight: bold; font-size: 16px;">
                Get Verified →
              </a>
            </div>
            <p style="color: #666; font-size: 14px; text-align: center; margin-bottom: 30px;">
              Takes 2–3 minutes.
            </p>
            <hr style="border: 1px solid #eee; margin: 20px 0;">
            <p style="color: #999; font-size: 12px;">Insight company</p>
          </div>
        `,
        text: `Hi ${name?.split(' ')[0] || 'there'},\n\nWe're introducing a simpler, more private way to qualify for research.\n\nVerify once. Get a credential that proves your eligibility — without revealing your personal details every time.\n\nYour data stays yours. Matching to studies gets faster.\n\nGet Verified: ${verificationLink}\n\nTakes 2–3 minutes.\n\nInsight company`
      };
    } else {
      emailContent = {
        from: smtpUser,
        to: email,
        subject: 'Verify once, participate everywhere',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <p style="color: #333; font-size: 16px; margin-bottom: 20px;">Dear panelist,</p>
            <p style="color: #333; font-size: 16px; line-height: 1.6; margin-bottom: 20px;">
              We're changing how verification works — and it's better for you.
            </p>
            <p style="color: #333; font-size: 16px; line-height: 1.6; margin-bottom: 20px;">
              Instead of sharing the sensitive personal details for every survey, you'll get a secure credential that proves your eligibility without exposing your actual information.
            </p>
            <p style="color: #333; font-size: 16px; line-height: 1.6; margin-bottom: 25px;">
              One verification. Full privacy. Faster access to studies.
            </p>
            <p style="color: #666; font-size: 14px; margin-bottom: 20px;">
              Takes just a few minutes.
            </p>
            <div style="text-align: center; margin: 30px 0;">
              <a href="${verificationLink}" style="display: inline-block; padding: 14px 28px; background-color: #007bff; color: white; text-decoration: none; border-radius: 5px; font-weight: bold; font-size: 16px;">
                Verify Now →
              </a>
            </div>
            <hr style="border: 1px solid #eee; margin: 20px 0;">
            <p style="color: #999; font-size: 12px;">Panel company</p>
          </div>
        `,
        text: `Dear panelist,\n\nWe're changing how verification works — and it's better for you.\n\nInstead of sharing the sensitive personal details for every survey, you'll get a secure credential that proves your eligibility without exposing your actual information.\n\nOne verification. Full privacy. Faster access to studies.\n\nTakes just a few minutes.\n\nVerify Now: ${verificationLink}\n\nPanel company`
      };
    }

    sentEmails.push({
      ...emailContent,
      respondentId,
      token,
      sentAt: new Date().toISOString()
    });

    // Send email using either Resend or SMTP
    if (emailMethod === 'resend') {
      emailPromises.push(
        resend.emails.send({
          from: process.env.RESEND_FROM_EMAIL || 'SRVS <onboarding@resend.dev>',
          to: email,
          subject: emailContent.subject,
          html: emailContent.html,
          text: emailContent.text
        })
          .then(response => {
            // Resend returns { data: { id: '...' }, error: null } on success
            // or { data: null, error: { ... } } on failure
            if (response.error) {
              console.error(`[EMAIL] Resend API error for ${email}:`, response.error);
              failed.push({ respondentId, email, error: response.error.message || 'Resend API error' });
              return;
            }
            const messageId = response.data?.id || response.id;
            console.log(`[EMAIL] Sent via Resend to ${email} - ID: ${messageId}`);
            results.push({
              respondentId,
              email,
              verificationLink,
              token: token.substring(0, 8) + '...',
              realEmailSent: true,
              messageId: messageId,
              method: 'resend'
            });
          })
          .catch(error => {
            console.error(`[EMAIL] Resend failed to send to ${email}:`, error.message || error);
            failed.push({ respondentId, email, error: error.message || 'Unknown error' });
          })
      );
    } else {
      emailPromises.push(
        transporter.sendMail(emailContent)
          .then(info => {
            console.log(`[EMAIL] Sent via SMTP to ${email} - MessageId: ${info.messageId}`);
            results.push({
              respondentId,
              email,
              verificationLink,
              token: token.substring(0, 8) + '...',
              realEmailSent: true,
              messageId: info.messageId,
              method: 'smtp'
            });
          })
          .catch(error => {
            console.error(`[EMAIL] SMTP failed to send to ${email}:`, error.message);
            failed.push({ respondentId, email, error: error.message });
          })
      );
    }
  }

  if (emailPromises.length > 0) {
    await Promise.all(emailPromises);
  }

  if (transporter) {
    transporter.close();
  }

  console.log(`[BULK EMAIL] Sent ${results.length} emails, ${failed.length} failed`);

  res.json({
    success: true,
    message: `Sent ${results.length} verification emails`,
    sent: results.length,
    failed: failed.length,
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

  // Calculate recommended verification methods based on attributes
  const attrs = tokenData.attributesRequiringProof || [];
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
    alreadyVerifiedAttributes: tokenData.alreadyVerifiedAttributes || [],
    isPartialVerification: tokenData.isPartialVerification || false,
    recommendedVerificationMethods: recommendedMethods,
    message: tokenData.isPartialVerification
      ? 'Welcome back! Complete your remaining verification.'
      : 'Token is valid. Please complete your verification.'
  });
});

// Complete verification (after user submits proof)
app.post('/api/verify/:token/complete', (req, res) => {
  const { token } = req.params;
  const { proofData, verifiedAttributes, verificationMethod } = req.body;

  const tokenData = verificationTokens.get(token);

  if (!tokenData) {
    return res.status(404).json({ error: 'Invalid token' });
  }

  // Allow multiple calls for partial verification (LinkedIn then Document)
  // Only block if already fully verified
  if (tokenData.used && tokenData.proofStatus === 'verified') {
    return res.status(410).json({ error: 'Token already used and fully verified' });
  }

  // Get required attributes
  const requiredAttributes = tokenData.attributesRequiringProof || [];
  const verified = verifiedAttributes || [];

  // Calculate proof status based on verification progress
  // pending = not started, partial = some verified, verified = all verified
  let proofStatus = 'pending';
  let zkpResult = 'Pending';

  if (verified.length >= requiredAttributes.length && requiredAttributes.length > 0) {
    proofStatus = 'verified';
    zkpResult = 'Yes'; // When fully verified, ZKP result is Yes (criteria matched)
  } else if (verified.length > 0) {
    proofStatus = 'partial';
    zkpResult = 'Pending'; // Still pending until fully verified
  }

  // Store verification details in token data
  tokenData.verifiedAttributes = verified;
  tokenData.verificationMethod = verificationMethod;
  tokenData.proofStatus = proofStatus;

  // Only mark token as fully used when verification is complete
  if (proofStatus === 'verified') {
    tokenData.used = true;
    tokenData.usedAt = new Date().toISOString();
  }

  // Store completed verification (persists even after token expires)
  completedVerifications.set(tokenData.respondentId, {
    respondentId: tokenData.respondentId,
    proofStatus,
    zkpResult,
    verifiedAttributes: verified,
    requiredAttributes,
    verificationMethod,
    completedAt: new Date().toISOString()
  });

  console.log(`[VERIFICATION] ===============================`);
  console.log(`[VERIFICATION] Respondent: ${tokenData.respondentId}`);
  console.log(`[VERIFICATION] Method: ${verificationMethod}`);
  console.log(`[VERIFICATION] Required attrs: ${JSON.stringify(requiredAttributes)}`);
  console.log(`[VERIFICATION] Verified attrs: ${JSON.stringify(verified)}`);
  console.log(`[VERIFICATION] Status: ${proofStatus}, Verified: ${verified.length}/${requiredAttributes.length} attributes`);
  console.log(`[VERIFICATION] ZKP Result: ${zkpResult}`);
  console.log(`[VERIFICATION] ===============================`);

  res.json({
    success: true,
    message: 'Verification completed successfully',
    respondentId: tokenData.respondentId,
    proofStatus,
    zkpResult,
    verifiedAttributes: verified,
    requiredAttributes,
    verificationMethod
  });
});

// Get verification status for multiple respondents
app.post('/api/verification/status', (req, res) => {
  const { respondentIds } = req.body;

  if (!respondentIds || !Array.isArray(respondentIds)) {
    return res.status(400).json({ error: 'respondentIds array is required' });
  }

  const statuses = {};
  for (const id of respondentIds) {
    const verification = completedVerifications.get(id);
    if (verification) {
      statuses[id] = verification;
    }
  }

  res.json({
    success: true,
    verifications: statuses,
    totalRequested: respondentIds.length,
    totalFound: Object.keys(statuses).length
  });
});

// Get email info
app.get('/api/email/info', (req, res) => {
  res.json({
    message: 'Email sending requires SMTP credentials',
    howToSend: 'Use the "Send Verification to All" button in the Panelists page',
    note: 'Provide your SMTP email and App Password when sending emails'
  });
});

// Get all sent emails (admin/debug)
app.get('/api/admin/emails', (req, res) => {
  const adminKey = req.headers['x-admin-key'];

  if (adminKey !== 'admin-secret-key') {
    return res.status(403).json({ error: 'Admin access required' });
  }

  res.json({
    count: sentEmails.length,
    emails: sentEmails.slice(-50)
  });
});

// Clean up expired verification tokens periodically
setInterval(() => {
  const now = new Date();
  for (const [token, data] of verificationTokens.entries()) {
    if (new Date(data.expiresAt) < now) {
      verificationTokens.delete(token);
    }
  }
}, 3600000); // Clean up every hour

// 404 handler
app.use((req, res) => {
  res.status(404).json({ message: 'Route not found' });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(err.status || 500).json({ 
    message: err.message || 'Internal server error',
    error: process.env.NODE_ENV === 'development' ? err : {}
  });
});

// Start server
const PORT = process.env.PORT || 5000;
const server = app.listen(PORT, () => {
  console.log(`\n🚀 Server running on port ${PORT}`);
  console.log(`📍 API: http://localhost:${PORT}`);
  console.log(`🔗 Health check: http://localhost:${PORT}/api/health\n`);
});

// Handle graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM signal received: closing HTTP server');
  server.close(() => {
    console.log('HTTP server closed');
    mongoose.connection.close(false, () => {
      console.log('MongoDB connection closed');
      process.exit(0);
    });
  });
});
