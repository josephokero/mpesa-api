/**
 * Vercel Serverless Function: M-Pesa B2C (Business to Customer) Withdrawal
 * 
 * Endpoint: https://mpesa-api-six.vercel.app/api/mpesa_b2c_withdrawal
 * 
 * This function sends money from business wallet to customer's M-Pesa account.
 * Used for rider withdrawals.
 * Updated: 2025-11-08
 */

const axios = require('axios');

// M-Pesa Configuration
const MPESA_CONFIG = {
  consumerKey: process.env.MPESA_CONSUMER_KEY || 'ZQp50qtvMb0GmTAghhQgnRpPsywr8dJbPbHCPNYhmtE9KO80',
  consumerSecret: process.env.MPESA_CONSUMER_SECRET || 'yJqm1QE8uOGJaJjSU6ePRgwRlWlITmbF7amWxX6wNEQyUpPALL3SbgFkohTSmHjt',
  shortCode: process.env.MPESA_B2C_SHORTCODE || '8499486',
  initiatorName: process.env.MPESA_INITIATOR_NAME || 'testapi',
  securityCredential: process.env.MPESA_SECURITY_CREDENTIAL || 'Safaricom999!*!',
  isProduction: process.env.MPESA_ENV === 'production',
  sandboxUrl: 'https://sandbox.safaricom.co.ke',
  productionUrl: 'https://api.safaricom.co.ke',
  callbackUrl: process.env.MPESA_B2C_CALLBACK_URL || 'https://mpesa-api-six.vercel.app/api/mpesa_b2c_callback',
  timeoutUrl: process.env.MPESA_B2C_TIMEOUT_URL || 'https://mpesa-api-six.vercel.app/api/mpesa_b2c_timeout',
};

const BASE_URL = MPESA_CONFIG.isProduction ? MPESA_CONFIG.productionUrl : MPESA_CONFIG.sandboxUrl;

// Generate OAuth Access Token
async function getAccessToken() {
  try {
    console.log(`🔑 Getting OAuth token from: ${BASE_URL}/oauth/v1/generate`);
    console.log(`Environment: ${MPESA_CONFIG.isProduction ? 'PRODUCTION' : 'SANDBOX'}`);
    
    const auth = Buffer.from(
      `${MPESA_CONFIG.consumerKey}:${MPESA_CONFIG.consumerSecret}`
    ).toString('base64');

    const response = await axios.get(
      `${BASE_URL}/oauth/v1/generate?grant_type=client_credentials`,
      {
        headers: {
          Authorization: `Basic ${auth}`,
        },
      }
    );

    console.log('✅ Access token obtained successfully');
    return response.data.access_token;
  } catch (error) {
    console.error('❌ Error getting access token:', error.response?.data || error.message);
    throw new Error('Failed to get M-Pesa access token: ' + (error.response?.data?.errorMessage || error.message));
  }
}

// Main Handler
module.exports = async (req, res) => {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // Handle preflight request
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({
      success: false,
      message: 'Method not allowed. Use POST.',
    });
  }

  try {
    const { phoneNumber, amount, remarks = 'Withdrawal from SUREBODA' } = req.body;

    // Validate input
    if (!phoneNumber || !amount) {
      return res.status(400).json({
        success: false,
        message: 'Phone number and amount are required',
      });
    }

    // Validate amount
    const withdrawalAmount = parseFloat(amount);
    if (isNaN(withdrawalAmount) || withdrawalAmount < 10) {
      return res.status(400).json({
        success: false,
        message: 'Amount must be at least KSH 10',
      });
    }

    if (withdrawalAmount > 150000) {
      return res.status(400).json({
        success: false,
        message: 'Amount exceeds daily withdrawal limit of KSH 150,000',
      });
    }

    // Format phone number (remove spaces, ensure starts with 254)
    let formattedPhone = phoneNumber.replace(/\s/g, '');
    if (formattedPhone.startsWith('0')) {
      formattedPhone = '254' + formattedPhone.substring(1);
    } else if (formattedPhone.startsWith('+254')) {
      formattedPhone = formattedPhone.substring(1);
    } else if (!formattedPhone.startsWith('254')) {
      formattedPhone = '254' + formattedPhone;
    }

    console.log(`📤 Initiating B2C withdrawal to ${formattedPhone} for KSH ${withdrawalAmount}`);

    // Get access token
    const accessToken = await getAccessToken();

    // Prepare B2C request
    const b2cPayload = {
      InitiatorName: MPESA_CONFIG.initiatorName,
      SecurityCredential: MPESA_CONFIG.securityCredential,
      CommandID: 'BusinessPayment', // or 'SalaryPayment', 'PromotionPayment'
      Amount: Math.floor(withdrawalAmount), // Must be integer
      PartyA: MPESA_CONFIG.shortCode, // Business shortcode
      PartyB: formattedPhone, // Customer phone number
      Remarks: remarks.substring(0, 100), // Max 100 chars
      QueueTimeOutURL: MPESA_CONFIG.timeoutUrl,
      ResultURL: MPESA_CONFIG.callbackUrl,
      Occasion: 'Withdrawal', // Optional, max 100 chars
    };

    console.log('B2C Payload:', JSON.stringify(b2cPayload, null, 2));

    // Send B2C request to M-Pesa
    const response = await axios.post(
      `${BASE_URL}/mpesa/b2c/v1/paymentrequest`,
      b2cPayload,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
      }
    );

    console.log('M-Pesa B2C Response:', response.data);

    // Check if request was successful
    if (response.data.ResponseCode === '0') {
      return res.status(200).json({
        success: true,
        message: 'Withdrawal initiated successfully',
        conversationId: response.data.ConversationID,
        originatorConversationId: response.data.OriginatorConversationID,
        responseCode: response.data.ResponseCode,
        responseDescription: response.data.ResponseDescription,
      });
    } else {
      return res.status(400).json({
        success: false,
        message: response.data.ResponseDescription || 'B2C payment failed',
        responseCode: response.data.ResponseCode,
      });
    }

  } catch (error) {
    console.error('❌ B2C Withdrawal Error:', error.response?.data || error.message);
    
    return res.status(500).json({
      success: false,
      message: error.response?.data?.errorMessage || error.message || 'Failed to process withdrawal',
      details: error.response?.data,
    });
  }
};
