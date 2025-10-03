// Configuration
const API_BASE_URL = window.location.origin; // Use current domain
let currentAdminPass = null;
let recentEntries = JSON.parse(localStorage.getItem('recentEntries') || '[]');

// DOM Elements
const memberForm = document.getElementById('memberForm');
const adminVerifyForm = document.getElementById('adminVerifyForm');
const otpForm = document.getElementById('otpForm');
const updatePasswordsBtn = document.getElementById('updatePasswordsBtn');
const changePasswordsBtn = document.getElementById('changePasswordsBtn');
const logoutBtn = document.getElementById('logoutBtn');
const backToEmailBtn = document.getElementById('backToEmail');
const closePasswordsBtn = document.getElementById('closePasswordsBtn');
const copyAllPasswordsBtn = document.getElementById('copyAllPasswordsBtn');
const serverStatus = document.getElementById('serverStatus');

const adminLoginForm = document.getElementById('adminLoginForm');
const adminOtpForm = document.getElementById('adminOtpForm');
const adminActions = document.getElementById('adminActions');
const passwordsSection = document.getElementById('passwordsSection');

const statusMessage = document.getElementById('statusMessage');
const loadingOverlay = document.getElementById('loadingOverlay');

// Utility Functions
function showLoading() {
    loadingOverlay.classList.add('show');
}

function hideLoading() {
    loadingOverlay.classList.remove('show');
}

function showStatus(message, type = 'info') {
    statusMessage.textContent = message;
    statusMessage.className = `status-message ${type} show`;
    
    setTimeout(() => {
        statusMessage.classList.remove('show');
    }, 4000);
}

function showAdminStep(step) {
    document.querySelectorAll('.admin-step').forEach(el => {
        el.classList.remove('active');
    });
    step.classList.add('active');
    step.classList.add('fade-in');
}

async function makeRequest(endpoint, method = 'GET', data = null) {
    const config = {
        method,
        headers: {
            'Content-Type': 'application/json',
        },
    };
    
    if (data) {
        config.body = JSON.stringify(data);
    }
    
    const response = await fetch(`${API_BASE_URL}${endpoint}`, config);
    
    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText || `HTTP ${response.status}`);
    }
    
    return response;
}

// Member Entry Functionality
memberForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const regNo = document.getElementById('regNo').value.trim();
    
    if (!regNo) {
        showStatus('Please enter your registration number', 'error');
        return;
    }
    
    showLoading();
    
    try {
        await makeRequest('/enter', 'POST', { regNo });
        showStatus('Entry logged successfully! Welcome to the Robotics Club.', 'success');
        
        // Add to recent entries
        addRecentEntry(regNo);
        
        document.getElementById('regNo').value = '';
    } catch (error) {
        console.error('Entry error:', error);
        showStatus(`Failed to log entry: ${error.message}`, 'error');
    } finally {
        hideLoading();
    }
});

// Admin Verification
adminVerifyForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const email = document.getElementById('adminEmail').value.trim();
    
    if (!email) {
        showStatus('Please enter your admin email', 'error');
        return;
    }
    
    showLoading();
    
    try {
        const response = await makeRequest('/verifyAdmin', 'POST', { to: email });
        const otpCode = await response.text();
        
        // Store the OTP for verification (in production, this would be handled server-side)
        currentAdminPass = otpCode;
        
        showStatus('OTP sent to your email. Please check your inbox.', 'success');
        showAdminStep(adminOtpForm);
    } catch (error) {
        console.error('Admin verification error:', error);
        showStatus(`Verification failed: ${error.message}`, 'error');
    } finally {
        hideLoading();
    }
});

// OTP Verification
otpForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const enteredOtp = document.getElementById('otpCode').value.trim();
    
    if (!enteredOtp) {
        showStatus('Please enter the OTP', 'error');
        return;
    }
    
    if (enteredOtp !== currentAdminPass) {
        showStatus('Invalid OTP. Please try again.', 'error');
        document.getElementById('otpCode').value = '';
        return;
    }
    
    showStatus('OTP verified successfully!', 'success');
    showAdminStep(adminActions);
    document.getElementById('otpCode').value = '';
});

// Update Passwords (Fetch current passwords)
updatePasswordsBtn.addEventListener('click', async () => {
    if (!currentAdminPass) {
        showStatus('Please verify your admin access first', 'error');
        return;
    }
    
    showLoading();
    
    try {
        const response = await makeRequest('/update', 'POST', { 
            adminPass: currentAdminPass 
        });
        const passwordsData = await response.text();
        const passwords = passwordsData.split(',').filter(p => p.trim());
        
        displayPasswords(passwords);
        showStatus('Current passwords retrieved successfully', 'success');
    } catch (error) {
        console.error('Update passwords error:', error);
        showStatus(`Failed to fetch passwords: ${error.message}`, 'error');
    } finally {
        hideLoading();
    }
});

// Change All Passwords
changePasswordsBtn.addEventListener('click', async () => {
    if (!currentAdminPass) {
        showStatus('Please verify your admin access first', 'error');
        return;
    }
    
    const confirmed = confirm(
        'Are you sure you want to change all member passwords? ' +
        'New passwords will be sent to all members via email.'
    );
    
    if (!confirmed) {
        return;
    }
    
    showLoading();
    
    try {
        await makeRequest('/changepassword', 'POST', { 
            adminPass: currentAdminPass 
        });
        showStatus('All passwords changed successfully! New passwords sent via email.', 'success');
        
        // Clear any displayed passwords since they're now outdated
        if (passwordsSection.style.display !== 'none') {
            passwordsSection.style.display = 'none';
        }
        
        // Generate new admin pass for security
        currentAdminPass = null;
        showStatus('Please re-verify for additional admin actions', 'info');
        setTimeout(() => {
            showAdminStep(adminLoginForm);
            document.getElementById('adminEmail').value = '';
        }, 2000);
        
    } catch (error) {
        console.error('Change passwords error:', error);
        showStatus(`Failed to change passwords: ${error.message}`, 'error');
    } finally {
        hideLoading();
    }
});

// Display passwords in a formatted way
function displayPasswords(passwords) {
    const passwordsList = document.getElementById('passwordsList');
    passwordsList.innerHTML = '';
    
    if (passwords.length === 0) {
        passwordsList.innerHTML = '<p class="description">No passwords found.</p>';
    } else {
        passwords.forEach((password, index) => {
            const passwordItem = document.createElement('div');
            passwordItem.className = 'password-item slide-in';
            passwordItem.innerHTML = `
                <span>Member ${index + 1}:</span>
                <span class="password-text">${password}</span>
            `;
            passwordsList.appendChild(passwordItem);
        });
    }
    
    passwordsSection.style.display = 'block';
    passwordsSection.scrollIntoView({ behavior: 'smooth' });
}

// Navigation and UI Controls
backToEmailBtn.addEventListener('click', () => {
    showAdminStep(adminLoginForm);
    document.getElementById('otpCode').value = '';
});

logoutBtn.addEventListener('click', () => {
    currentAdminPass = null;
    showAdminStep(adminLoginForm);
    document.getElementById('adminEmail').value = '';
    document.getElementById('otpCode').value = '';
    passwordsSection.style.display = 'none';
    showStatus('Logged out successfully', 'info');
});

closePasswordsBtn.addEventListener('click', () => {
    passwordsSection.style.display = 'none';
});

// Copy all passwords functionality
copyAllPasswordsBtn.addEventListener('click', () => {
    const passwordItems = document.querySelectorAll('.password-text');
    const passwords = Array.from(passwordItems).map(item => item.textContent).join('\n');
    
    navigator.clipboard.writeText(passwords).then(() => {
        showStatus('All passwords copied to clipboard', 'success');
    }).catch(() => {
        // Fallback for older browsers
        const textArea = document.createElement('textarea');
        textArea.value = passwords;
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
        showStatus('All passwords copied to clipboard', 'success');
    });
});

// Auto-format OTP input
document.getElementById('otpCode').addEventListener('input', (e) => {
    // Remove non-digits
    e.target.value = e.target.value.replace(/\D/g, '');
    
    // Limit to 6 digits
    if (e.target.value.length > 6) {
        e.target.value = e.target.value.slice(0, 6);
    }
});

// Auto-submit OTP when 6 digits are entered
document.getElementById('otpCode').addEventListener('input', (e) => {
    if (e.target.value.length === 6) {
        setTimeout(() => {
            otpForm.dispatchEvent(new Event('submit'));
        }, 500);
    }
});

// Enhanced registration number validation
document.getElementById('regNo').addEventListener('input', (e) => {
    // Allow alphanumeric characters only
    e.target.value = e.target.value.replace(/[^a-zA-Z0-9]/g, '');
});

// Keyboard shortcuts
document.addEventListener('keydown', (e) => {
    // Escape key to close passwords section
    if (e.key === 'Escape' && passwordsSection.style.display !== 'none') {
        passwordsSection.style.display = 'none';
    }
    
    // Enter key to focus next form element
    if (e.key === 'Enter' && e.target.tagName === 'INPUT') {
        e.preventDefault();
        const form = e.target.closest('form');
        if (form) {
            form.dispatchEvent(new Event('submit'));
        }
    }
});

// Recent entries management
function addRecentEntry(regNo) {
    const entry = {
        regNo,
        timestamp: new Date().toLocaleString()
    };
    
    recentEntries.unshift(entry);
    
    // Keep only last 5 entries
    if (recentEntries.length > 5) {
        recentEntries = recentEntries.slice(0, 5);
    }
    
    localStorage.setItem('recentEntries', JSON.stringify(recentEntries));
    displayRecentEntries();
}

function displayRecentEntries() {
    const entriesContainer = document.getElementById('recentEntries');
    const entriesList = document.getElementById('entriesList');
    
    if (recentEntries.length === 0) {
        entriesContainer.style.display = 'none';
        return;
    }
    
    entriesList.innerHTML = '';
    
    recentEntries.forEach(entry => {
        const entryItem = document.createElement('div');
        entryItem.className = 'entry-item';
        entryItem.innerHTML = `
            <span><strong>${entry.regNo}</strong></span>
            <span class="entry-time">${entry.timestamp}</span>
        `;
        entriesList.appendChild(entryItem);
    });
    
    entriesContainer.style.display = 'block';
}

// Server status checking
async function checkServerStatus() {
    try {
        const response = await fetch(`${API_BASE_URL}/get`);
        if (response.ok) {
            updateServerStatus(true);
        } else {
            updateServerStatus(false);
        }
    } catch (error) {
        updateServerStatus(false);
    }
}

function updateServerStatus(isConnected) {
    if (isConnected) {
        serverStatus.className = 'status-indicator connected';
        serverStatus.innerHTML = '<i class="fas fa-circle"></i><span>Connected</span>';
    } else {
        serverStatus.className = 'status-indicator disconnected';
        serverStatus.innerHTML = '<i class="fas fa-circle"></i><span>Disconnected</span>';
    }
}

// Initialize the application
document.addEventListener('DOMContentLoaded', () => {
    // Add entrance animation to cards
    document.querySelectorAll('.card').forEach((card, index) => {
        card.style.opacity = '0';
        card.style.transform = 'translateY(20px)';
        
        setTimeout(() => {
            card.style.transition = 'all 0.5s ease';
            card.style.opacity = '1';
            card.style.transform = 'translateY(0)';
        }, index * 200);
    });
    
    // Display recent entries
    displayRecentEntries();
    
    // Check server status
    checkServerStatus();
    
    // Check server status periodically
    setInterval(checkServerStatus, 30000); // Every 30 seconds
    
    // Focus on first input
    document.getElementById('regNo').focus();
    
    console.log('Robotics Club Door Lock System initialized');
});