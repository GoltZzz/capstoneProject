const express = require("express");
const router = express.Router();
const Notif = require("../controllers/notification");
const catchAsync = require("../utils/catchAsync");

router.route("/:id").get(catchAsync(Notif.showNotification));

module.exports = router;
