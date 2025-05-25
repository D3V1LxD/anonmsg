// auth.js (Corrected API_URL)

// If the user is already logged in, redirect them to the dashboard immediately
if (localStorage.getItem('authToken')) {
    window.location.href = 'dashboard.html';
}

document.addEventListener('DOMContentLoaded', () => {
    // *** THIS IS THE CORRECTED LINE ***
    const API_URL = 'https://anommsgbackend-anonmsgback.up.railway.app/api'; 
    // Ensure '/api' is at the end if your backend routes are prefixed with /api

    const formTitle = document.getElementById('form-title');
    const usernameGroup = document.getElementById('username-group');
    const submitBtn = document.getElementById('submit-btn');
    const toggleText = document.getElementById('toggle-text');
    const toggleLink = document.getElementById('toggle-link');
    const authForm = document.getElementById('auth-form');
    const errorMessage = document.getElementById('error-message');
    const termsGroup = document.getElementById('terms-group');
    const agreeTermsCheckbox = document.getElementById('agree-terms');

    function setFormMode(isSignInMode, animate = false) {
        if (animate) {
            authForm.style.opacity = '0';
            authForm.style.transform = 'translateY(10px)';
        }
        if (isSignInMode) {
            formTitle.textContent = 'Sign In to Your Account';
            usernameGroup.style.display = 'none';
            termsGroup.style.display = 'none';
            submitBtn.textContent = 'Sign In';
            submitBtn.disabled = false;
            toggleText.textContent = "Don't have an account?";
            toggleLink.textContent = 'Sign Up';
            toggleLink.setAttribute('data-mode', 'signup');
        } else {
            formTitle.textContent = 'Create Your Account';
            usernameGroup.style.display = 'block';
            termsGroup.style.display = 'flex';
            submitBtn.textContent = 'Sign Up';
            submitBtn.disabled = !agreeTermsCheckbox.checked; 
            toggleText.textContent = 'Already have an account?';
            toggleLink.textContent = 'Sign In';
            toggleLink.setAttribute('data-mode', 'signin');
        }
        errorMessage.textContent = '';
        if (animate) {
            setTimeout(() => {
                authForm.style.opacity = '1';
                authForm.style.transform = 'translateY(0)';
            }, 50);
        }
    }
    
    const isSignInInitial = new URLSearchParams(window.location.search).get('mode') === 'signin';
    authForm.style.transition = 'opacity 0.3s ease-out, transform 0.3s ease-out';
    setFormMode(isSignInInitial);

    toggleLink.addEventListener('click', (e) => {
        e.preventDefault();
        const currentModeIsSignIn = toggleLink.getAttribute('data-mode') === 'signin';
        setFormMode(currentModeIsSignIn, true);
    });

    agreeTermsCheckbox.addEventListener('change', () => {
        if (!formTitle.textContent.startsWith('Sign In')) {
            submitBtn.disabled = !agreeTermsCheckbox.checked;
        }
    });

    authForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        errorMessage.textContent = '';
        const isSignInAttempt = formTitle.textContent.startsWith('Sign In');
        if (!isSignInAttempt && !agreeTermsCheckbox.checked) {
            errorMessage.style.color = 'var(--danger-color)';
            errorMessage.textContent = 'You must agree to the Privacy and Policy to sign up.';
            return;
        }
        submitBtn.disabled = true;
        submitBtn.textContent = 'Processing...';
        const endpoint = isSignInAttempt ? '/login' : '/register';
        const formData = {
            email: document.getElementById('email').value.trim(),
            password: document.getElementById('password').value,
        };
        if (!isSignInAttempt) {
            formData.username = document.getElementById('username').value.trim();
        }

        try {
            const response = await fetch(`${API_URL}${endpoint}`, { // Make sure API_URL includes '/api' if your backend routes do
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData),
            });
            const data = await response.json(); // This line will fail if response is HTML
            if (!response.ok) throw new Error(data.error || 'Something went wrong');
            
            if (isSignInAttempt) {
                localStorage.setItem('authToken', data.token);
                localStorage.setItem('username', data.username);
                localStorage.setItem('privateKey', data.decryptedPrivateKey);
                window.location.href = 'dashboard.html';
            } else {
                errorMessage.style.color = 'var(--success-color)';
                errorMessage.textContent = 'Registration successful! Please sign in.';
                agreeTermsCheckbox.checked = false;
                setFormMode(true, true);
            }
        } catch (error) {
            if (error.message.includes('already exists')) {
                errorMessage.style.color = 'var(--danger-color)';
                errorMessage.textContent = 'This email already exists. Please sign in instead.';
                agreeTermsCheckbox.checked = false;
                setFormMode(true, true); 
            } else if (error instanceof SyntaxError && error.message.includes("Unexpected token '<'")) {
                errorMessage.style.color = 'var(--danger-color)';
                errorMessage.textContent = 'Error connecting to server. Please try again later.';
                console.error("Full error trying to parse JSON:", error);
            }
             else {
                errorMessage.style.color = 'var(--danger-color)';
                errorMessage.textContent = error.message;
            }
        } finally {
            const isNowSignIn = formTitle.textContent.startsWith('Sign In');
            if (isNowSignIn) {
               submitBtn.disabled = false;
            } else {
               submitBtn.disabled = !agreeTermsCheckbox.checked;
            }
            submitBtn.textContent = isNowSignIn ? 'Sign In' : 'Sign Up';
        }
    });
});
