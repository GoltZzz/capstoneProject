const express = require("express");
const router = express.Router();
const User = require("../models/user");
const catchAsync = require("../utils/catchAsync");
const passport = require("passport");
const users = require("../controllers/user");
const multer = require("multer");
const { profilePic } = require("../cloudinary/index");
const upload = multer({ storage: profilePic });
const { isLoggedIn, isAdmin } = require("../middleware");

router
	.route("/register")
	.get(isLoggedIn, isAdmin, users.renderRegisterForm)
	.post(upload.single("avatar"), catchAsync(users.createUser));

router
	.route("/login")
	.get(users.createLoginForm)
	.post(
		passport.authenticate("local", {
			failureFlash: true,
			failureRedirect: "/login",
			keepSessionInfo: true,
		}),
		users.login
	);
router.get("/logout", users.logout);

router.get("/contacts", isLoggedIn, users.createContactForm);
router.post("/contacts", users.sendReports);

router.get("/admin/users", isLoggedIn, isAdmin, users.adminDashboard);
router.get("/admin/users/:id", isLoggedIn, isAdmin, users.userShowPage);
router.delete(
	"/admin/users/:id",
	isLoggedIn,
	isAdmin,
	catchAsync(users.deleteUser)
);
module.exports = router;
