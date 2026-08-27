const { tranEmailApi, senderEmail } = require('../config/brevo');

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
          <p style="color: #cbd5e1;">Your 6-digit OTP to reset your password is below:</p>
          <div style="background-color: #1e293b; padding: 15px; text-align: center; border-radius: 8px; margin: 20px 0;">
            <span style="font-size: 28px; font-weight: bold; letter-spacing: 5px; color: #38bdf8;">${otp}</span>
          </div>
          <p style="color: #94a3b8; font-size: 12px;">This OTP is valid for 10 minutes only.</p>
        </div>
      `
    });
    return true;
  } catch (error) {
    console.error('Brevo Email Error:', error.response?.body || error.message);
    throw new Error('Failed to send OTP email.');
  }
};

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
          <p style="color: #cbd5e1;">6-digit OTP to verify your account:</p>
          <div style="background-color: #1e293b; padding: 15px; text-align: center; border-radius: 8px; margin: 20px 0;">
            <span style="font-size: 28px; font-weight: bold; letter-spacing: 5px; color: #10b981;">${otp}</span>
          </div>
          <p style="color: #94a3b8; font-size: 12px;">This OTP is valid for 10 minutes only.</p>
        </div>
      `
    });
    return true;
  } catch (error) {
    console.error('Brevo Reg Email Error:', error.response?.body || error.message);
    throw new Error('Failed to send registration OTP.');
  }
};