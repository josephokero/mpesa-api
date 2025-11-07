module.exports = (req, res) => {
  console.log('M-Pesa Callback:', req.body);
  res.status(200).json({ ResultCode: 0, ResultDesc: 'Success' });
};
