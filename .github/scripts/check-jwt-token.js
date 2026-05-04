const axios = require('axios');

const TOKEN_URL = process.env.TOKEN_URL || 'https://id.dev.longvan.vn/authorization/public/TRUE_DOC/oauth2/api/v1/token/4dd0726c-594e-4509-8118-528d8be46deb';

async function checkJWTToken() {
  try {
    console.log(`🔍 Checking JWT token at: ${new Date().toISOString()}`);
    
    // Get token info
    const response = await axios.get(TOKEN_URL, { timeout: 30000 });
    const tokenData = response.data;
    
    if (!tokenData.accessToken) {
      throw new Error('No access token found');
    }
    
    const accessToken = tokenData.accessToken;
    console.log(`🔑 Access Token: ${accessToken.substring(0, 20)}...`);
    
    // Check if it's a JWT (has 3 parts separated by dots)
    const tokenParts = accessToken.split('.');
    
    if (tokenParts.length !== 3) {
      console.log(`❌ Token is not a JWT (has ${tokenParts.length} parts, expected 3)`);
      console.log(`🔍 Token format: ${accessToken.length} characters`);
      console.log(`📝 Token sample: ${accessToken.substring(0, 50)}...`);
      return false;
    }
    
    try {
      // Decode JWT payload (middle part)
      const payload = JSON.parse(Buffer.from(tokenParts[1], 'base64').toString());
      console.log(`📄 JWT Payload:`, JSON.stringify(payload, null, 2));
      
      // Check for expiry
      if (payload.exp) {
        const expiryDate = new Date(payload.exp * 1000); // JWT exp is in seconds
        const now = new Date();
        const timeUntilExpiry = Math.floor((expiryDate.getTime() - now.getTime()) / 1000);
        const daysUntilExpiry = Math.floor(timeUntilExpiry / 86400);
        
        console.log(`⏰ JWT Expiry: ${expiryDate.toISOString()}`);
        console.log(`⏳ Time until expiry: ${daysUntilExpiry} days`);
        
        return {
          isJWT: true,
          expiryDate: expiryDate,
          daysUntilExpiry: daysUntilExpiry,
          payload: payload
        };
      } else {
        console.log(`⚠️  JWT payload doesn't contain 'exp' field`);
        return { isJWT: true, hasExpiry: false, payload: payload };
      }
      
    } catch (decodeError) {
      console.log(`❌ Failed to decode JWT: ${decodeError.message}`);
      return false;
    }
    
  } catch (error) {
    console.error(`❌ Error checking JWT token: ${error.message}`);
    return false;
  }
}

// Run the check
checkJWTToken().then(result => {
  if (result) {
    console.log(`✅ JWT analysis completed:`, result);
  } else {
    console.log(`❌ Token is not a valid JWT or analysis failed`);
  }
});