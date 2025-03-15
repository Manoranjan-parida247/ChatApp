/**
 * Storage utility functions for WhatsApp Web Clone
 */

// Constants for storage keys
const STORAGE_KEYS = {
    USERS: 'whatsapp_users',
    CURRENT_USER: 'whatsapp_current_user',
    CHATS: 'whatsapp_chats',
    ONLINE_USERS: 'whatsapp_online_users',
    UNREAD_MESSAGES: 'whatsapp_unread_messages'  
};

/**
 * Get all registered users from localStorage
 * return  -->  Array of user objects
 */
function getUsers() {
    const users = localStorage.getItem(STORAGE_KEYS.USERS);
    return users ? JSON.parse(users) : [];
}

/**
 * Save users array to localStorage
 *  users - Array of user objects
 */
function saveUsers(users) {
    localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(users));
}

/**
 * Add a new user to localStorage
 *  user - User object with firstName, lastName, and password
 * return ->  Boolean  -->Success status
 */
function addUser(user) {
    const users = getUsers();
    
    // Check if user with the same firstName already exists
    if (users.some(u => u.firstName.toLowerCase() === user.firstName.toLowerCase())) {
        return false;
    }
    
    users.push(user);
    saveUsers(users);
    return true;
}

/**
 * Authenticate user with firstName and password
 *  firstName - User's first name
 *  password - User's password
 * returns -> Object|null  --> User object if authenticated, otherwise return null
 */
function authenticateUser(firstName, password) {
    const users = getUsers();
    const user = users.find(u => 
        u.firstName.toLowerCase() === firstName.toLowerCase() && 
        u.password === password
    );
    
    return user || null;
}

/**
 * Set current user in sessionStorage
 *  user - User object
 */
function setCurrentUser(user) {
    sessionStorage.setItem(STORAGE_KEYS.CURRENT_USER, JSON.stringify(user));
    
    // Set user as online
    updateOnlineStatus(user.firstName, true);
    
    // Dispatch an event to notify other tabs about the login
    const event = new CustomEvent('userLogin', { detail: { user } });
    window.dispatchEvent(event);
}

/**
 * Get current logged in user from sessionStorage
 * returns -> Object|null  --> Current user object or null
 */
function getCurrentUser() {
    const user = sessionStorage.getItem(STORAGE_KEYS.CURRENT_USER);
    return user ? JSON.parse(user) : null;
}

/**
 * Clear current user from sessionStorage (logout)
 */
function clearCurrentUser() {
    const currentUser = getCurrentUser();
    if (currentUser) {
        // Set user as offline
        updateOnlineStatus(currentUser.firstName, false);
    }
    
    sessionStorage.removeItem(STORAGE_KEYS.CURRENT_USER);
    
    // Dispatch an event to notify other tabs about the logout
    const event = new CustomEvent('userLogout');
    window.dispatchEvent(event);
}

/**
 * Get chat history between two users
 *  user1 - First user's firstName
 *  user2 - Second user's firstName
 * return ->  Array of message objects
 */
function getChatHistory(user1, user2) {
    // Sort names alphabetically to ensure consistent chat ID
    const chatId = [user1, user2].sort().join('_');
    
    const chats = localStorage.getItem(STORAGE_KEYS.CHATS);
    const allChats = chats ? JSON.parse(chats) : {};
    
    return allChats[chatId] || [];
}

/**
 * Save a new message to chat history
 *  sender - Sender's firstName
 *  receiver - Receiver's firstName
 *  message - Message content
 *  timestamp - Message timestamp
 *  isSeen - Boolean indicating if message is seen
 */
function saveMessage(sender, receiver, message, timestamp, isSeen=false) {
    // Sort names alphabetically to ensure consistent chat ID
    const chatId = [sender, receiver].sort().join('_');
    
    const chats = localStorage.getItem(STORAGE_KEYS.CHATS);
    const allChats = chats ? JSON.parse(chats) : {};
    
    // Initialize chat array if it doesn't exist
    if (!allChats[chatId]) {
        allChats[chatId] = [];
    }
    
    // Add new message
    allChats[chatId].push({
        sender,
        receiver,
        message,
        timestamp,
        isSeen
    });
    
    // Save to localStorage
    localStorage.setItem(STORAGE_KEYS.CHATS, JSON.stringify(allChats));

    // Update unread message count
    if (!isSeen && sender !== receiver) {
        incrementUnreadCount(sender, receiver);
    }
    
    // Dispatch an event to notify other tabs about the new message
    const event = new CustomEvent('newMessage', {
        detail: {
            sender,
            receiver,
            message,
            timestamp,
            isSeen
        }
    });
    window.dispatchEvent(event);
}

/**
 * Get unread message counts for a user
 * @param {string} user - User's firstName
 * @returns {Object} - Object with sender names as keys and unread counts as values
 */
function getUnreadCounts(user) {
    const unreadCounts = localStorage.getItem(STORAGE_KEYS.UNREAD_MESSAGES);
    const allUnreadCounts = unreadCounts ? JSON.parse(unreadCounts) : {};
    
    // Initialize user's unread counts if it doesn't exist
    if (!allUnreadCounts[user]) {
        allUnreadCounts[user] = {};
    }
    
    return allUnreadCounts[user];
}

/**
 * Increment unread message count for a user
 * @param {string} sender - Sender's firstName
 * @param {string} receiver - Receiver's firstName
 */
function incrementUnreadCount(sender, receiver) {
    const unreadCounts = localStorage.getItem(STORAGE_KEYS.UNREAD_MESSAGES);
    const allUnreadCounts = unreadCounts ? JSON.parse(unreadCounts) : {};
    
    // Initialize receiver's unread counts if it doesn't exist
    if (!allUnreadCounts[receiver]) {
        allUnreadCounts[receiver] = {};
    }
    
    // Increment unread count for this sender
    allUnreadCounts[receiver][sender] = (allUnreadCounts[receiver][sender] || 0) + 1;
    
    // Save to localStorage
    localStorage.setItem(STORAGE_KEYS.UNREAD_MESSAGES, JSON.stringify(allUnreadCounts));
    
    // Dispatch an event to notify other tabs about the updated count
    const event = new CustomEvent('unreadCountsUpdated', {
        detail: {
            receiver,
            sender,
            count: allUnreadCounts[receiver][sender]
        }
    });
    window.dispatchEvent(event);
}

/**
 * Mark all messages from a sender as read
 * @param {string} currentUser - Current user's firstName
 * @param {string} sender - Sender's firstName
 */
function markMessagesAsRead(currentUser, sender) {
    // Update unread count
    const unreadCounts = localStorage.getItem(STORAGE_KEYS.UNREAD_MESSAGES);
    const allUnreadCounts = unreadCounts ? JSON.parse(unreadCounts) : {};
    
    if (allUnreadCounts[currentUser] && allUnreadCounts[currentUser][sender]) {
        // Reset unread count for this sender
        allUnreadCounts[currentUser][sender] = 0;
        localStorage.setItem(STORAGE_KEYS.UNREAD_MESSAGES, JSON.stringify(allUnreadCounts));
    }
    
    // Mark messages as seen in chat history
    const chatId = [currentUser, sender].sort().join('_');
    const chats = localStorage.getItem(STORAGE_KEYS.CHATS);
    const allChats = chats ? JSON.parse(chats) : {};
    
    if (allChats[chatId]) {
        let updated = false;
        allChats[chatId].forEach(message => {
            if (message.sender === sender && message.receiver === currentUser && !message.isSeen) {
                message.isSeen = true;
                updated = true;
            }
        });
        
        if (updated) {
            localStorage.setItem(STORAGE_KEYS.CHATS, JSON.stringify(allChats));
        }
    }
    
    // Dispatch an event to notify other tabs
    const event = new CustomEvent('messagesRead', {
        detail: {
            reader: currentUser,
            sender: sender
        }
    });
    window.dispatchEvent(event);
}

/**
 * Get the last message between two users
 *  user1 - First user's firstName
 *  user2 - Second user's firstName
 * returns -> Object|null  --> Last message object or null
 */
function getLastMessage(user1, user2) {
    const chatHistory = getChatHistory(user1, user2);
    
    if (chatHistory.length === 0) {
        return null;
    }
    
    return chatHistory[chatHistory.length - 1];
}

// Generate initials from first and last name
function generateInitials(firstName, lastName) {
    return (firstName.charAt(0) + lastName.charAt(0)).toUpperCase();
}

/**
 * Format timestamp to readable time
 *  timestamp - Timestamp in milliseconds
 * returns  Formatted time string
 */
function formatTime(timestamp) {
    const date = new Date(timestamp);
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    return `${hours}:${minutes}`;
}

/**
 * Update a user's online status
 */
function updateOnlineStatus(firstName, isOnline) {
    const onlineUsers = getOnlineUsers();
    
    if (isOnline) {
        // Set the last activity timestamp
        onlineUsers[firstName] = Date.now();
    } else {
        // Remove the user from online list
        delete onlineUsers[firstName];
    }
    
    localStorage.setItem(STORAGE_KEYS.ONLINE_USERS, JSON.stringify(onlineUsers));
    
    // Dispatch an event to notify other tabs about the status change
    const event = new CustomEvent('onlineStatusChanged', {
        detail: { firstName, isOnline }
    });
    window.dispatchEvent(event);
}

/**
 * Get all currently online users
 * return Object with usernames as keys and last activity timestamps as values
 */
function getOnlineUsers() {
    const onlineUsers = localStorage.getItem(STORAGE_KEYS.ONLINE_USERS);
    return onlineUsers ? JSON.parse(onlineUsers) : {};
}

/**
 * Check if a user is currently online
 *  firstName - User's first name
 * returns -> Boolean --> Online status
 */
function isUserOnline(firstName) {
    const onlineUsers = getOnlineUsers();
    
    // Consider a user online if they have activity in the last 5 minutes
    const USER_INACTIVITY_LIMIT = 5 * 60 * 1000; // 5 minutes in milliseconds
    const lastActivity = onlineUsers[firstName];
    
    if (!lastActivity) return false;
    
    return (Date.now() - lastActivity) < USER_INACTIVITY_LIMIT;
}

/**
 * Update the last activity timestamp for the current user
 * Helps maintain online status for inactive tabs
 */
function updateLastActivity() {
    const currentUser = getCurrentUser();
    if (currentUser) {
        updateOnlineStatus(currentUser.firstName, true);
    }
}

// Set up periodic online status pings
setInterval(updateLastActivity, 6000);