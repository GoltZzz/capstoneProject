const express = require('express');
const router = express.Router();
const { isLoggedIn } = require('../middleware');
const api = require('../controllers/api');

router.get('/notifications/unread-count', isLoggedIn, api.getUnreadCount);

module.exports = router;