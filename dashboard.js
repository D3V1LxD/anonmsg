// anonmsg-final-frontend/dashboard.js (Fully Complete with Working Buttons & Logging)

// STEP 1: Perform critical checks immediately
const authToken = localStorage.getItem('authToken');
const username = localStorage.getItem('username');
const privateKey = localStorage.getItem('privateKey');

if (!authToken || !username || !privateKey) {
    console.log("Dashboard: Missing auth data in localStorage. Redirecting to login.");
    window.location.replace('auth.html?mode=signin');
}

document.addEventListener('DOMContentLoaded', () => {
    console.log("Dashboard DOM Loaded. Initializing for user:", username);

    const API_URL = 'anommsgbackend-anonmsgback.up.railway.app';
    const usernameDisplay = document.getElementById('username-display');
    const profileLinkInput = document.getElementById('profile-link');
    const copyBtn = document.getElementById('copy-btn');
    const logoutBtn = document.getElementById('logout-btn');
    const messageList = document.getElementById('message-list');
    const copyFeedback = document.getElementById('copy-feedback');
    const notificationSound = new Audio('notification.mp3');
    const terminateAccountBtn = document.getElementById('terminate-account-btn');

    if ('Notification' in window && Notification.permission === 'default') {
        console.log("Requesting notification permission.");
        Notification.requestPermission();
    }
    
    usernameDisplay.textContent = username;
    profileLinkInput.value = `${window.location.origin}/profile.html?user=${username.toLowerCase()}`;
    console.log("Profile link generated:", profileLinkInput.value);
    
    // --- WORKING EVENT LISTENERS ---
    logoutBtn.addEventListener('click', () => {
        console.log("Logout button clicked.");
        localStorage.clear();
        window.location.replace('index.html');
    });

    copyBtn.addEventListener('click', () => {
        console.log("Copy Link button clicked. Value to copy:", profileLinkInput.value);
        navigator.clipboard.writeText(profileLinkInput.value).then(() => {
            copyFeedback.textContent = 'Link copied!';
            copyFeedback.style.color = 'var(--success-color)';
            copyBtn.textContent = 'Copied!';
            console.log("Link copied successfully.");
            setTimeout(() => {
                copyFeedback.textContent = '';
                copyBtn.textContent = 'Copy Link';
            }, 3000);
        }).catch(err => {
            console.error("Copy link failed:", err);
            copyFeedback.textContent = 'Copy failed!';
            copyFeedback.style.color = 'var(--danger-color)';
        });
    });

    messageList.addEventListener('click', (e) => {
        const messageCard = e.target.closest('.message-card');
        if (!messageCard) return;
        const flipper = messageCard.querySelector('.message-flipper');
        const messageId = messageCard.dataset.messageId; 
        if (e.target.classList.contains('btn-delete')) {
            e.stopPropagation(); handleDeleteClick(messageId, e.target); return;
        }
        if (e.target.classList.contains('btn-reply')) {
            e.stopPropagation(); handleReplyClick(messageCard); return;
        }
        if (flipper && (e.target.closest('.message-front') || e.target === flipper)) {
            if (!messageCard.classList.contains('is-flipped')) {
                messageCard.classList.add('is-flipped');
                if (messageId) addMessageIdToRead(messageId);
            }
        }
    });

    if (terminateAccountBtn) {
        terminateAccountBtn.addEventListener('click', async () => {
            console.log("Terminate Account button clicked.");
            if (!confirm('Are you ABSOLUTELY SURE you want to terminate your account?\n\nThis action CANNOT be undone and ALL YOUR DATA (profile, messages) will be PERMANENTLY DELETED.')) {
                return;
            }
            if (!confirm('FINAL WARNING: Please confirm one last time that you understand your account and all associated data will be permanently deleted.')) {
                return;
            }
            try {
                const response = await fetch(`${API_URL}/users/me`, {
                    method: 'DELETE',
                    headers: { 'x-auth-token': authToken }
                });
                const data = await response.json();
                if (!response.ok) throw new Error(data.error || 'Failed to terminate account.');
                alert('Your account has been successfully terminated.');
                console.log("Account terminated successfully.");
                localStorage.clear();
                window.location.replace('index.html');
            } catch (error) {
                console.error('Account termination failed:', error);
                alert('Account termination failed: ' + error.message);
            }
        });
    }
    // --- END OF EVENT LISTENERS ---

    const READ_MESSAGES_KEY = `readAnonMessageIds_${username}`;
    function getReadMessageIds() { const readIds = localStorage.getItem(READ_MESSAGES_KEY); return readIds ? JSON.parse(readIds) : []; }
    function addMessageIdToRead(messageId) { let readIds = getReadMessageIds(); if (!readIds.includes(messageId)) { readIds.push(messageId); localStorage.setItem(READ_MESSAGES_KEY, JSON.stringify(readIds)); } }
    
    async function handleReplyClick(cardElement) { 
        console.log("Reply button clicked for card:", cardElement.id);
        const backFace = cardElement.querySelector('.message-back');
        const actions = backFace.querySelector('.message-card-actions');
        if (actions) actions.style.display = 'none';
        try {
            const canvas = await html2canvas(backFace, { backgroundColor: '#ffffff', scale: 2 });
            if (actions) actions.style.display = 'flex';
            if (navigator.share && navigator.canShare) {
                canvas.toBlob(async (blob) => {
                    if (!blob) { alert("Could not generate image for sharing."); return; }
                    const file = new File([blob], 'anonmsg-reply.png', { type: 'image/png' });
                    try { await navigator.share({ title: 'AnonMsg Reply', text: 'Replying to an anonymous message!', files: [file] }); } 
                    catch (err) { if (err.name !== 'AbortError') console.error("Share failed:", err); else console.log("Share cancelled.");}
                }, 'image/png');
            } else {
                const link = document.createElement('a');
                link.download = 'anonmsg-reply.png';
                link.href = canvas.toDataURL('image/png');
                link.click();
            }
        } catch (error) { console.error('Failed to create image for reply:', error); if (actions) actions.style.display = 'flex'; alert("Could not generate image for reply."); }
    }

    async function handleDeleteClick(messageId, buttonElement) {
        console.log("Delete button clicked for message ID:", messageId);
        if (!confirm('Are you sure you want to delete this message forever?')) return;
        try {
            const response = await fetch(`${API_URL}/messages/${messageId}`, {
                method: 'DELETE', headers: { 'x-auth-token': authToken },
            });
            const data = await response.json();
            if (!response.ok) throw new Error(data.error || 'Failed to delete');
            const cardToRemove = buttonElement.closest('.message-card');
            cardToRemove.style.transition = 'opacity 0.5s ease, transform 0.5s ease';
            cardToRemove.style.transform = 'scale(0.9)'; cardToRemove.style.opacity = '0';
            setTimeout(() => {
                cardToRemove.remove();
                currentMessageCount = messageList.querySelectorAll('.message-card:not(.no-messages)').length;
                 if (currentMessageCount === 0 && messageList.innerHTML.trim() !== "") { // Ensure it only fetches if list was not already showing "no messages"
                     fetchAndDisplayMessages(); 
                 }
            }, 500);
        } catch (error) { console.error('Delete failed:', error); alert(error.message); }
     }

    function showNotification(message) { if (Notification.permission === 'granted') new Notification('New Anonymous Message!', { body: message, icon: 'favicon.png' }); }

    let currentMessageCount = 0;
    let isFirstLoad = true;

    const fetchAndDisplayMessages = async () => {
        console.log("Fetching messages for dashboard...");
        try {
            const response = await fetch(`${API_URL}/messages`, {
                method: 'GET',
                headers: { 'x-auth-token': authToken },
            });
            console.log("Fetch /api/messages response status:", response.status);

            if (response.status === 401) {
                console.log("Auth token invalid or expired. Clearing storage and redirecting.");
                localStorage.clear();
                window.location.replace('auth.html?mode=signin');
                return;
            }
            if (!response.ok) {
                const errorData = await response.text();
                console.error("Failed to fetch messages. Status:", response.status, "Response Data:", errorData);
                messageList.innerHTML = `<div class="message-card error"><p>Could not load messages. Please try again later.</p></div>`;
                return;
            }
            
            const messages = await response.json();
            console.log("Fetched messages from backend:", JSON.stringify(messages, null, 2));

            const readMessageIds = getReadMessageIds(); 
            console.log("Current read message IDs:", readMessageIds);

            if (messages.length > currentMessageCount && !isFirstLoad) {
                console.log("New messages detected. Playing sound and showing notification.");
                notificationSound.play().catch(e => console.error("Sound play failed:", e));
                const decrypt = new JSEncrypt(); decrypt.setPrivateKey(privateKey);
                const newUnreadMessages = messages.filter(msg => !readMessageIds.includes(msg._id));
                if (newUnreadMessages.length > 0) {
                    const newestOverallMessage = newUnreadMessages.sort((a,b) => new Date(b.sentAt) - new Date(a.sentAt))[0];
                    if (newestOverallMessage) {
                        const decryptedPreview = decrypt.decrypt(newestOverallMessage.encryptedContent);
                        showNotification(decryptedPreview || "You have a new unread message.");
                    }
                }
            }
            
            let hasVisualChange = false;
            if(messages.length !== currentMessageCount || isFirstLoad){
                hasVisualChange = true;
            } else {
                messageList.querySelectorAll('.message-card:not(.no-messages)').forEach(card => {
                    const cardId = card.dataset.messageId;
                    const isStoredAsRead = readMessageIds.includes(cardId);
                    const isVisuallyFlipped = card.classList.contains('is-flipped');
                    if(isStoredAsRead && !isVisuallyFlipped) {
                        card.classList.add('is-flipped'); 
                    }
                });
            }

            if (!hasVisualChange && !isFirstLoad) {
                console.log("No structural changes to messages, skipping full re-render.");
                return;
            }
            
            currentMessageCount = messages.length;
            isFirstLoad = false;
            
            messageList.innerHTML = '';
            console.log("Rendering messages. Count:", messages.length);

            if (messages.length === 0) {
                console.log("No messages to display.");
                messageList.innerHTML = `<div class="message-card no-messages"><p>📬 You haven't received any messages yet. Share your link to get started!</p></div>`;
                return;
            }

            const decrypt = new JSEncrypt(); 
            if (!privateKey) {
                console.error("FATAL: Private key is null or undefined before decryption!");
                return;
            }
            decrypt.setPrivateKey(privateKey);
            
            messages.sort((a,b) => new Date(b.sentAt) - new Date(a.sentAt));

            messages.forEach(msg => {
                console.log("Processing message for display:", msg._id);
                if (!msg.encryptedContent) {
                    console.error("Message object missing encryptedContent:", msg);
                    return;
                }
                let decryptedContent;
                try {
                    decryptedContent = decrypt.decrypt(msg.encryptedContent);
                } catch (decryptionError) {
                    console.error("Error decrypting message " + msg._id + ":", decryptionError);
                    decryptedContent = "[Could not decrypt this message]";
                }
                
                if (decryptedContent) {
                    const messageCardOuter = document.createElement('div');
                    const isRead = readMessageIds.includes(msg._id);
                    messageCardOuter.className = 'message-card' + (isRead ? ' is-flipped' : ''); 
                    messageCardOuter.id = `msg-${msg._id}`;
                    messageCardOuter.dataset.messageId = msg._id; 
                    messageCardOuter.innerHTML = `
                        <div class="message-flipper">
                            <div class="message-front">
                                <p>New Anonymous Message!</p>
                                <span>Click to reveal</span>
                            </div>
                            <div class="message-back">
                                <p class="message-content">${decryptedContent.replace(/\n/g, '<br>')}</p>
                                <span class="message-date">Received on ${new Date(msg.sentAt).toLocaleString()}</span>
                                <div class="message-card-actions">
                                    <button class="action-btn btn-reply">Reply on Instagram</button>
                                    <button class="action-btn btn-delete" data-id="${msg._id}">Delete</button>
                                </div>
                            </div>
                        </div>
                    `;
                    messageList.appendChild(messageCardOuter);
                } else {
                    console.warn("Decryption resulted in null for message:", msg._id, "Original encrypted:", msg.encryptedContent);
                    const messageCardOuter = document.createElement('div');
                    messageCardOuter.className = 'message-card is-flipped'; 
                    messageCardOuter.id = `msg-${msg._id}`;
                    messageCardOuter.dataset.messageId = msg._id;
                    messageCardOuter.innerHTML = `
                        <div class="message-flipper">
                            <div class="message-front" style="display:none;"></div>
                            <div class="message-back">
                                <p class="message-content">[Error: Could not display this message. It might be corrupted.]</p>
                                <span class="message-date">Received on ${new Date(msg.sentAt).toLocaleString()}</span>
                                <div class="message-card-actions">
                                    <button class="action-btn btn-delete" data-id="${msg._id}">Delete</button>
                                </div>
                            </div>
                        </div>`;
                    messageList.appendChild(messageCardOuter);
                }
            });
        } catch (error) {
            console.error('Critical error in fetchAndDisplayMessages:', error);
            messageList.innerHTML = `<div class="message-card error"><p>An error occurred while loading messages.</p></div>`;
        }
    };
    
    console.log("Dashboard script initialized. Starting message fetch and polling.");
    fetchAndDisplayMessages();
    setInterval(fetchAndDisplayMessages, 7000); // Poll every 7 seconds
});
