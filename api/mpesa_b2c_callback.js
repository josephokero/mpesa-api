/**
 * Vercel Serverless Function: M-Pesa B2C Callback Handler
 * 
 * Endpoint: https://mpesa-api-six.vercel.app/api/mpesa_b2c_callback
 * 
 * This receives M-Pesa B2C transaction results.
 * Updated: 2025-11-08
 */

module.exports = async (req, res) => {
  // Log the callback data
  console.log('📥 B2C Callback Received:', JSON.stringify(req.body, null, 2));

  // M-Pesa sends POST request with transaction result
  if (req.method === 'POST') {
    const callbackData = req.body;

    try {
      // Extract result from callback
      const result = callbackData.Result;
      
      if (result) {
        console.log('Result Code:', result.ResultCode);
        console.log('Result Description:', result.ResultDesc);
        
        if (result.ResultCode === 0) {
          // Success - extract transaction details
          const resultParameters = result.ResultParameters?.ResultParameter || [];
          
          const transactionData = {
            conversationId: result.ConversationID,
            originatorConversationId: result.OriginatorConversationID,
            transactionId: resultParameters.find(p => p.Key === 'TransactionID')?.Value,
            transactionAmount: resultParameters.find(p => p.Key === 'TransactionAmount')?.Value,
            transactionReceipt: resultParameters.find(p => p.Key === 'TransactionReceipt')?.Value,
            recipientPhone: resultParameters.find(p => p.Key === 'ReceiverPartyPublicName')?.Value,
            completedTime: resultParameters.find(p => p.Key === 'TransactionCompletedDateTime')?.Value,
            b2CUtilityAccountAvailableFunds: resultParameters.find(p => p.Key === 'B2CUtilityAccountAvailableFunds')?.Value,
            b2CWorkingAccountAvailableFunds: resultParameters.find(p => p.Key === 'B2CWorkingAccountAvailableFunds')?.Value,
            b2CRecipientIsRegisteredCustomer: resultParameters.find(p => p.Key === 'B2CRecipientIsRegisteredCustomer')?.Value,
            b2CChargesPaidAccountAvailableFunds: resultParameters.find(p => p.Key === 'B2CChargesPaidAccountAvailableFunds')?.Value,
          };
          
          console.log('✅ B2C Payment Successful:', transactionData);
          
          // Here you would typically:
          // 1. Update your database with transaction details
          // 2. Mark withdrawal as complete in Firestore
          // 3. Send notification to user
          
          // For now, just acknowledge receipt
          return res.status(200).json({
            ResultCode: 0,
            ResultDesc: 'Callback processed successfully',
          });
        } else {
          // Transaction failed
          console.error('❌ B2C Payment Failed:', result.ResultDesc);
          
          return res.status(200).json({
            ResultCode: result.ResultCode,
            ResultDesc: 'Callback processed - transaction failed',
          });
        }
      }
      
      return res.status(200).json({
        ResultCode: 0,
        ResultDesc: 'Callback received',
      });
      
    } catch (error) {
      console.error('Error processing B2C callback:', error);
      
      return res.status(200).json({
        ResultCode: 1,
        ResultDesc: 'Error processing callback',
      });
    }
  }

  // Return 200 OK for all requests (M-Pesa requirement)
  return res.status(200).json({
    ResultCode: 0,
    ResultDesc: 'OK',
  });
};
