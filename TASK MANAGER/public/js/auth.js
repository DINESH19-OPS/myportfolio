// Toast helper
function showToast(message, type = 'info') {
  const container = document.getElementById('toast-container');
  if (!container) return;

  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  
  let emoji = 'ℹ️';
  if (type === 'success') emoji = '✅';
  if (type === 'error') emoji = '🚨';

  toast.innerHTML = `
    <div style="display:flex;align-items:center;gap:8px;">
      <span>${emoji}</span>
      <span>${message}</span>
    </div>
    <button class="toast-close" onclick="this.parentElement.remove()">✕</button>
  `;
  container.appendChild(toast);

  // Auto-dismiss after 4 seconds
  setTimeout(() => {
    toast.style.animation = 'toastOut 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards';
    toast.addEventListener('animationend', () => toast.remove());
  }, 4000);
}

// Switch between login, register, forgot, and otp tabs
function switchTab(tab) {
  const loginSection = document.getElementById('login-form-section');
  const registerSection = document.getElementById('register-form-section');
  const forgotSection = document.getElementById('forgot-form-section');
  const otpSection = document.getElementById('otp-form-section');
  
  const tabLogin = document.getElementById('tab-login');
  const tabRegister = document.getElementById('tab-register');

  // Clear errors
  document.querySelectorAll('.form-error').forEach(el => el.textContent = '');

  // Remove active class from all sections
  if (loginSection) loginSection.classList.remove('active');
  if (registerSection) registerSection.classList.remove('active');
  if (forgotSection) forgotSection.classList.remove('active');
  if (otpSection) otpSection.classList.remove('active');

  // Remove active class from tabs
  if (tabLogin) tabLogin.classList.remove('active');
  if (tabRegister) tabRegister.classList.remove('active');

  if (tab === 'login') {
    if (loginSection) loginSection.classList.add('active');
    if (tabLogin) tabLogin.classList.add('active');
  } else if (tab === 'register') {
    if (registerSection) registerSection.classList.add('active');
    if (tabRegister) tabRegister.classList.add('active');
  } else if (tab === 'forgot') {
    if (forgotSection) forgotSection.classList.add('active');
  } else if (tab === 'otp') {
    if (otpSection) otpSection.classList.add('active');
  }
}

// Toggle password visibility
function togglePassword(inputId, button) {
  const input = document.getElementById(inputId);
  if (input.type === 'password') {
    input.type = 'text';
    button.textContent = '🙈';
  } else {
    input.type = 'password';
    button.textContent = '👁️';
  }
}

// Check session on load
async function checkSession() {
  try {
    const res = await fetch('/api/auth/me');
    const data = await res.json();
    if (data.success) {
      window.location.href = '/dashboard';
    }
  } catch (err) {
    // Session doesn't exist, proceed normally
  }
}

document.addEventListener('DOMContentLoaded', () => {
  checkSession();

  const loginForm = document.getElementById('login-form');
  const registerForm = document.getElementById('register-form');

  // Handle Login submission
  loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    // Clear errors
    document.querySelectorAll('.form-error').forEach(el => el.textContent = '');
    
    const emailInput = document.getElementById('login-email');
    const passwordInput = document.getElementById('login-password');
    const loginBtnText = document.getElementById('login-btn-text');
    const loginBtn = document.getElementById('login-btn');

    let hasError = false;

    if (!emailInput.value.trim()) {
      document.getElementById('login-email-err').textContent = 'Email is required';
      hasError = true;
    } else if (!/\S+@\S+\.\S+/.test(emailInput.value)) {
      document.getElementById('login-email-err').textContent = 'Enter a valid email address';
      hasError = true;
    }

    if (!passwordInput.value) {
      document.getElementById('login-password-err').textContent = 'Password is required';
      hasError = true;
    }

    if (hasError) return;

    // Loading State
    loginBtn.disabled = true;
    loginBtnText.textContent = 'Signing in…';

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: emailInput.value.trim(),
          password: passwordInput.value
        })
      });

      const data = await res.json();
      if (res.ok && data.success) {
        showToast('Successfully signed in!', 'success');
        setTimeout(() => {
          window.location.href = '/dashboard';
        }, 800);
      } else {
        document.getElementById('login-error').textContent = data.error || 'Invalid credentials';
        showToast(data.error || 'Login failed', 'error');
        loginBtn.disabled = false;
        loginBtnText.textContent = 'Sign In';
      }
    } catch (err) {
      console.error(err);
      showToast('Connection error. Please try again.', 'error');
      loginBtn.disabled = false;
      loginBtnText.textContent = 'Sign In';
    }
  });

  // Handle Register submission
  registerForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    // Clear errors
    document.querySelectorAll('.form-error').forEach(el => el.textContent = '');

    const nameInput = document.getElementById('reg-name');
    const emailInput = document.getElementById('reg-email');
    const passwordInput = document.getElementById('reg-password');
    const confirmInput = document.getElementById('reg-confirm');
    const registerBtn = document.getElementById('register-btn');
    const registerBtnText = document.getElementById('register-btn-text');

    let hasError = false;

    if (!nameInput.value.trim()) {
      document.getElementById('reg-name-err').textContent = 'Full name is required';
      hasError = true;
    }

    if (!emailInput.value.trim()) {
      document.getElementById('reg-email-err').textContent = 'Email is required';
      hasError = true;
    } else if (!/\S+@\S+\.\S+/.test(emailInput.value)) {
      document.getElementById('reg-email-err').textContent = 'Enter a valid email address';
      hasError = true;
    }

    if (!passwordInput.value) {
      document.getElementById('reg-password-err').textContent = 'Password is required';
      hasError = true;
    } else if (passwordInput.value.length < 6) {
      document.getElementById('reg-password-err').textContent = 'Password must be at least 6 characters';
      hasError = true;
    }

    if (!confirmInput.value) {
      document.getElementById('reg-confirm-err').textContent = 'Confirm password is required';
      hasError = true;
    } else if (passwordInput.value !== confirmInput.value) {
      document.getElementById('reg-confirm-err').textContent = 'Passwords do not match';
      hasError = true;
    }

    if (hasError) return;

    // Loading State
    registerBtn.disabled = true;
    registerBtnText.textContent = 'Creating account…';

    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: nameInput.value.trim(),
          email: emailInput.value.trim(),
          password: passwordInput.value
        })
      });

      const data = await res.json();
      if (res.ok && data.success) {
        showToast('Account successfully created!', 'success');
        setTimeout(() => {
          window.location.href = '/dashboard';
        }, 800);
      } else {
        document.getElementById('register-error').textContent = data.error || 'Registration failed';
        showToast(data.error || 'Registration failed', 'error');
        registerBtn.disabled = false;
        registerBtnText.textContent = 'Create Account';
      }
    } catch (err) {
      console.error(err);
      showToast('Connection error. Please try again.', 'error');
      registerBtn.disabled = false;
      registerBtnText.textContent = 'Create Account';
    }
  });

  const forgotForm = document.getElementById('forgot-form');
  const otpForm = document.getElementById('otp-form');
  let currentForgotEmail = '';

  // Handle Forgot Password submission
  forgotForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    document.querySelectorAll('.form-error').forEach(el => el.textContent = '');

    const emailInput = document.getElementById('forgot-email');
    const forgotBtn = document.getElementById('forgot-btn');
    const forgotBtnText = document.getElementById('forgot-btn-text');

    if (!emailInput.value.trim()) {
      document.getElementById('forgot-email-err').textContent = 'Email is required';
      return;
    } else if (!/\S+@\S+\.\S+/.test(emailInput.value)) {
      document.getElementById('forgot-email-err').textContent = 'Enter a valid email address';
      return;
    }

    forgotBtn.disabled = true;
    forgotBtnText.textContent = 'Sending OTP…';

    try {
      const res = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: emailInput.value.trim() })
      });

      const data = await res.json();
      if (res.ok && data.success) {
        currentForgotEmail = emailInput.value.trim();
        showToast(data.message || 'OTP sent! Check your email.', 'success');
        document.getElementById('otp-subtitle').textContent = `A 6-digit OTP code was sent to ${currentForgotEmail}. Check your inbox.`;
        switchTab('otp');
      } else {
        document.getElementById('forgot-error').textContent = data.error || 'Failed to send OTP';
        showToast(data.error || 'Failed to send OTP', 'error');
      }
    } catch (err) {
      console.error(err);
      showToast('Connection error. Please try again.', 'error');
    } finally {
      forgotBtn.disabled = false;
      forgotBtnText.textContent = 'Send OTP';
    }
  });

  // Handle OTP Verification submission
  otpForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    document.querySelectorAll('.form-error').forEach(el => el.textContent = '');

    const otpInput = document.getElementById('otp-code');
    const otpBtn = document.getElementById('otp-btn');
    const otpBtnText = document.getElementById('otp-btn-text');

    if (!otpInput.value.trim()) {
      document.getElementById('otp-code-err').textContent = 'OTP code is required';
      return;
    } else if (otpInput.value.trim().length !== 6) {
      document.getElementById('otp-code-err').textContent = 'OTP must be 6 digits';
      return;
    }

    otpBtn.disabled = true;
    otpBtnText.textContent = 'Verifying…';

    try {
      const res = await fetch('/api/auth/verify-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: currentForgotEmail,
          otp: otpInput.value.trim()
        })
      });

      const data = await res.json();
      if (res.ok && data.success) {
        showToast('Successfully signed in via OTP!', 'success');
        setTimeout(() => {
          window.location.href = '/dashboard';
        }, 800);
      } else {
        document.getElementById('otp-error').textContent = data.error || 'Invalid OTP';
        showToast(data.error || 'Verification failed', 'error');
      }
    } catch (err) {
      console.error(err);
      showToast('Connection error. Please try again.', 'error');
    } finally {
      otpBtn.disabled = false;
      otpBtnText.textContent = 'Verify & Log In';
    }
  });
});
