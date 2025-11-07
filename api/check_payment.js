// Simple payment status checker
// This allows Flutter app to poll for payment status

const callbackCache = require('./mpesa_callback').callbackCache || new Map();

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ success: false, message: 'Method not allowed' });
  }

  try {
    const { checkoutRequestId } = req.query;

    if (!checkoutRequestId) {
      return res.status(400).json({ 
        success: false, 
        message: 'checkoutRequestId required' 
      });
    }

    const paymentData = callbackCache.get(checkoutRequestId);

    if (!paymentData) {
      return res.status(200).json({ 
        success: false, 
        status: 'pending',
        message: 'Payment not yet confirmed' 
      });
    }

    return res.status(200).json({
      success: true,
      ...paymentData
    });
  } catch (error) {
    console.error('Check payment error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to check payment status',
      error: error.message,
    });
  }
};
