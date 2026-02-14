// Twilio Verify API (SMS & Email)
const https = require('https');

// Vercel serverless function handler
module.exports = async (req, res) => {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  
  try {
    const { phone, email, action, code, channel } = req.body;
    const verifyChannel = channel || 'sms'; // 'sms' or 'email'
    
    // Determine recipient based on channel
    let recipient;
    if (verifyChannel === 'email') {
      if (!email) {
        return res.status(400).json({ error: 'Email is required for email verification' });
      }
      recipient = email;
    } else {
      if (!phone) {
        return res.status(400).json({ error: 'Phone number is required' });
      }
      // Format phone number (ensure it starts with +)
      recipient = phone.replace(/[^\d+]/g, '');
      if (!recipient.startsWith('+')) {
        recipient = '+' + recipient;
      }
    }
    
    // Twilio credentials (set in Vercel environment variables)
    const accountSid = process.env.TWILIO_ACCOUNT_SID;
    const authToken = process.env.TWILIO_AUTH_TOKEN;
    const verifySid = process.env.TWILIO_VERIFY_SID;
    
    // Check if credentials are configured
    if (!accountSid || !authToken || !verifySid) {
      // DEMO MODE
      if (action === 'verify') {
        if (code === '123456') {
          return res.status(200).json({
            success: true,
            status: 'approved',
            message: `${verifyChannel === 'email' ? 'Email' : 'Phone'} verified (demo mode)`
          });
        }
        return res.status(200).json({
          success: false,
          status: 'pending',
          message: 'Invalid code. Use 123456 for demo.'
        });
      }
      return res.status(200).json({
        success: true,
        demo: true,
        demoCode: '123456',
        message: 'Demo mode: Use code 123456',
        recipient: recipient,
        channel: verifyChannel
      });
    }
    
    const authString = Buffer.from(`${accountSid}:${authToken}`).toString('base64');
    
    if (action === 'verify') {
      // Verify the code
      if (!code) {
        return res.status(400).json({ error: 'Verification code is required' });
      }
      
      const checkData = `To=${encodeURIComponent(recipient)}&Code=${code}`;
      
      const checkResult = await makeRequest(
        'verify.twilio.com',
        `/v2/Services/${verifySid}/VerificationCheck`,
        checkData,
        authString
      );
      
      console.log('Verify result:', checkResult);
      
      if (checkResult.status === 'approved') {
        return res.status(200).json({
          success: true,
          status: 'approved',
          message: `${verifyChannel === 'email' ? 'Email' : 'Phone'} verified successfully!`
        });
      } else {
        return res.status(200).json({
          success: false,
          status: checkResult.status || 'pending',
          message: checkResult.message || 'Invalid code. Please try again.'
        });
      }
      
    } else {
      // Send verification code
      const sendData = `To=${encodeURIComponent(recipient)}&Channel=${verifyChannel}`;
      
      const sendResult = await makeRequest(
        'verify.twilio.com',
        `/v2/Services/${verifySid}/Verifications`,
        sendData,
        authString
      );
      
      console.log('Send result:', sendResult);
      
      if (sendResult.status === 'pending') {
        return res.status(200).json({
          success: true,
          status: 'pending',
          message: `Verification code sent via ${verifyChannel}!`,
          recipient: recipient,
          channel: verifyChannel
        });
      } else {
        return res.status(200).json({
          success: false,
          error: sendResult.message || 'Failed to send code',
          details: sendResult
        });
      }
    }
    
  } catch (error) {
    console.error('Verification Error:', error);
    return res.status(500).json({
      error: 'Failed to process verification',
      details: error.message
    });
  }
};

function makeRequest(host, path, postData, authString) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: host,
      port: 443,
      path: path,
      method: 'POST',
      headers: {
        'Authorization': `Basic ${authString}`,
        'Content-Type': 'application/x-www-form-urlencoded',
        'Content-Length': Buffer.byteLength(postData)
      }
    };
    
    const request = https.request(options, (response) => {
      let data = '';
      response.on('data', chunk => data += chunk);
      response.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch (e) {
          resolve({ raw: data, status: 'error' });
        }
      });
    });
    
    request.on('error', reject);
    request.write(postData);
    request.end();
  });
}
