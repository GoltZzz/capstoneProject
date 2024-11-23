const User = require("../models/user");
const Location = require("../models/sfas");
const Notification = require("../models/notifications");

module.exports.showNotification = async (req, res) => {
	const { id } = req.params;
	const notification = await Notification.findById(id).populate("location");
	notification.isRead = true;
	await notification.save();
	if (req.user.isAdmin && notification.isRead) {
		await Notification.findByIdAndDelete(id);
	}
	try {
		res.render("modals/notification", { notification });
	} catch (err) {
		console.error(err);
		req.flash("error", "Error deleting notification");
		res.redirect("/admin/users");
	}
};
