const admin = require('firebase-admin');

// Initialize Firebase Admin if not already initialized
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    }),
  });
}

const db = admin.firestore();

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

      // Extract userId from CheckoutRequestID or lookup by phone
      // The STK Push request should include AccountReference as 'WALLET-{userId}'
      let userId = null;
      
      // Try to find matching pending STK request (would need to store this)
      // For now, we'll save without userId and let Flutter app match by checkoutRequestId
      
      // Save transaction to Firestore
      await db.collection('transactions').add({
        type: 'topup',
        amount: amount,
        phoneNumber: phoneNumber?.toString(),
        status: 'completed',
        checkoutRequestId: CheckoutRequestID,
        mpesaReceiptNumber: mpesaReceiptNumber,
        transactionDate: transactionDate?.toString(),
        timestamp: admin.firestore.FieldValue.serverTimestamp(),
        description: 'M-Pesa Wallet Top-Up',
        resultCode: ResultCode,
        resultDesc: ResultDesc,
        // userId will be matched by Flutter app using checkoutRequestId
      });

      console.log('Transaction saved successfully');
    } else {
      console.log('Payment failed or cancelled:', ResultDesc);
      
      // Save failed transaction
      await db.collection('transactions').add({
        type: 'topup',
        status: 'failed',
        checkoutRequestId: CheckoutRequestID,
        timestamp: admin.firestore.FieldValue.serverTimestamp(),
        resultCode: ResultCode,
        resultDesc: ResultDesc,
      });
    }

    // Always respond with success to M-Pesa
    return res.status(200).json({ ResultCode: 0, ResultDesc: 'Success' });
  } catch (error) {
    console.error('Callback processing error:', error);
    // Still return success to M-Pesa to avoid retries
    return res.status(200).json({ ResultCode: 0, ResultDesc: 'Success' });
  }
};
