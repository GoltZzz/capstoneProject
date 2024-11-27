const Notification = require('../models/notifications');
const socket = require('../config/socket');

// Rate limiting configuration
const RATE_LIMIT_WINDOW = 60000; // 1 minute
const MAX_NOTIFICATIONS_PER_WINDOW = 10;
const notificationCounts = new Map();

// Notification grouping configuration
const GROUP_WINDOW = 5000; // 5 seconds
const pendingNotifications = new Map();

// Cleanup configuration
const NOTIFICATION_TTL = 30 * 24 * 60 * 60 * 1000; // 30 days

// Rate limiting function
function checkRateLimit(userId) {
    const now = Date.now();
    const userCounts = notificationCounts.get(userId) || [];
    
    // Remove old timestamps
    const recentCounts = userCounts.filter(timestamp => now - timestamp < RATE_LIMIT_WINDOW);
    
    if (recentCounts.length >= MAX_NOTIFICATIONS_PER_WINDOW) {
        return false;
    }
    
    recentCounts.push(now);
    notificationCounts.set(userId, recentCounts);
    return true;
}

// Notification cleanup function
async function cleanupOldNotifications() {
    const cutoffDate = new Date(Date.now() - NOTIFICATION_TTL);
    try {
        const result = await Notification.deleteMany({ createdAt: { $lt: cutoffDate } });
        console.log(`Cleaned up ${result.deletedCount} old notifications`);
    } catch (error) {
        console.error('Error cleaning up old notifications:', error);
    }
}

// Schedule cleanup to run daily
setInterval(cleanupOldNotifications, 24 * 60 * 60 * 1000);

// Group and emit notifications
function emitGroupedNotifications(userId, notification) {
    const io = socket.getIO();
    const pending = pendingNotifications.get(userId) || [];
    pending.push(notification);
    pendingNotifications.set(userId, pending);

    // If this is the first notification in the group, schedule the emission
    if (pending.length === 1) {
        setTimeout(() => {
            const notifications = pendingNotifications.get(userId) || [];
            pendingNotifications.delete(userId);

            if (notifications.length > 1) {
                // Group similar notifications
                const grouped = notifications.reduce((acc, curr) => {
                    const key = curr.type || 'default';
                    acc[key] = acc[key] || [];
                    acc[key].push(curr);
                    return acc;
                }, {});

                // Emit grouped notifications
                Object.entries(grouped).forEach(([type, items]) => {
                    if (items.length > 1) {
                        io.to(userId).emit('newNotification', {
                            type,
                            message: `You have ${items.length} new ${type} notifications`,
                            count: items.length,
                            sound: items[0].sound
                        });
                    } else {
                        io.to(userId).emit('newNotification', items[0]);
                    }
                });
            } else if (notifications.length === 1) {
                // Emit single notification
                io.to(userId).emit('newNotification', notifications[0]);
            }
        }, GROUP_WINDOW);
    }
}

async function createNotification(data) {
    try {
        // Check rate limit
        if (!checkRateLimit(data.user)) {
            console.warn('Rate limit exceeded for user:', data.user);
            return null;
        }

        // Create the notification
        const notification = await Notification.create({
            ...data,
            createdAt: new Date()
        });

        // Prepare notification data with sound preference
        const notificationData = {
            message: data.message,
            notificationId: notification._id,
            type: data.type || 'default',
            sound: data.sound || 'default'
        };

        // Group and emit notification
        emitGroupedNotifications(data.user, notificationData);

        return notification;
    } catch (error) {
        console.error('Error creating notification:', error);
        throw error;
    }
}

module.exports = {
    createNotification,
    cleanupOldNotifications
};
