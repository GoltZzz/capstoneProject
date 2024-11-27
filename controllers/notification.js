const User = require("../models/user");
const Location = require("../models/sfas");
const Notification = require("../models/notifications");

module.exports.showNotification = async (req, res) => {
    try {
        const { id } = req.params;
        const notification = await Notification.findById(id).populate("location");
        
        if (!notification) {
            req.flash("error", "Notification not found");
            return res.redirect("/admin/users");
        }

        res.render("modals/notification", { notification });
    } catch (err) {
        console.error(err);
        req.flash("error", "Error showing notification");
        res.redirect("/admin/users");
    }
};

module.exports.markAsRead = async (req, res) => {
    try {
        const { id } = req.params;
        const notification = await Notification.findById(id);
        
        if (!notification) {
            req.flash("error", "Notification not found");
            return res.redirect("/admin/users");
        }

        notification.isRead = true;
        await notification.save();
        
        req.flash("success", "Notification marked as read");
        res.redirect("/admin/users");
    } catch (err) {
        console.error(err);
        req.flash("error", "Error marking notification as read");
        res.redirect("/admin/users");
    }
};

module.exports.deleteNotification = async (req, res) => {
    try {
        const { id } = req.params;
        await Notification.findByIdAndDelete(id);
        req.flash("success", "Notification deleted successfully");
        res.redirect("/admin/users");
    } catch (err) {
        console.error(err);
        req.flash("error", "Error deleting notification");
        res.redirect("/admin/users");
    }
};
