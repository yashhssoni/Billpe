const { tranEmailApi, senderEmail } = require('../config/brevo');

// 1. Password Reset Email
exports.sendPasswordResetEmail = async (toEmail, otp) => {
  try {
    const sender = {
      email: senderEmail,
      name: 'BillPe Security'
    };

    await tranEmailApi.sendTransacEmail({
      sender,
      to: [{ email: toEmail }],
      subject: 'BillPe - Password Reset OTP',
      htmlContent: `
        <div style="font-family: Arial, sans-serif; padding: 20px; background-color: #0f172a; color: #ffffff; border-radius: 10px;">
          <h2 style="color: #10b981;">BillPe Password Reset</h2>
          <p style="color: #cbd5e1;">Aapka password reset karne ke liye 6-digit OTP niche diya gaya hai:</p>
          <div style="background-color: #1e293b; padding: 15px; text-align: center; border-radius: 8px; margin: 20px 0;">
            <span style="font-size: 28px; font-weight: bold; letter-spacing: 5px; color: #38bdf8;">${otp}</span>
          </div>
          <p style="color: #94a3b8; font-size: 12px;">Yeh OTP sirf 10 minutes ke liye valid hai.</p>
        </div>
      `
    });
    return true;
  } catch (error) {
    console.error('Brevo Email Error:', error.response?.body || error.message);
    throw new Error('Failed to send OTP email.');
  }
};

// 2. Registration Verification Email
exports.sendRegistrationOtpEmail = async (toEmail, otp) => {
  try {
    const sender = {
      email: senderEmail,
      name: 'BillPe Verification'
    };

    await tranEmailApi.sendTransacEmail({
      sender,
      to: [{ email: toEmail }],
      subject: 'BillPe - Store Registration Verification OTP',
      htmlContent: `
        <div style="font-family: Arial, sans-serif; padding: 20px; background-color: #0f172a; color: #ffffff; border-radius: 10px;">
          <h2 style="color: #10b981;">Welcome to BillPe</h2>
          <p style="color: #cbd5e1;">Aapka account verify karne ke liye 6-digit OTP:</p>
          <div style="background-color: #1e293b; padding: 15px; text-align: center; border-radius: 8px; margin: 20px 0;">
            <span style="font-size: 28px; font-weight: bold; letter-spacing: 5px; color: #10b981;">${otp}</span>
          </div>
          <p style="color: #94a3b8; font-size: 12px;">Yeh OTP sirf 10 minutes ke liye valid hai.</p>
        </div>
      `
    });
    return true;
  } catch (error) {
    console.error('Brevo Reg Email Error:', error.response?.body || error.message);
    throw new Error('Failed to send registration OTP.');
  }
};