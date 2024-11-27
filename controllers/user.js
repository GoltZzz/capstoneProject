const User = require("../models/user");
const Location = require("../models/sfas");
const Notification = require("../models/notifications");
const mailgun = require("mailgun-js");

const mg = mailgun({
	apiKey: process.env.MAILGUN_API_KEY,
	domain: process.env.MAILGUN_DOMAIN,
});

module.exports.renderRegisterForm = async (req, res) => {
	res.render("users/register");
};

module.exports.createUser = async (req, res, next) => {
	try {
		const {
			username,
			email,
			password,
			role,
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
		
		// Set admin status based on role selection
		if (role === 'admin') {
			registeredUser.isAdmin = true;
		} else {
			registeredUser.isAdmin = false;
		}
		
		await registeredUser.save();
		req.flash("success", `${firstName} ${lastName} has been created successfully as a ${role}!`);
		res.redirect("/admin/users");
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
	const usersCount = await User.countDocuments();
	
	// Get locations for each user
	const usersWithLocationsPromises = users.map(async (user) => {
		const locations = await Location.find({ owner: user._id });
		return {
			...user.toObject(),
			locations: locations
		};
	});
	const usersWithLocations = await Promise.all(usersWithLocationsPromises);
	
	const usersWithLocationsCount = usersWithLocations.filter(
		(user) => user.locations.length > 0
	).length;

	const notifications = await Notification.find({ isAdmin: true }).populate(
		"location"
	);
	const notificationCount = notifications.length;

	res.render("users/index", {
		users: usersWithLocations,
		usersCount,
		usersWithLocations: usersWithLocationsCount,
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

module.exports.userLocations = async (req, res) => {
    const { id } = req.params;
    const user = await User.findById(id);
    
    if (!user) {
        req.flash('error', 'User not found');
        return res.redirect('/admin/users');
    }

    const locations = await Location.find({ owner: user._id });
    
    res.render('users/locations', { 
        user: {
            ...user.toObject(),
            locations: locations
        }
    });
};

module.exports.createContactForm = async (req, res) => {
	const user = await User.findById(req.user._id);
	const locations = await Location.find({ owner: user._id });
	
	if (!locations || locations.length === 0) {
		req.flash("error", "You need to add at least one location before sending an email report");
		return res.redirect("/sfas");
	}
	
	res.render("users/contacts", { locations });
};

module.exports.sendReports = async (req, res) => {
	const report = "Hello Admin, here is the report: ...";
	const { from, email, message, location } = req.body;
	try {
		const user = await User.findById(req.user._id);
		const locations = await Location.find({ owner: user._id });
		
		if (!locations || locations.length === 0) {
			req.flash("error", "You need to add at least one location before sending an email report");
			return res.redirect("/sfas");
		}

		if (!location) {
			req.flash("error", "Please select a location for your report");
			return res.redirect("/contacts");
		}

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

module.exports.deleteUser = async (req, res) => {
	const { id } = req.params;
	try {
		const locations = await Location.find({ owner: id });
		const locationIds = locations.map((location) => location._id);
		await Location.deleteMany({ owner: id });
		await Notification.deleteMany({ sender: id });
		await User.findByIdAndUpdate(id, {
			$pull: { locations: { $in: locationIds } },
		});
		await User.findByIdAndDelete(id);
		req.flash("success", "User deleted successfully!");
		res.redirect("/admin/users");
	} catch (error) {
		req.flash("error", "Error deleting user");
		res.redirect("/admin/users");
	}
};
