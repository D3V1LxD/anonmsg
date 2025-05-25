// dashboard.js (Corrected API_URL)

// STEP 1: Perform critical checks immediately
const authToken = localStorage.getItem('authToken');
const username = localStorage.getItem('username');
const privateKey = localStorage.getItem('privateKey');

if (!authToken || !username || !privateKey) {
    window.location.replace('auth.html?mode=signin');
}

document.addEventListener('DOMContentLoaded', () => {
    // *** THIS IS THE CORRECTED LINE ***
    const API_URL = 'https://anommsgbackend-anonmsgback.up.railway.app/api';
    // Ensure '/api' is at the end if your backend routes are prefixed with /api

    const usernameDisplay = document.getElementById('username-display');
    const profileLinkInput = document.getElementById('profile-link');
    const copyBtn = document.getElementById('copy-btn');
    const logoutBtn = document.getElementById('logout-btn');
    const messageList = document.getElementById('message-list');
    const copyFeedback = document.getElementById('copy-feedback');
    const notificationSound = new Audio('notification.mp3');
    const terminateAccountBtn = document.getElementById('terminate-account-btn');

    if ('Notification' in window && Notification.permission === 'default') {
        Notification.requestPermission();
    }
    
    usernameDisplay.textContent = username;
    profileLinkInput.value = `${window.location.origin}/profile.html?user=${username.toLowerCase()}`;
    
    logoutBtn.addEventListener('click', () => {
        localStorage.clear();
        window.location.replace('index.html');
    });

    copyBtn.addEventListener('click', () => {
        navigator.clipboard.writeText(profileLinkInput.value).then(() => {
            copyFeedback.textContent = 'Link copied!';
            copyFeedback.style.color = 'var(--success-color)';
            copyBtn.textContent = 'Copied!';
            setTimeout(() => {
                copyFeedback.textContent = '';
                copyBtn.textContent = 'Copy Link';
            }, 3000);
        }).catch(err => {
            console.error("Copy failed", err);
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
                localStorage.clear();
                window.location.replace('index.html');
            } catch (error) {
                console.error('Account termination failed:', error);
                alert('Account termination failed: ' + error.message);
            }
        });
    }

    const READ_MESSAGES_KEY = `readAnonMessageIds_${username}`;
    function getReadMessageIds() { const readIds = localStorage.getItem(READ_MESSAGES_KEY); return readIds ? JSON.parse(readIds) : []; }
    function addMessageIdToRead(messageId) { let readIds = getReadMessageIds(); if (!readIds.includes(messageId)) { readIds.push(messageId); localStorage.setItem(READ_MESSAGES_KEY, JSON.stringify(readIds)); } }
    
    async function handleReplyClick(cardElement) { 
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
        } catch (error) { console.error('Failed to create image:', error); if (actions) actions.style.display = 'flex'; alert("Could not generate image for reply."); }
    }

    async function handleDeleteClick(messageId, buttonElement) {
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
                 if (currentMessageCount === 0 && messageList.innerHTML.trim() !== "") {
                     fetchAndDisplayMessages(); 
                 }
            }, 500);
        } catch (error) { console.error('Delete failed:', error); alert(error.message); }
     }

    function showNotification(message) { if (Notification.permission === 'granted') new Notification('New Anonymous Message!', { body: message, icon: 'favicon.png' }); }

    let currentMessageCount = 0;
    let isFirstLoad = true;

    const fetchAndDisplayMessages = async () => {
        try {
            const response = await fetch(`${API_URL}/messages`, {
                method: 'GET',
                headers: { 'x-auth-token': authToken },
            });
            if (response.status === 401) {
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
            const readMessageIds = getReadMessageIds(); 
            if (messages.length > currentMessageCount && !isFirstLoad) {
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
            if(messages.length !== currentMessageCount || isFirstLoad){ hasVisualChange = true; } 
            else {
                messageList.querySelectorAll('.message-card:not(.no-messages)').forEach(card => {
                    const cardId = card.dataset.messageId;
                    const isStoredAsRead = readMessageIds.includes(cardId);
                    const isVisuallyFlipped = card.classList.contains('is-flipped');
                    if(isStoredAsRead && !isVisuallyFlipped) card.classList.add('is-flipped'); 
                });
            }
            if (!hasVisualChange && !isFirstLoad) return;
            currentMessageCount = messages.length;
            isFirstLoad = false;
            messageList.innerHTML = '';
            if (messages.length === 0) {
                messageList.innerHTML = `<div class="message-card no-messages"><p>📬 You haven't received any messages yet.</p></div>`;
                return;
            }
            const decrypt = new JSEncrypt(); 
            if (!privateKey) { console.error("FATAL: Private key is null before decryption!"); return; }
            decrypt.setPrivateKey(privateKey);
            messages.sort((a,b) => new Date(b.sentAt) - new Date(a.sentAt));
            messages.forEach(msg => {
                if (!msg.encryptedContent) { console.error("Message missing encryptedContent:", msg); return; }
                let decryptedContent;
                try { decryptedContent = decrypt.decrypt(msg.encryptedContent); } 
                catch (decryptionError) { console.error("Error decrypting message " + msg._id + ":", decryptionError); decryptedContent = "[Could not decrypt message]"; }
                if (decryptedContent) {
                    const messageCardOuter = document.createElement('div');
                    const isRead = readMessageIds.includes(msg._id);
                    messageCardOuter.className = 'message-card' + (isRead ? ' is-flipped' : ''); 
                    messageCardOuter.id = `msg-${msg._id}`;
                    messageCardOuter.dataset.messageId = msg._id; 
                    messageCardOuter.innerHTML = `<div class="message-flipper"><div class="message-front"><p>New Anonymous Message!</p><span>Click to reveal</span></div><div class="message-back"><p class="message-content">${decryptedContent.replace(/\n/g,"<br>")}</p><span class="message-date">Received on ${new Date(msg.sentAt).toLocaleString()}</span><div class="message-card-actions"><button class="action-btn btn-reply">Reply on Instagram</button><button class="action-btn btn-delete" data-id="${msg._id}">Delete</button></div></div></div>`;
                    messageList.appendChild(messageCardOuter);
                } else {
                    const messageCardOuter = document.createElement('div');
                    messageCardOuter.className = 'message-card is-flipped'; 
                    messageCardOuter.id = `msg-${msg._id}`;
                    messageCardOuter.dataset.messageId = msg._id;
                    messageCardOuter.innerHTML = `<div class="message-flipper"><div class="message-front" style="display:none;"></div><div class="message-back"><p class="message-content">[Error: Could not display message.]</p><span class="message-date">Received on ${new Date(msg.sentAt).toLocaleString()}</span><div class="message-card-actions"><button class="action-btn btn-delete" data-id="${msg._id}">Delete</button></div></div></div>`;
                    messageList.appendChild(messageCardOuter);
                }
            });
        } catch (error) {
            console.error('Critical error in fetchAndDisplayMessages:', error);
            messageList.innerHTML = `<div class="message-card error"><p>An error occurred while loading messages.</p></div>`;
        }
    };
    fetchAndDisplayMessages();
    setInterval(fetchAndDisplayMessages, 7000);
});
