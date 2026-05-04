const axios = require('axios');

const TOKEN_URL = process.env.TOKEN_URL || 'https://id.dev.longvan.vn/authorization/public/TRUE_DOC/oauth2/api/v1/token/4dd0726c-594e-4509-8118-528d8be46deb';
const SLACK_WEBHOOK_URL = process.env.SLACK_WEBHOOK_URL;
const DISCORD_WEBHOOK_URL = process.env.DISCORD_WEBHOOK_URL;
const EMAIL_SERVICE_URL = process.env.EMAIL_SERVICE_URL;

// Cấu hình thời gian cảnh báo (tính bằng giây)
const WARNING_THRESHOLDS = {
  CRITICAL: 24 * 60 * 60, // 1 ngày
  WARNING: 7 * 24 * 60 * 60, // 7 ngày
  INFO: 30 * 24 * 60 * 60 // 30 ngày
};

async function checkTokenExpiry() {
  try {
    console.log(`🔍 Checking token validity at: ${new Date().toISOString()}`);
    console.log(`📍 Token URL: ${TOKEN_URL}`);
    
    // Step 1: Get token info
    const response = await axios.get(TOKEN_URL, {
      timeout: 30000,
      headers: {
        'User-Agent': 'GitHub-Action-Token-Checker/1.0'
      }
    });
    
    console.log(`✅ Response status: ${response.status}`);
    console.log(`📄 Response data:`, JSON.stringify(response.data, null, 2));
    
    const tokenData = response.data;
    
    // Step 2: Check if we have an access token
    if (!tokenData.accessToken) {
      throw new Error('No access token found in response');
    }
    
    const accessToken = tokenData.accessToken;
    console.log(`🔑 Access Token: ${accessToken.substring(0, 8)}...`);
    
    // Step 3: Test token validity by calling a protected API
    // You need to replace this with an actual protected endpoint from your system
    const protectedEndpoints = [
      'https://id.dev.longvan.vn/api/user/profile',
      'https://id.dev.longvan.vn/api/auth/validate',
      'https://id.dev.longvan.vn/authorization/validate'
    ];
    
    let tokenValid = false;
    let lastError = null;
    
    for (const endpoint of protectedEndpoints) {
      try {
        console.log(`🧪 Testing token with endpoint: ${endpoint}`);
        const testResponse = await axios.get(endpoint, {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'User-Agent': 'GitHub-Action-Token-Checker/1.0'
          },
          timeout: 15000
        });
        
        if (testResponse.status === 200) {
          console.log(`✅ Token is valid - endpoint responded with 200`);
          tokenValid = true;
          break;
        }
      } catch (error) {
        console.log(`❌ Endpoint ${endpoint} failed: ${error.response?.status || error.message}`);
        lastError = error;
        
        // If we get 401 Unauthorized, token is definitely expired
        if (error.response?.status === 401) {
          console.log(`🚨 Token is EXPIRED - got 401 Unauthorized`);
          await sendNotification('CRITICAL', `🚨 TOKEN ĐÃ HẾT HẠN! API trả về 401 Unauthorized`, {
            token_url: TOKEN_URL,
            test_endpoint: endpoint,
            error_status: 401,
            checked_at: new Date().toISOString()
          });
          return;
        }
      }
    }
    
    if (!tokenValid) {
      // If all endpoints failed but not with 401, it might be network/endpoint issues
      console.log(`⚠️  Cannot validate token - all test endpoints failed`);
      await sendNotification('WARNING', `⚠️ Không thể xác thực token - tất cả endpoint test đều thất bại. Có thể do network hoặc endpoint không tồn tại.`, {
        token_url: TOKEN_URL,
        test_endpoints: protectedEndpoints,
        last_error: lastError?.message,
        checked_at: new Date().toISOString()
      });
      return;
    }
    
    // If we reach here, token is valid
    console.log(`✅ Token is VALID and working`);
    
    // Since we don't have expiry info, we'll just report that token is working
    // You might want to set up manual expiry tracking or ask for the expiry date
    await sendNotification('INFO', `✅ Token đang hoạt động bình thường. Kiểm tra lúc: ${new Date().toLocaleString('vi-VN')}`, {
      token_url: TOKEN_URL,
      status: 'valid',
      checked_at: new Date().toISOString(),
      note: 'API không cung cấp thông tin expiry - chỉ có thể kiểm tra tính hợp lệ'
    });
    
    console.log(`📅 Found expiry field: ${expiryField} = ${expiryTime}`);
    
    // Xử lý thời gian expiry
    let expiryDate;
    
    if (typeof expiryTime === 'number') {
      // Nếu là timestamp (seconds hoặc milliseconds)
      if (expiryTime > 1000000000000) {
        // Milliseconds
        expiryDate = new Date(expiryTime);
      } else {
        // Seconds
        expiryDate = new Date(expiryTime * 1000);
      }
    } else if (typeof expiryTime === 'string') {
      // Nếu là string date
      expiryDate = new Date(expiryTime);
    } else {
      throw new Error(`Unsupported expiry time format: ${typeof expiryTime}`);
    }
    
    if (isNaN(expiryDate.getTime())) {
      throw new Error(`Invalid expiry date: ${expiryTime}`);
    }
    
    const now = new Date();
    const timeUntilExpiry = Math.floor((expiryDate.getTime() - now.getTime()) / 1000);
    
    console.log(`⏰ Current time: ${now.toISOString()}`);
    console.log(`⏰ Expiry time: ${expiryDate.toISOString()}`);
    console.log(`⏳ Time until expiry: ${timeUntilExpiry} seconds (${Math.floor(timeUntilExpiry / 86400)} days)`);
    
    // Xác định mức độ cảnh báo
    let alertLevel = 'INFO';
    let message = '';
    
    if (timeUntilExpiry <= 0) {
      alertLevel = 'CRITICAL';
      message = `🚨 TOKEN ĐÃ HẾT HẠN! Hết hạn lúc: ${expiryDate.toISOString()}`;
    } else if (timeUntilExpiry <= WARNING_THRESHOLDS.CRITICAL) {
      alertLevel = 'CRITICAL';
      message = `🚨 TOKEN SẮP HẾT HẠN! Còn lại: ${Math.floor(timeUntilExpiry / 3600)} giờ (hết hạn lúc: ${expiryDate.toISOString()})`;
    } else if (timeUntilExpiry <= WARNING_THRESHOLDS.WARNING) {
      alertLevel = 'WARNING';
      message = `⚠️  Token sẽ hết hạn trong ${Math.floor(timeUntilExpiry / 86400)} ngày (${expiryDate.toISOString()})`;
    } else if (timeUntilExpiry <= WARNING_THRESHOLDS.INFO) {
      alertLevel = 'INFO';
      message = `ℹ️  Token còn ${Math.floor(timeUntilExpiry / 86400)} ngày (hết hạn: ${expiryDate.toISOString()})`;
    } else {
      console.log(`✅ Token còn hạn lâu: ${Math.floor(timeUntilExpiry / 86400)} ngày`);
      return; // Không gửi thông báo nếu còn hạn lâu
    }
    
    console.log(`📢 Alert level: ${alertLevel}`);
    console.log(`📝 Message: ${message}`);
    
    await sendNotification(alertLevel, message, {
      token_url: TOKEN_URL,
      expiry_field: expiryField,
      expiry_time: expiryTime,
      expiry_date: expiryDate.toISOString(),
      time_until_expiry_seconds: timeUntilExpiry,
      time_until_expiry_days: Math.floor(timeUntilExpiry / 86400)
    });
    
  } catch (error) {
    console.error('❌ Error checking token expiry:', error.message);
    console.error('Stack trace:', error.stack);
    
    await sendNotification('ERROR', `Lỗi khi kiểm tra token: ${error.message}`, {
      error: error.message,
      stack: error.stack,
      token_url: TOKEN_URL
    });
    
    process.exit(1);
  }
}

async function sendNotification(level, message, data) {
  const notifications = [];
  
  // Slack notification
  if (SLACK_WEBHOOK_URL) {
    notifications.push(sendSlackNotification(level, message, data));
  }
  
  // Discord notification
  if (DISCORD_WEBHOOK_URL) {
    notifications.push(sendDiscordNotification(level, message, data));
  }
  
  // Email notification (nếu có service)
  if (EMAIL_SERVICE_URL) {
    notifications.push(sendEmailNotification(level, message, data));
  }
  
  // GitHub Actions annotation
  notifications.push(createGitHubAnnotation(level, message));
  
  await Promise.allSettled(notifications);
}

async function sendSlackNotification(level, message, data) {
  try {
    const color = {
      'CRITICAL': '#FF0000',
      'WARNING': '#FFA500', 
      'INFO': '#0099CC',
      'ERROR': '#8B0000'
    }[level] || '#808080';
    
    const payload = {
      attachments: [{
        color: color,
        title: `Token Expiry Check - ${level}`,
        text: message,
        fields: [
          {
            title: 'Token URL',
            value: TOKEN_URL,
            short: false
          },
          {
            title: 'Check Time',
            value: new Date().toISOString(),
            short: true
          }
        ],
        footer: 'GitHub Actions Token Monitor',
        ts: Math.floor(Date.now() / 1000)
      }]
    };
    
    await axios.post(SLACK_WEBHOOK_URL, payload);
    console.log('✅ Slack notification sent');
  } catch (error) {
    console.error('❌ Failed to send Slack notification:', error.message);
  }
}

async function sendDiscordNotification(level, message, data) {
  try {
    const color = {
      'CRITICAL': 16711680, // Red
      'WARNING': 16753920,  // Orange
      'INFO': 43775,        // Blue
      'ERROR': 9109504      // Dark red
    }[level] || 8421504;    // Gray
    
    const payload = {
      embeds: [{
        title: `Token Expiry Check - ${level}`,
        description: message,
        color: color,
        fields: [
          {
            name: 'Token URL',
            value: TOKEN_URL,
            inline: false
          },
          {
            name: 'Check Time',
            value: new Date().toISOString(),
            inline: true
          }
        ],
        footer: {
          text: 'GitHub Actions Token Monitor'
        },
        timestamp: new Date().toISOString()
      }]
    };
    
    await axios.post(DISCORD_WEBHOOK_URL, payload);
    console.log('✅ Discord notification sent');
  } catch (error) {
    console.error('❌ Failed to send Discord notification:', error.message);
  }
}

async function sendEmailNotification(level, message, data) {
  try {
    const payload = {
      level: level,
      subject: `Token Expiry Alert - ${level}`,
      message: message,
      data: data,
      timestamp: new Date().toISOString()
    };
    
    await axios.post(EMAIL_SERVICE_URL, payload);
    console.log('✅ Email notification sent');
  } catch (error) {
    console.error('❌ Failed to send email notification:', error.message);
  }
}

function createGitHubAnnotation(level, message) {
  const annotation = {
    'CRITICAL': '::error::',
    'WARNING': '::warning::',
    'INFO': '::notice::',
    'ERROR': '::error::'
  }[level] || '::notice::';
  
  console.log(`${annotation}${message}`);
}

// Chạy kiểm tra
checkTokenExpiry();