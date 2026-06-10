let currentAuthMode = 'login';

function switchAuthTab(mode) {
    currentAuthMode = mode;
    document.getElementById('auth-error').innerText = "";

    const loginBtn = document.getElementById('tab-login-btn');
    const registerBtn = document.getElementById('tab-register-btn');
    const title = document.getElementById('auth-title');
    const submitBtn = document.getElementById('auth-submit-btn');

    if (mode === 'login') {
        loginBtn.classList.add('active');
        registerBtn.classList.remove('active');
        title.innerText = "Влез в профила си:";
        submitBtn.innerText = "Влез";
    } else {
        registerBtn.classList.add('active');
        loginBtn.classList.remove('active');
        title.innerText = "Създай си профил:";
        submitBtn.innerText = "Регистрирай ме";
    }
}

async function handleAuthSubmit() {
    const usernameInput = document.getElementById('auth-username').value;
    const passwordInput = document.getElementById('auth-password').value;
    const errorElement = document.getElementById('auth-error');

    if (!usernameInput || !passwordInput) {
        errorElement.innerText = "Моля, попълни всички полета!";
        return;
    }

    if (usernameInput === "admin" && passwordInput === "admin") {
        window.location.href = "admin.html";
        return;
    }

    const endpoint = currentAuthMode === 'login' ? 'login' : 'register';

    try {
        const response = await fetch(`http://127.0.0.1:8000/api/${endpoint}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username: usernameInput, password: passwordInput })
        });

        const data = await response.json();

        if (response.ok) {
            sessionStorage.setItem('loggedInUser', data.username);
            sessionStorage.setItem('userPoints', data.points || 0);
            sessionStorage.removeItem('isGuest');

            window.location.href = "index.html";
        } else {
            errorElement.innerText = data.detail || "Грешка при автентификация.";
        }
    } catch (error) {
        console.error("Грешка:", error);
        errorElement.innerText = "Няма връзка с Backend сървъра.";
    }
}

function handleGuestLogin() {
    const randomId = Math.floor(1000 + Math.random() * 9000);
    const guestName = `Гост_${randomId}`;

    sessionStorage.setItem('loggedInUser', guestName);
    sessionStorage.setItem('userPoints', 0);
    sessionStorage.setItem('isGuest', 'true');

    window.location.href = "index.html";
}