const express = require('express');
const dotenv = require('dotenv');
const cors = require('cors');
const connectDB = require('./config/db');
const errorHandler = require('./middleware/errorHandler');

dotenv.config();
connectDB();

const app = express();

app.use(express.json());
app.use(cors());

app.get('/api/app-version', (req, res) => {
  res.json({
    success: true,
    latestVersion: process.env.APP_LATEST_VERSION || '1.0.0',
    isMandatory: false
  });
});

app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/products', require('./routes/productRoutes'));
app.use('/api/sales', require('./routes/salesRoutes'));
app.use('/api/payment', require('./routes/paymentRoutes'));

app.get('/', (req, res) => {
  res.send('BillPe POS & Subscription Backend API is running successfully...');
});

app.use(errorHandler);

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`BillPe Server running on port ${PORT}`);
});