const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const authMiddleware = require('../middleware/auth');
const authorizeRoles = require('../middleware/role');
const verifyCaptcha = require('../middleware/captcha');

router.post('/register', verifyCaptcha, authController.register);
router.post('/login', verifyCaptcha, authController.login);
router.post('/logout', authController.logout);
router.post('/change-password', authMiddleware, authController.changePassword);

router.get('/protected', authMiddleware, (req, res) => {
res.json({ message: "Protected route works!" });
});

router.get(
'/admin',
authMiddleware,
authorizeRoles('Admin'),
(req, res) => {
res.json({ message: 'Welcome Admin!' });
}
);

module.exports = router;
