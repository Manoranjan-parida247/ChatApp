// Selecting DOM elements
let currentUserProfilePhoto = document.getElementById("current-user-profile-photo");
let currentUserName = document.getElementById("current-userName");
let contactsList = document.getElementById("contacts-list");
let welcomeScreen = document.getElementById("welcome-screen");
let activeChat = document.getElementById("active-chat");
let chatContactProfilePhoto = document.getElementById("chat-contact-profile-photo");
let chatContactName = document.getElementById("chat-contact-name");
let chatContactStatus = document.getElementById("chat-contact-status");
let messagesContainer = document.getElementById("messages-container");
let messageInput = document.getElementById("message-input");
let sendMessageBtn = document.getElementById("send-message-btn");
let searchInput = document.getElementById("search-input");
let logoutBtn = document.getElementById("logout-btn");

// Current state
let currentUser;
let selectedContact = null;

// Initialize chat app
document.addEventListener("DOMContentLoaded", initializeChatApp);

function initializeChatApp() {
    // Get current user from storage
    currentUser = getCurrentUser(); // Defined in dataStore.js

    if (!currentUser) {
        window.location.href = "index.html";
        return;
    }

    // Mark user as online when app initializes
    updateOnlineStatus(currentUser.firstName, true);

    
    setInterval(updateLastActivity, 6000); // Update every minute

    // Set user details
    currentUserProfilePhoto.textContent = generateInitials(currentUser.firstName, currentUser.lastName);
    currentUserName.textContent = `${currentUser.firstName} ${currentUser.lastName}`;

    // Load contacts
    loadContacts();

    // Event listeners
    sendMessageBtn.addEventListener('click', sendMessage);
    messageInput.addEventListener('keypress', function (e) {
        if (e.key === 'Enter') sendMessage();
    });

    searchInput.addEventListener('input', filterContacts);

    // Set up logout button
    if (logoutBtn) {
        logoutBtn.addEventListener('click', function() {
            clearCurrentUser();
            window.location.href = 'index.html';
        });
    }

    // Listen for new messages from other tabs
    // window.addEventListener('newMessage', function (e) {
    //     const { sender, receiver } = e.detail;

    //     if ((sender === currentUser.firstName && receiver === selectedContact?.firstName) ||
    //         (receiver === currentUser.firstName && sender === selectedContact?.firstName)) {
    //         loadChatHistory(selectedContact);
            // Mark messages as read when received in active chat
    //         if (receiver === currentUser.firstName) {
    //             markMessagesAsRead(currentUser.firstName, sender);
    //         }
    //     } else if (receiver === currentUser.firstName) {
            // Update contacts list with new message indication
    //         loadContacts();
    //     }
    // });

    window.addEventListener('newMessage', function (e) {
        const { sender, receiver } = e.detail;
    
        // If the current user is the receiver and they have the sender's chat open,
        // immediately mark messages as read
        if (receiver === currentUser.firstName && 
            selectedContact && 
            sender === selectedContact.firstName) {
            
            // Mark messages as read immediately
            markMessagesAsRead(currentUser.firstName, sender);
            loadChatHistory(selectedContact);
            loadContacts(); // Update contact list to remove unread count
        } 
        // If the current user is the receiver but doesn't have sender's chat open
        else if (receiver === currentUser.firstName) {
            // Update contacts to show unread indicator
            loadContacts();
        }
        // If the current user is the sender and has the receiver's chat open
        else if (sender === currentUser.firstName && 
                 selectedContact && 
                 receiver === selectedContact.firstName) {
            loadChatHistory(selectedContact);
        }
    });

    
    // Listen for localStorage changes (for cross-tab communication)
    window.addEventListener("storage", (e) => {
        // Only respond to changes in the chats storage
        if (e.key === STORAGE_KEYS.CHATS || e.key === STORAGE_KEYS.UNREAD_MESSAGES) {
          // Reload contacts to update last messages and unread counts
          loadContacts();
    
          // If a chat is currently open, refresh the chat history
          if (selectedContact) {
            loadChatHistory(selectedContact);
            // Mark messages as read in the active chat
            markMessagesAsRead(currentUser.firstName, selectedContact.firstName);
          }
        }
    });

    // Listen for online status changes
    window.addEventListener('onlineStatusChanged', function (e) {
        const { firstName, isOnline } = e.detail;
        updateContactStatusUI(firstName, isOnline);
    });

    // Listen for unread counts updated
    window.addEventListener('unreadCountsUpdated', function(e) {
        const { receiver, sender } = e.detail;
        if (receiver === currentUser.firstName) {
            loadContacts(); // Refresh the contacts list to show new unread count
        }
    });

    // Listen for user logout from another tab
    window.addEventListener('storage', function (e) {
        if (e.key === STORAGE_KEYS.CURRENT_USER && !e.newValue) {
            window.location.href = 'index.html';
        } else if (e.key === STORAGE_KEYS.ONLINE_USERS) {
            // Refresh contacts to update status indicators
            loadContacts();
            
            // Update status in active chat if needed
            if (selectedContact) {
                updateContactStatusUI(selectedContact.firstName, isUserOnline(selectedContact.firstName));
            }
        }
    });
}

// Load contacts list
function loadContacts() {
    const users = getUsers(); // Defined in dataStore.js
    const unreadCounts = getUnreadCounts(currentUser.firstName); // Get unread counts

    contactsList.innerHTML = '';

    const contacts = users
        .filter(user => user.firstName !== currentUser.firstName)
        .map(user => {
            const lastMessage = getLastMessage(currentUser.firstName, user.firstName); // Defined in dataStore.js
            return {
                ...user,
                isOnline: isUserOnline(user.firstName),
                lastMessage,
                lastMessageTime: lastMessage ? lastMessage.timestamp : 0,
                unreadCount: unreadCounts?.[user.firstName] || 0 // Get unread count for this contact
            };
        })
        .sort((a, b) => b.lastMessageTime - a.lastMessageTime);

    contacts.forEach(contact => {
        const contactItem = document.createElement("div");
        contactItem.className = "contact-item";
        contactItem.dataset.firstName = contact.firstName;

        const lastMessageText = contact.lastMessage
            ? (contact.lastMessage.sender === currentUser.firstName ? 'You: ' : '') + contact.lastMessage.message
            : 'No messages yet';

        const lastMessageTime = contact.lastMessage
            ? formatTime(contact.lastMessage.timestamp) // Defined in dataStore.js
            : '';

        // Create unread count badge HTML
        const unreadCountBadge = contact.unreadCount > 0 
            ? `<span class="unread-count-badge">${contact.unreadCount}</span>` 
            : '';

        contactItem.innerHTML = `
            <div class="profile-photo">${generateInitials(contact.firstName, contact.lastName)}</div>
            <div class="contact-info">
                <h3>${contact.firstName} ${contact.lastName}</h3>
                <p class="last-message">${lastMessageText}</p>
            </div>
            <div class="contact-meta">
                <span class="message-time">${lastMessageTime}</span>
                <span class="status-indicator ${contact.isOnline ? 'online' : 'offline'}" 
                    title="${contact.isOnline ? 'Online' : 'Offline'}"></span>
                ${unreadCountBadge}
            </div>
        `;

        contactItem.addEventListener('click', function () {
            openChat(contact);
        });

        contactsList.appendChild(contactItem);
    });

    if (selectedContact) {
        const selectedItem = contactsList.querySelector(`[data-first-name="${selectedContact.firstName}"]`);
        if (selectedItem) selectedItem.classList.add('active');
    }
}

// Filter contacts based on search input
function filterContacts() {
    const searchTerm = searchInput.value.toLowerCase();
    const contactItems = contactsList.querySelectorAll('.contact-item');

    contactItems.forEach(item => {
        const contactName = item.querySelector('h3').textContent.toLowerCase();
        item.style.display = contactName.includes(searchTerm) ? 'flex' : 'none';
    });
}

// Open chat with selected contact
function openChat(contact) {
    selectedContact = contact;

    welcomeScreen.style.display = 'none';
    activeChat.style.display = 'flex';

    chatContactProfilePhoto.textContent = generateInitials(contact.firstName, contact.lastName);
    chatContactName.textContent = `${contact.firstName} ${contact.lastName}`;
    
    // Update contact status
    const isOnline = isUserOnline(contact.firstName);
    updateContactStatusUI(contact.firstName, isOnline);

    messageInput.value = '';

    // Mark messages from this contact as read
    markMessagesAsRead(currentUser.firstName, contact.firstName);

    loadChatHistory(contact);

    // Highlight selected contact
    document.querySelectorAll('.contact-item').forEach(item => item.classList.remove('active'));
    const selectedItem = contactsList.querySelector(`[data-first-name="${contact.firstName}"]`);
    if (selectedItem) selectedItem.classList.add('active');

    // Update contacts list to reflect read messages
    loadContacts();

    messageInput.focus();
}

// Update contact status UI
function updateContactStatusUI(firstName, isOnline) {
    // Update in contact list
    const contactItem = contactsList.querySelector(`[data-first-name="${firstName}"]`);
    if (contactItem) {
        const statusIndicator = contactItem.querySelector('.status-indicator');
        if (statusIndicator) {
            statusIndicator.className = `status-indicator ${isOnline ? 'online' : 'offline'}`;
            statusIndicator.title = isOnline ? 'Online' : 'Offline';
        }
    }
    
    // Update in active chat if this is the selected contact
    if (selectedContact && selectedContact.firstName === firstName && chatContactStatus) {
        chatContactStatus.textContent = isOnline ? 'online' : 'offline';
        chatContactStatus.className = `status ${isOnline ? 'online' : 'offline'}`;
    }
}

// Load chat history
function loadChatHistory(contact) {
    const chatHistory = getChatHistory(currentUser.firstName, contact.firstName); // Defined in dataStore.js

    messagesContainer.innerHTML = '';

    chatHistory.forEach(message => {
        addMessageToUI(message);
    });

    messagesContainer.scrollTop = messagesContainer.scrollHeight;
}

// Add message to UI
function addMessageToUI(message) {
    const messageElement = document.createElement('div');
    const isCurrentUser = message.sender === currentUser.firstName;

    messageElement.className = `message ${isCurrentUser ? 'sent' : 'received'}`;
    messageElement.innerHTML = `
        ${message.message}
        <span class="message-time-small">${formatTime(message.timestamp)}</span>
    `;

    messagesContainer.appendChild(messageElement);
}

// Send message
function sendMessage() {
    const messageText = messageInput.value.trim();
    if (!messageText || !selectedContact) return;

    const timestamp = Date.now();
    
    // Determine if message should be marked as seen
    // If the receiver is the selected contact and the chat is open, mark as seen for them
    // This will be false when sending - other users will only mark it as seen when they open the chat
    const isSeen = false;

    saveMessage(currentUser.firstName, selectedContact.firstName, messageText, timestamp, isSeen); // Defined in dataStore.js

    messageInput.value = '';

    // Load the updated chat history
    loadChatHistory(selectedContact);
  
    // Update contacts list to show the latest message
    loadContacts();
}