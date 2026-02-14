const axios = require('axios');

// Firestore REST API (no Firebase Admin SDK needed)
// Payment transactions are stored in astute-empire project
const FIRESTORE_PROJECT_ID = 'astute-empire';
const FIRESTORE_API = `https://firestore.googleapis.com/v1/projects/${FIRESTORE_PROJECT_ID}/databases/(default)/documents`;

module.exports = async (req, res) => {
  console.log('M-Pesa Callback received:', JSON.stringify(req.body, null, 2));

  try {
    const { Body } = req.body;
    
    if (!Body || !Body.stkCallback) {
      console.log('Invalid callback structure');
      return res.status(200).json({ ResultCode: 0, ResultDesc: 'Success' });
    }

    const { ResultCode, ResultDesc, CheckoutRequestID, CallbackMetadata } = Body.stkCallback;

    console.log(`Payment Result: ${ResultCode} - ${ResultDesc}`);
    console.log(`CheckoutRequestID: ${CheckoutRequestID}`);

    // ResultCode 0 = Success
    if (ResultCode === 0 && CallbackMetadata) {
      const metadata = CallbackMetadata.Item;
      
      // Extract payment details
      const amount = metadata.find(item => item.Name === 'Amount')?.Value;
      const mpesaReceiptNumber = metadata.find(item => item.Name === 'MpesaReceiptNumber')?.Value;
      const phoneNumber = metadata.find(item => item.Name === 'PhoneNumber')?.Value;
      const transactionDate = metadata.find(item => item.Name === 'TransactionDate')?.Value;

      console.log('Payment successful:', { amount, mpesaReceiptNumber, phoneNumber });

      // Save to Firestore using REST API
      const transactionData = {
        fields: {
          type: { stringValue: 'topup' },
          amount: { doubleValue: parseFloat(amount) },
          phoneNumber: { stringValue: phoneNumber?.toString() || '' },
          status: { stringValue: 'completed' },
          checkoutRequestId: { stringValue: CheckoutRequestID },
          mpesaReceiptNumber: { stringValue: mpesaReceiptNumber || '' },
          transactionDate: { stringValue: transactionDate?.toString() || '' },
          timestamp: { timestampValue: new Date().toISOString() },
          description: { stringValue: 'M-Pesa Wallet Top-Up' },
          resultCode: { integerValue: ResultCode },
          resultDesc: { stringValue: ResultDesc || '' },
        }
      };

      try {
        await axios.post(`${FIRESTORE_API}/transactions`, transactionData);
        console.log('Transaction saved to Firestore successfully');
      } catch (firestoreError) {
        console.error('Firestore save error:', firestoreError.response?.data || firestoreError.message);
      }
    } else {
      console.log('Payment failed or cancelled:', ResultDesc);
      
      // Save failed transaction
      const failedData = {
        fields: {
          type: { stringValue: 'topup' },
          status: { stringValue: 'failed' },
          checkoutRequestId: { stringValue: CheckoutRequestID },
          timestamp: { timestampValue: new Date().toISOString() },
          resultCode: { integerValue: ResultCode },
          resultDesc: { stringValue: ResultDesc || '' },
        }
      };

      try {
        await axios.post(`${FIRESTORE_API}/transactions`, failedData);
        console.log('Failed transaction saved to Firestore');
      } catch (firestoreError) {
        console.error('Firestore save error:', firestoreError.response?.data || firestoreError.message);
      }
    }

    // Always respond with success to M-Pesa
    return res.status(200).json({ ResultCode: 0, ResultDesc: 'Success' });
  } catch (error) {
    console.error('Callback processing error:', error);
    // Still return success to M-Pesa to avoid retries
    return res.status(200).json({ ResultCode: 0, ResultDesc: 'Success' });
  }
};
