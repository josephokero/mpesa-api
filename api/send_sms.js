// Twilio SMS API - Send Messages
const https = require('https');

// Helper to parse body if not already parsed
function parseBody(req) {
  if (typeof req.body === 'object' && req.body !== null) {
    return req.body;
  }
  try {
    return JSON.parse(req.body || '{}');
  } catch (e) {
    return {};
  }
}

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
    const body = parseBody(req);
    const { phone, message } = body;
    
    if (!phone) {
      return res.status(400).json({ error: 'Phone number is required', receivedBody: typeof req.body });
    }
    
    if (!message) {
      return res.status(400).json({ error: 'Message is required' });
    }
    
    // Format phone number (ensure it starts with +)
    let formattedPhone = phone.replace(/[^\d+]/g, '');
    if (!formattedPhone.startsWith('+')) {
      formattedPhone = '+' + formattedPhone;
    }
    
    // Twilio credentials (set in Vercel environment variables)
    const accountSid = process.env.TWILIO_ACCOUNT_SID;
    const authToken = process.env.TWILIO_AUTH_TOKEN;
    const messagingServiceSid = process.env.TWILIO_MESSAGING_SERVICE_SID;
    
    // Check if credentials are configured
    if (!accountSid || !authToken || !messagingServiceSid) {
      // DEMO MODE - just log and return success
      console.log('SMS (Demo Mode):', { to: formattedPhone, message: message.substring(0, 50) + '...' });
      return res.status(200).json({
        success: true,
        demo: true,
        message: 'SMS queued (demo mode - Twilio not configured)',
        to: formattedPhone
      });
    }
    
    // Send SMS via Twilio using Messaging Service
    const postData = new URLSearchParams({
      To: formattedPhone,
      MessagingServiceSid: messagingServiceSid,
      Body: message
    }).toString();
    
    const options = {
      hostname: 'api.twilio.com',
      port: 443,
      path: `/2010-04-01/Accounts/${accountSid}/Messages.json`,
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Content-Length': Buffer.byteLength(postData),
        'Authorization': 'Basic ' + Buffer.from(accountSid + ':' + authToken).toString('base64')
      }
    };
    
    const result = await new Promise((resolve, reject) => {
      const twilioReq = https.request(options, (twilioRes) => {
        let data = '';
        twilioRes.on('data', chunk => data += chunk);
        twilioRes.on('end', () => {
          try {
            const parsed = JSON.parse(data);
            if (twilioRes.statusCode >= 200 && twilioRes.statusCode < 300) {
              resolve({ success: true, sid: parsed.sid, status: parsed.status });
            } else {
              resolve({ success: false, error: parsed.message || 'Failed to send SMS' });
            }
          } catch (e) {
            reject(new Error('Failed to parse Twilio response'));
          }
        });
      });
      
      twilioReq.on('error', reject);
      twilioReq.write(postData);
      twilioReq.end();
    });
    
    return res.status(200).json(result);
    
  } catch (error) {
    console.error('SMS API Error:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: error.message
    });
  }
};
