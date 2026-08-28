const SibApiV3Sdk = require('sib-api-v3-sdk');

const defaultClient = SibApiV3Sdk.ApiClient.instance;
const apiKey = defaultClient.authentications['api-key'];

// Brevo API key from .env
apiKey.apiKey = process.env.BREVO_API_KEY;

const tranEmailApi = new SibApiV3Sdk.TransactionalEmailsApi();

module.exports = {
  tranEmailApi,
  senderEmail: process.env.SENDER_EMAIL || 'billpesupportservice@gmail.com'
};