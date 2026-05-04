const express = require('express');
const cors = require('cors');
const axios = require('axios');
const fs = require('fs').promises;
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// In-memory storage (trong production nên dùng database)
let tokenHistory = [];
let notifications = [];

// Configuration
const CONFIG = {
  TOKEN_URL: process.env.TOKEN_URL || 'https://id.dev.longvan.vn/authorization/public/TRUE_DOC/oauth2/api/v1/token/4dd0726c-594e-4509-8118-528d8be46deb',
  CHECK_INTERVAL: 6 * 60 * 60 * 1000, // 6 hours
  GITHUB_TOKEN: process.env.GITHUB_TOKEN,
  REPO_OWNER: process.env.REPO_OWNER,
  REPO_NAME: process.env.REPO_NAME
};

// API Routes

// Get current token status
app.get('/api/token/status', async (req, res) => {
  try {
    const response = await axios.get(CONFIG.TOKEN_URL, { timeout: 30000 });
    const tokenData = response.data;
    
    // Find expiry field
    const expiryFields = ['expires_at', 'expiry', 'exp', 'expiration', 'expires_in'];
    let expiryTime = null;
    let expiryField = null;
    
    for (const field of expiryFields) {
      if (tokenData[field]) {
        expiryField = field;
        expiryTime = tokenData[field];
        break;
      }
    }
    
    if (!expiryTime) {
      return res.status(400).json({
        error: 'No expiry information found',
        available_fields: Object.keys(tokenData)
      });
    }
    
    // Parse expiry time
    let expiryDate;
    if (typeof expiryTime === 'number') {
      expiryDate = expiryTime > 1000000000000 ? 
        new Date(expiryTime) : new Date(expiryTime * 1000);
    } else {
      expiryDate = new Date(expiryTime);
    }
    
    const now = new Date();
    const timeUntilExpiry = Math.floor((expiryDate.getTime() - now.getTime()) / 1000);
    const daysUntilExpiry = Math.floor(timeUntilExpiry / 86400);
    
    // Determine status
    let status = 'ok';
    if (timeUntilExpiry <= 0) {
      status = 'expired';
    } else if (timeUntilExpiry <= 24 * 60 * 60) {
      status = 'critical';
    } else if (timeUntilExpiry <= 7 * 24 * 60 * 60) {
      status = 'warning';
    }
    
    const result = {
      status,
      expiry_date: expiryDate.toISOString(),
      expiry_field: expiryField,
      expiry_value: expiryTime,
      time_until_expiry_seconds: timeUntilExpiry,
      days_until_expiry: daysUntilExpiry,
      checked_at: now.toISOString(),
      token_url: CONFIG.TOKEN_URL
    };
    
    // Save to history
    tokenHistory.unshift({
      ...result,
      id: Date.now()
    });
    
    // Keep only last 100 records
    if (tokenHistory.length > 100) {
      tokenHistory = tokenHistory.slice(0, 100);
    }
    
    res.json(result);
    
  } catch (error) {
    console.error('Error checking token:', error.message);
    res.status(500).json({
      error: 'Failed to check token',
      message: error.message,
      checked_at: new Date().toISOString()
    });
  }
});

// Get token history
app.get('/api/token/history', (req, res) => {
  const limit = parseInt(req.query.limit) || 50;
  res.json({
    history: tokenHistory.slice(0, limit),
    total: tokenHistory.length
  });
});

// Get GitHub Actions status
app.get('/api/github/actions', async (req, res) => {
  if (!CONFIG.GITHUB_TOKEN || !CONFIG.REPO_OWNER || !CONFIG.REPO_NAME) {
    return res.status(400).json({
      error: 'GitHub configuration missing',
      required: ['GITHUB_TOKEN', 'REPO_OWNER', 'REPO_NAME']
    });
  }
  
  try {
    const headers = {
      'Authorization': `token ${CONFIG.GITHUB_TOKEN}`,
      'Accept': 'application/vnd.github.v3+json'
    };
    
    // Get workflows
    const workflowsResponse = await axios.get(
      `https://api.github.com/repos/${CONFIG.REPO_OWNER}/${CONFIG.REPO_NAME}/actions/workflows`,
      { headers }
    );
    
    // Find token expiry workflow
    const tokenWorkflow = workflowsResponse.data.workflows.find(w => 
      w.name.toLowerCase().includes('token') && 
      w.name.toLowerCase().includes('expiry')
    );
    
    if (!tokenWorkflow) {
      return res.status(404).json({
        error: 'Token expiry workflow not found'
      });
    }
    
    // Get recent runs
    const runsResponse = await axios.get(
      `https://api.github.com/repos/${CONFIG.REPO_OWNER}/${CONFIG.REPO_NAME}/actions/workflows/${tokenWorkflow.id}/runs?per_page=10`,
      { headers }
    );
    
    const runs = runsResponse.data.workflow_runs;
    const lastRun = runs[0];
    
    // Calculate next run time (every 6 hours)
    let nextRun = null;
    if (lastRun) {
      const lastRunTime = new Date(lastRun.created_at);
      nextRun = new Date(lastRunTime.getTime() + CONFIG.CHECK_INTERVAL);
    }
    
    res.json({
      workflow: {
        id: tokenWorkflow.id,
        name: tokenWorkflow.name,
        state: tokenWorkflow.state,
        url: tokenWorkflow.html_url
      },
      last_run: lastRun ? {
        id: lastRun.id,
        status: lastRun.status,
        conclusion: lastRun.conclusion,
        created_at: lastRun.created_at,
        updated_at: lastRun.updated_at,
        url: lastRun.html_url
      } : null,
      next_run: nextRun ? nextRun.toISOString() : null,
      recent_runs: runs.slice(0, 5).map(run => ({
        id: run.id,
        status: run.status,
        conclusion: run.conclusion,
        created_at: run.created_at,
        url: run.html_url
      }))
    });
    
  } catch (error) {
    console.error('Error fetching GitHub Actions:', error.message);
    res.status(500).json({
      error: 'Failed to fetch GitHub Actions data',
      message: error.message
    });
  }
});

// Get notifications status
app.get('/api/notifications', (req, res) => {
  res.json({
    channels: {
      slack: {
        enabled: !!process.env.SLACK_WEBHOOK_URL,
        status: 'active'
      },
      discord: {
        enabled: !!process.env.DISCORD_WEBHOOK_URL,
        status: 'active'
      },
      email: {
        enabled: !!process.env.EMAIL_SERVICE_URL,
        status: 'active'
      }
    },
    recent_notifications: notifications.slice(0, 10)
  });
});

// Send test notification
app.post('/api/notifications/test', async (req, res) => {
  const { channel } = req.body;
  
  try {
    const testMessage = `🧪 Test notification from Token Monitor Dashboard - ${new Date().toISOString()}`;
    
    if (channel === 'slack' && process.env.SLACK_WEBHOOK_URL) {
      await axios.post(process.env.SLACK_WEBHOOK_URL, {
        text: testMessage,
        attachments: [{
          color: '#36a64f',
          title: 'Dashboard Test Notification',
          text: 'This is a test message from the Token Monitor Dashboard',
          footer: 'Token Monitor',
          ts: Math.floor(Date.now() / 1000)
        }]
      });
    } else if (channel === 'discord' && process.env.DISCORD_WEBHOOK_URL) {
      await axios.post(process.env.DISCORD_WEBHOOK_URL, {
        embeds: [{
          title: 'Dashboard Test Notification',
          description: testMessage,
          color: 3553599,
          footer: { text: 'Token Monitor' },
          timestamp: new Date().toISOString()
        }]
      });
    } else {
      return res.status(400).json({
        error: 'Channel not configured or invalid',
        channel
      });
    }
    
    // Log notification
    notifications.unshift({
      id: Date.now(),
      channel,
      type: 'test',
      message: testMessage,
      sent_at: new Date().toISOString(),
      status: 'success'
    });
    
    res.json({ success: true, message: 'Test notification sent' });
    
  } catch (error) {
    console.error('Error sending test notification:', error.message);
    
    notifications.unshift({
      id: Date.now(),
      channel,
      type: 'test',
      message: `Failed to send test notification: ${error.message}`,
      sent_at: new Date().toISOString(),
      status: 'error'
    });
    
    res.status(500).json({
      error: 'Failed to send test notification',
      message: error.message
    });
  }
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    version: '1.0.0'
  });
});

// Serve dashboard
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Token Monitor Dashboard running on port ${PORT}`);
  console.log(`📊 Dashboard: http://localhost:${PORT}`);
  console.log(`🔍 API Health: http://localhost:${PORT}/api/health`);
  
  // Initial token check
  setTimeout(() => {
    axios.get(`http://localhost:${PORT}/api/token/status`)
      .then(() => console.log('✅ Initial token check completed'))
      .catch(err => console.error('❌ Initial token check failed:', err.message));
  }, 1000);
});

module.exports = app;