const express = require('express');
const router = express.Router();
const { register, login, addEmployee, getStoreEmployees } = require('../controllers/authController');
const { protect } = require('../middleware/authMiddleware');

router.post('/register', register);
router.post('/login', login);
router.post('/add-employee', protect, addEmployee);
router.get('/employees', protect, getStoreEmployees); 

module.exports = router;