// profile.js (Final Corrected Version - Fix for stuck button)

document.addEventListener('DOMContentLoaded', () => {
    const API_URL = 'http://localhost:5000/api';
    const profileUsernameSpan = document.getElementById('profile-username');
    const messageForm = document.getElementById('message-form');
    const messageFeedback = document.getElementById('message-feedback');
    const messageTextarea = document.getElementById('anonymous-message');
    const submitBtn = document.getElementById('send-btn');

    const urlParams = new URLSearchParams(window.location.search);
    const username = urlParams.get('user');

    if (!username) {
        profileUsernameSpan.textContent = "Invalid User";
        messageForm.style.display = 'none';
        submitBtn.textContent = 'User Not Found';
        return;
    }

    profileUsernameSpan.textContent = username;
    let userPublicKey = null;

    const fetchPublicKey = async () => {
        try {
            const response = await fetch(`${API_URL}/users/${username}/public-key`);
            const data = await response.json();
            if (!response.ok) {
                throw new Error(data.error || `User '${username}' not found.`);
            }
            userPublicKey = data.publicKey;
            submitBtn.disabled = false;
            submitBtn.textContent = 'Send Anonymously';
            messageTextarea.placeholder = 'Write your secret message here... be nice! 😊';
        } catch (error) {
            messageFeedback.className = 'feedback-text error';
            messageFeedback.textContent = error.message;
            submitBtn.textContent = 'User Not Available';
            messageTextarea.placeholder = 'Cannot send message to this user.';
            messageTextarea.disabled = true;
        }
    };
    
    fetchPublicKey();

    messageForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const message = messageTextarea.value.trim();

        if (!userPublicKey) {
            messageFeedback.textContent = 'Cannot send message. Public key is missing.';
            messageFeedback.className = 'feedback-text error';
            return;
        }
        
        if (!message) {
            messageFeedback.textContent = 'Message cannot be empty.';
            messageFeedback.className = 'feedback-text error';
            return;
        }

        submitBtn.disabled = true;
        submitBtn.textContent = 'Encrypting & Sending...';

        try {
            const encrypt = new JSEncrypt();
            encrypt.setPublicKey(userPublicKey);
            const encryptedContent = encrypt.encrypt(message);

            if (!encryptedContent) {
                throw new Error('Encryption failed. Message may be too long.');
            }

            // --- THIS IS THE CORRECTED LINE ---
            // It now correctly uses the 'username' variable from the top of the file.
            const response = await fetch(`${API_URL}/messages/${username}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ encryptedContent }),
            });

            const data = await response.json();
            if (!response.ok) throw new Error(data.error);
            
            messageFeedback.textContent = 'Your anonymous message has been sent successfully!';
            messageFeedback.className = 'feedback-text success';
            messageForm.reset();
        } catch (error) {
            messageFeedback.textContent = error.message;
            messageFeedback.className = 'feedback-text error';
        } finally {
            if (userPublicKey) {
                submitBtn.disabled = false;
                submitBtn.textContent = 'Send Anonymously';
            }
            setTimeout(() => { messageFeedback.textContent = ''; }, 5000);
        }
    });
});