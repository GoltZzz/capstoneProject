const User = require("../models/user");
const Notification = require("../models/notifications");

module.exports.getUnreadCount = async (req, res) => {
    try {
        const query = req.user.isAdmin ? { isAdmin: true } : { user: req.user._id };
        const unreadCount = await Notification.countDocuments({ ...query, isRead: false });
        res.json({ unreadCount });
    } catch (err) {
        console.error(err);
        req.flash("error", "Error getting unread notifications count");
        res.redirect("/admin/users");
    }
};
