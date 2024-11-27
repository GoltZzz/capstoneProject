const Notification = require("../models/notifications");

module.exports.loadNotifications = async (req, res, next) => {
    if (req.user && req.user.isAdmin) {
        try {
            const notifications = await Notification.find({ isAdmin: true })
                .populate("location")
                .sort({ timestamp: -1 })  // Sort by newest first
                .limit(10);  // Limit to 10 most recent notifications
            
            res.locals.notifications = notifications;
            res.locals.unreadCount = notifications.filter(n => !n.isRead).length;
        } catch (err) {
            console.error("Error loading notifications:", err);
            res.locals.notifications = [];
            res.locals.unreadCount = 0;
        }
    } else {
        res.locals.notifications = [];
        res.locals.unreadCount = 0;
    }
    next();
};
