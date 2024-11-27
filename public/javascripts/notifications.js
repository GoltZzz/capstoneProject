class NotificationSound {
    constructor() {
        console.log('Initializing NotificationSound');
        try {
            this.sound = new Audio('/sounds/notification.mp3');
            this.sound.preload = 'auto';
            this.lastPlayTime = 0;
            this.minInterval = 3000; // 3 seconds minimum between plays
            this.isPlaying = false;
            this.hasUnread = false;
            this.initializationFailed = false;

            // Add event listeners for sound loading and errors
            this.sound.addEventListener('canplaythrough', () => {
                console.log('Sound loaded and ready to play');
            });

            this.sound.addEventListener('error', (e) => {
                console.error('Sound loading error:', e);
                this.initializationFailed = true;
                this.tryReloadSound();
            });

            // Load the sound
            this.sound.load();
        } catch (error) {
            console.error('Error initializing NotificationSound:', error);
            this.initializationFailed = true;
        }
    }

    tryReloadSound() {
        try {
            console.log('Attempting to reload sound...');
            this.sound = new Audio('/sounds/notification.mp3');
            this.sound.preload = 'auto';
            this.sound.load();
            this.initializationFailed = false;
        } catch (error) {
            console.error('Failed to reload sound:', error);
            this.initializationFailed = true;
        }
    }

    async playNotification() {
        // Don't attempt to play if initialization failed
        if (this.initializationFailed) {
            console.log('Sound initialization failed, attempting reload...');
            this.tryReloadSound();
            return;
        }

        console.log('Attempting to play notification sound');
        console.log('Current state:', {
            isPlaying: this.isPlaying,
            timeSinceLastPlay: Date.now() - this.lastPlayTime,
            hasUnread: this.hasUnread
        });

        if (!this.hasUnread) {
            console.log('No unread notifications, skipping sound');
            return;
        }

        if (this.isPlaying) {
            console.log('Sound is already playing, skipping');
            return;
        }

        const currentTime = Date.now();
        if (currentTime - this.lastPlayTime < this.minInterval) {
            console.log('Too soon since last play, skipping');
            return;
        }

        try {
            this.isPlaying = true;
            this.lastPlayTime = currentTime;

            // Reset the sound to the beginning
            this.sound.currentTime = 0;
            
            console.log('Playing sound...');
            const playPromise = this.sound.play();
            
            if (playPromise !== undefined) {
                await playPromise;
                console.log('Sound played successfully');
            }
        } catch (error) {
            console.error('Error playing notification sound:', error);

            if (error.name === 'NotSupportedError' || error.name === 'NotAllowedError') {
                console.log('Trying to reload sound with user interaction...');
                this.setupUserInteractionHandler();
            }
        } finally {
            this.isPlaying = false;
        }
    }

    setupUserInteractionHandler() {
        const playSound = async () => {
            try {
                await this.tryReloadSound();
                await this.sound.play();
                document.removeEventListener('click', playSound);
            } catch (e) {
                console.error('Still failed to play sound:', e);
            }
        };
        document.addEventListener('click', playSound, { once: true });
    }

    setHasUnread(hasUnread) {
        if (typeof hasUnread !== 'boolean') {
            console.error('Invalid hasUnread value:', hasUnread);
            return;
        }
        console.log('Setting unread status:', hasUnread);
        this.hasUnread = hasUnread;
    }

    hasUnreadNotifications() {
        return this.hasUnread;
    }
}

// Initialize notification sound
let notificationSound;
try {
    notificationSound = new NotificationSound();
} catch (error) {
    console.error('Failed to initialize NotificationSound:', error);
}

// Function to check for new notifications
function checkNotifications() {
    if (!window.currentUser?.isAdmin) {
        console.log('User is not admin, skipping notification check');
        return;
    }

    if (!notificationSound) {
        console.error('NotificationSound not initialized');
        return;
    }

    const apiUrl = `${window.location.protocol}//${window.location.host}/api/notifications/unread-count`;
    
    fetch(apiUrl)
        .then(response => {
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            return response.json();
        })
        .then(data => {
            console.log('Notification check result:', data);
            if (typeof data?.unreadCount === 'number') {
                notificationSound.setHasUnread(data.unreadCount > 0);
                if (data.unreadCount > 0) {
                    notificationSound.playNotification();
                }
            } else {
                console.error('Invalid unreadCount data:', data);
            }
        })
        .catch(error => {
            console.error('Error checking notifications:', error);
            if (!checkNotifications.hasLogged) {
                console.log('Note: If you\'re seeing SSL errors, make sure you\'re using http:// instead of https://');
                checkNotifications.hasLogged = true;
            }
        });
}

let notificationCheckInterval;

// Start checking for notifications immediately for admin users
if (window.currentUser?.isAdmin) {
    console.log('Starting notification checks for admin user');
    checkNotifications();
    
    // Clear any existing interval before setting a new one
    if (notificationCheckInterval) {
        clearInterval(notificationCheckInterval);
    }
    notificationCheckInterval = setInterval(checkNotifications, 3000);

    // Clean up interval when page is unloaded
    window.addEventListener('unload', () => {
        if (notificationCheckInterval) {
            clearInterval(notificationCheckInterval);
        }
    });
}

// Socket connection event handlers
socket.on('connect', () => {
    console.log('Connected to notification server');
});

socket.on('disconnect', (reason) => {
    console.log('Disconnected from notification server:', reason);
    if (reason === 'io server disconnect') {
        // Attempt to reconnect
        try {
            socket.connect();
        } catch (error) {
            console.error('Failed to reconnect:', error);
        }
    }
});

socket.on('newNotification', (notification) => {
    if (!window.currentUser?.isAdmin) return;
    if (!notificationSound) {
        console.error('NotificationSound not initialized');
        return;
    }

    console.log('New notification received:', notification);
    notificationSound.setHasUnread(true);
    notificationSound.playNotification();
});

// Handle notification clicks (for existing notifications)
document.addEventListener('click', (event) => {
    if (!notificationSound) return;

    const notifElement = event.target.closest('[data-notification-id]');
    if (notifElement) {
        console.log('Notification clicked');
        notificationSound.setHasUnread(false);
    }
});

socket.on('connect_error', (error) => {
    console.error('Connection error:', error);
    // Attempt to reconnect after a delay
    setTimeout(() => {
        try {
            socket.connect();
        } catch (error) {
            console.error('Failed to reconnect after error:', error);
        }
    }, 5000);
});
