const axios = require('axios');

const MPESA_CONFIG = {
  consumerKey: process.env.MPESA_CONSUMER_KEY || 'ZQp50qtvMb0GmTAghhQgnRpPsywr8dJbPbHCPNYhmtE9KO80',
  consumerSecret: process.env.MPESA_CONSUMER_SECRET || 'yJqm1QE8uOGJaJjSU6ePRgwRlWlITmbF7amWxX6wNEQyUpPALL3SbgFkohTSmHjt',
  shortCode: process.env.MPESA_SHORTCODE || '8499486',
  passKey: process.env.MPESA_PASSKEY || '82d0342a54624998fb5e2d6f907ad30a0b19fc86cc41aef0c63c95fcb45d2103',
  productionUrl: 'https://api.safaricom.co.ke',
};

async function getAccessToken() {
  const auth = Buffer.from(`${MPESA_CONFIG.consumerKey}:${MPESA_CONFIG.consumerSecret}`).toString('base64');
  const response = await axios.get(`${MPESA_CONFIG.productionUrl}/oauth/v1/generate?grant_type=client_credentials`, {
    headers: { Authorization: `Basic ${auth}` },
  });
  return response.data.access_token;
}

function generateTimestamp() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const hours = String(now.getHours()).padStart(2, '0');
  const minutes = String(now.getMinutes()).padStart(2, '0');
  const seconds = String(now.getSeconds()).padStart(2, '0');
  return `${year}${month}${day}${hours}${minutes}${seconds}`;
}

function generatePassword(timestamp) {
  return Buffer.from(`${MPESA_CONFIG.shortCode}${MPESA_CONFIG.passKey}${timestamp}`).toString('base64');
}

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, message: 'Method not allowed' });
  }

  try {
    const { phoneNumber, amount, accountReference, transactionDesc } = req.body;

    if (!phoneNumber || !amount) {
      return res.status(400).json({ success: false, message: 'Phone number and amount required' });
    }

    const phone = phoneNumber.startsWith('254') ? phoneNumber : `254${phoneNumber.replace(/^0+/, '')}`;
    const accessToken = await getAccessToken();
    const timestamp = generateTimestamp();
    const password = generatePassword(timestamp);

    const stkPushPayload = {
      BusinessShortCode: MPESA_CONFIG.shortCode,
      Password: password,
      Timestamp: timestamp,
      TransactionType: 'CustomerPayBillOnline',
      Amount: Math.round(amount),
      PartyA: phone,
      PartyB: MPESA_CONFIG.shortCode,
      PhoneNumber: phone,
      CallBackURL: `${process.env.VERCEL_URL || 'https://sureboda-mpesa.vercel.app'}/api/mpesa_callback`,
      AccountReference: accountReference || 'SUREBODA',
      TransactionDesc: transactionDesc || 'Payment',
    };

    const response = await axios.post(
      `${MPESA_CONFIG.productionUrl}/mpesa/stkpush/v1/processrequest`,
      stkPushPayload,
      { headers: { Authorization: `Bearer ${accessToken}` } }
    );

    return res.status(200).json({
      success: true,
      message: 'STK push sent successfully',
      checkoutRequestId: response.data.CheckoutRequestID,
      customerMessage: response.data.CustomerMessage,
    });
  } catch (error) {
    console.error('M-Pesa Error:', error.response?.data || error.message);
    return res.status(500).json({
      success: false,
      message: 'Failed to initiate payment',
      error: error.response?.data || error.message,
    });
  }
};
