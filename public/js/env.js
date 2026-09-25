// Fallback config used when index.html is opened directly (no server).
// When you run `npm start`, server.js serves this file from your .env instead.
window.MYTRM_ENV = {
  APP_ENV: "local",
  RAZORPAY_KEY_ID: "rzp_test_xxxxxxxx",
  PAYMENT_MODE: "simulated",
  GST_RATE: 0.18,
  SUPPORT_EMAIL: "support@mytrm.in"
};
