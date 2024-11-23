const User = require("../models/user");
const Location = require("../models/sfas");
const Notification = require("../models/notifications");
const mailgun = require("mailgun-js");

const mg = mailgun({
	apiKey: process.env.MAILGUN_API_KEY,
	domain: process.env.MAILGUN_DOMAIN,
});

module.exports.renderRegisterForm = (req, res) => {
	res.render("users/register");
};

module.exports.createUser = async (req, res, next) => {
	try {
		const {
			username,
			email,
			password,
			adminCode,
			firstName,
			lastName,
			avatar,
		} = req.body;
		const user = new User({ email, username, firstName, lastName });
		const registeredUser = await User.register(user, password);
		if (req.file && Array.isArray(req.file)) {
			registeredUser.avatars = req.file.map((f) => ({
				url: f.path,
				filename: f.filename,
			}));
		} else if (req.file) {
			registeredUser.avatars = {
				url: req.file.path,
				filename: req.file.filename,
			};
		}
		console.log(registeredUser.avatars);
		if (adminCode === "thisisnotagoodadmincode") {
			registeredUser.isAdmin = true;
			console.log(registeredUser);
		}
		await registeredUser.save();
		req.flash("success", "User created successfully!");
		res.redirect("/admin/users"); // redirect to the admin dashboard or a success page
	} catch (error) {
		req.flash("error", error.message);
		res.redirect("/register");
	}
};

module.exports.createLoginForm = (req, res) => {
	res.render("users/login");
};

module.exports.login = (req, res) => {
	req.flash("success", "Logged in successfully!");
	const redirectUrl = req.session.returnTo || "/admin/users";
	delete req.session.returnTo;
	res.redirect(redirectUrl);
};

module.exports.logout = (req, res) => {
	req.logout(function (err) {
		if (err) {
			return next(err);
		}
		req.flash("success", "Logged out successfully!");
		res.redirect("/");
	});
};

module.exports.adminDashboard = async (req, res) => {
	const users = await User.find();
	const usersCount = await User.countAll();
	const notifications = await Notification.find({ isAdmin: true }).populate(
		"location"
	);
	const notificationCount = notifications.length;
	const notificationIds = notifications.map((notification) => notification._id);
	await Notification.updateMany(
		{ _id: { $in: notificationIds } },
		{ $set: { isRead: true } }
	);
	res.render("users/index", {
		users,
		usersCount,
		notifications,
		notificationCount,
	});
};

module.exports.userShowPage = async (req, res, next) => {
	const { id } = req.params;
	const user = await User.findById(id);

	if (!user) {
		req.flash("error", "User Not Found");
		return res.redirect("/admin/users");
	}

	const locations = await Location.find({ owner: user._id });
	user.locations = locations;

	res.render("users/show", { user });
};

module.exports.createContactForm = async (req, res) => {
	const user = await User.findById(req.user._id);
	const locations = await Location.find({ owner: user._id });
	res.render("users/contacts", { locations });
};

module.exports.sendReports = async (req, res) => {
	const report = "Hello Admin, here is the report: ...";
	const { from, email, message, location } = req.body;
	try {
		const user = await User.findById(req.user._id);
		const selectedLocation = await Location.findById(location);
		if (!selectedLocation) {
			req.flash("error", "Location not found");
			return res.redirect("/sfas");
		}
		const emailData = {
			from: email,
			to: "humbledog01@gmail.com",
			subject: report,
			text: message,
			html: `
        <h1>Hello Admin</h1>
        <p>Here is the report:</p>
        <p><strong>From:</strong> ${from}</p>
        <p><strong>Email:</strong> ${email}</p>
        <p><strong>Message:</strong> ${message}</p>
        <p><strong>Device Location:</strong> ${selectedLocation.title} - ${selectedLocation.location}</p>
      `,
		};
		console.log("Email data:", emailData);

		const response = await mg.messages().send(emailData, { html: true });

		const notification = new Notification({
			name: `${req.user.firstName} ${req.user.lastName}`,
			email: emailData.email,
			message: emailData.text,
			isAdmin: true,
			location: selectedLocation._id,
		});
		await notification.save();
		console.log("Email response:", response, notification);
		req.flash("success", "Email sent successfully!");
		res.redirect("/sfas");
	} catch (error) {
		console.error("Error sending email:", error);
		req.flash("error", `Error sending email: ${error.message}`);
		res.redirect("/contacts");
	}
};
