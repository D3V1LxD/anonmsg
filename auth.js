// auth.js (With Terms Agreement Logic)

// If the user is already logged in, redirect them to the dashboard immediately
if (localStorage.getItem('authToken')) {
    window.location.href = 'dashboard.html';
}

document.addEventListener('DOMContentLoaded', () => {
    const API_URL = 'anommsgbackend-anonmsgback.up.railway.app';
    const formTitle = document.getElementById('form-title');
    const usernameGroup = document.getElementById('username-group');
    const submitBtn = document.getElementById('submit-btn');
    const toggleText = document.getElementById('toggle-text');
    const toggleLink = document.getElementById('toggle-link');
    const authForm = document.getElementById('auth-form');
    const errorMessage = document.getElementById('error-message');

    // NEW: Get the terms elements
    const termsGroup = document.getElementById('terms-group');
    const agreeTermsCheckbox = document.getElementById('agree-terms');

    function setFormMode(isSignInMode, animate = false) {
        if (animate) {
            authForm.style.opacity = '0';
            authForm.style.transform = 'translateY(10px)';
        }

        if (isSignInMode) { // SIGN IN MODE
            formTitle.textContent = 'Sign In to Your Account';
            usernameGroup.style.display = 'none';
            termsGroup.style.display = 'none'; // Hide terms for sign-in
            submitBtn.textContent = 'Sign In';
            submitBtn.disabled = false; // Sign in button is always enabled
            toggleText.textContent = "Don't have an account?";
            toggleLink.textContent = 'Sign Up';
            toggleLink.setAttribute('data-mode', 'signup');
        } else { // SIGN UP MODE
            formTitle.textContent = 'Create Your Account';
            usernameGroup.style.display = 'block';
            termsGroup.style.display = 'flex'; // Show terms for sign-up
            submitBtn.textContent = 'Sign Up';
            // Sign up button is disabled until terms are agreed
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

    // NEW: Event listener for the terms checkbox
    agreeTermsCheckbox.addEventListener('change', () => {
        // Only affect the button if it's in Sign Up mode
        if (!formTitle.textContent.startsWith('Sign In')) {
            submitBtn.disabled = !agreeTermsCheckbox.checked;
        }
    });

    authForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        errorMessage.textContent = '';
        
        const isSignInAttempt = formTitle.textContent.startsWith('Sign In');

        // NEW: Check for terms agreement if signing up
        if (!isSignInAttempt && !agreeTermsCheckbox.checked) {
            errorMessage.style.color = 'var(--danger-color)';
            errorMessage.textContent = 'You must agree to the Privacy and Policy to sign up.';
            return; // Stop submission
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
            const response = await fetch(`${API_URL}${endpoint}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData),
            });
            const data = await response.json();
            if (!response.ok) throw new Error(data.error || 'Something went wrong');
            
            if (isSignInAttempt) {
                localStorage.setItem('authToken', data.token);
                localStorage.setItem('username', data.username);
                localStorage.setItem('privateKey', data.decryptedPrivateKey);
                window.location.href = 'dashboard.html';
            } else {
                errorMessage.style.color = 'var(--success-color)';
                errorMessage.textContent = 'Registration successful! Please sign in.';
                agreeTermsCheckbox.checked = false; // Reset checkbox
                setFormMode(true, true); // Switch to sign-in mode
            }
        } catch (error) {
            if (error.message.includes('already exists')) {
                errorMessage.style.color = 'var(--danger-color)';
                errorMessage.textContent = 'This email already exists. Please sign in instead.';
                agreeTermsCheckbox.checked = false; // Reset checkbox
                setFormMode(true, true); 
            } else {
                errorMessage.style.color = 'var(--danger-color)';
                errorMessage.textContent = error.message;
            }
        } finally {
            // Re-enable button unless we successfully registered and switched forms
            if (!(endpoint === '/register' && errorMessage.textContent.startsWith('Registration successful'))) {
                 const isNowSignIn = formTitle.textContent.startsWith('Sign In');
                 if (isNowSignIn) {
                    submitBtn.disabled = false;
                 } else {
                    submitBtn.disabled = !agreeTermsCheckbox.checked;
                 }
            }
            // Ensure correct button text after processing
            const isNowSignIn = formTitle.textContent.startsWith('Sign In');
            submitBtn.textContent = isNowSignIn ? 'Sign In' : 'Sign Up';
        }
    });
});
