const socketIO = require('socket.io');

let io;

module.exports = {
    init: (server) => {
        io = socketIO(server, {
            cors: {
                origin: "*",
                methods: ["GET", "POST"]
            },
            pingTimeout: 60000,
            pingInterval: 25000,
            transports: ['websocket', 'polling'],
            allowEIO3: true,
            path: '/socket.io'
        });
        
        io.on('connection', (socket) => {
            console.log('Client connected:', socket.id);
            
            // Associate socket with user if authenticated
            if (socket.request.session && socket.request.session.passport) {
                const userId = socket.request.session.passport.user;
                socket.join(userId);
                console.log('User authenticated:', userId);
            }

            // Handle user preferences
            socket.on('setPreferences', (preferences) => {
                socket.preferences = preferences;
                console.log('User preferences updated:', socket.id, preferences);
            });

            // Handle connection errors
            socket.on('error', (error) => {
                console.error('Socket error:', socket.id, error);
            });

            socket.on('disconnect', (reason) => {
                console.log('Client disconnected:', socket.id, 'Reason:', reason);
            });

            // Handle reconnection attempts
            socket.on('reconnect_attempt', (attemptNumber) => {
                console.log('Reconnection attempt:', socket.id, attemptNumber);
            });

            socket.on('reconnect_failed', () => {
                console.error('Reconnection failed:', socket.id);
            });
        });

        // Handle server-side errors
        io.on('error', (error) => {
            console.error('Socket.IO server error:', error);
        });

        return io;
    },
    
    getIO: () => {
        if (!io) {
            throw new Error('Socket.io not initialized!');
        }
        return io;
    }
};
