# SUREBODA M-Pesa API

Simple Vercel serverless API for M-Pesa payments.

## Endpoints

- `POST /api/mpesa_stk_push` - Initiate M-Pesa payment
- `POST /api/mpesa_callback` - Payment callback

## Deploy to Vercel

1. Create new project on Vercel
2. Connect this repository
3. Add environment variables:
   - MPESA_CONSUMER_KEY
   - MPESA_CONSUMER_SECRET
   - MPESA_SHORTCODE
   - MPESA_PASSKEY
4. Deploy!
