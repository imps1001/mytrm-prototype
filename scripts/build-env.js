// Vercel build step: writes public/js/env.js from environment variables,
// replacing what server.js generates on the fly when running locally.
// Only public keys go here. Never add secrets.
const fs = require("fs");
const path = require("path");

const PUBLIC_ENV = {
  APP_ENV: process.env.APP_ENV || "production",
  RAZORPAY_KEY_ID: process.env.RAZORPAY_KEY_ID || "rzp_test_xxxxxxxx",
  PAYMENT_MODE: process.env.PAYMENT_MODE || "simulated",
  GST_RATE: Number(process.env.GST_RATE) || 0.18,
  SUPPORT_EMAIL: process.env.SUPPORT_EMAIL || "support@mytrm.in"
};

const out = path.join(__dirname, "..", "public", "js", "env.js");
fs.writeFileSync(out, "window.MYTRM_ENV = " + JSON.stringify(PUBLIC_ENV, null, 2) + ";\n");
console.log("Wrote " + out);
