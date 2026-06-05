let currentQuestion = null;
let loggedInUser = null;
let userPoints = 0;
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

async function handleAuthSubmit(event) {
    if (event) {
        event.preventDefault();
    }

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
            loggedInUser = data.username;
            
            const localPoints = localStorage.getItem(`points_${loggedInUser}`);
            if (localPoints !== null) {
                userPoints = parseInt(localPoints);
            } else {
                userPoints = data.points || 0;
            }
            
            localStorage.setItem('game_user', loggedInUser);
            localStorage.setItem('game_points', userPoints);
            localStorage.setItem(`points_${loggedInUser}`, userPoints);
            
            document.getElementById('auth-box').style.display = 'none';
            document.getElementById('game-box').style.display = 'block';
            document.getElementById('welcome-message').innerText = `Добре дошъл, ${loggedInUser}! (Точки: ${userPoints})`;
            errorElement.innerText = "";
        } else {
            errorElement.innerText = data.detail || "Грешка!";
        }
    } catch (error) {
        console.error("Грешка:", error);
        errorElement.innerText = "Няма връзка с Backend сървъра.";
    }
}

async function loadQuestions(difficulty) {
    document.getElementById('result').innerText = "";
    try {
        const response = await fetch(`http://127.0.0.1:8000/api/questions?difficulty=${difficulty}`);
        const questions = await response.json();
        
        if(questions.length > 0) {
            currentQuestion = questions[Math.floor(Math.random() * questions.length)]; 
            displayQuestion(currentQuestion);
        } else {
            alert("Няма намерени въпроси.");
        }
    } catch (error) {
        console.error("Грешка:", error);
    }
}

function displayQuestion(q) {
    document.getElementById('quiz-box').style.display = "block";
    document.getElementById('question-text').innerText = q.question;
    const container = document.getElementById('options-container');
    container.innerHTML = ""; 

    q.options.forEach((option, index) => {
        const button = document.createElement('button');
        button.className = 'btn-option';
        button.innerText = option;
        button.onclick = () => checkAnswer(index);
        container.appendChild(button);
    });
}

function checkAnswer(selectedIndex) {
    const resultElement = document.getElementById('result');
    
    if(selectedIndex === currentQuestion.correct) {
        userPoints += 10;
        
        localStorage.setItem('game_points', userPoints);
        localStorage.setItem(`points_${loggedInUser}`, userPoints);
        
        resultElement.innerText = "Браво! Правилен отговор! +10 точки 🪙";
        resultElement.style.color = "green";
        
        document.getElementById('welcome-message').innerText = `Добре дошъл, ${loggedInUser}! (Точки: ${userPoints})`;
    } else {
        resultElement.innerText = "❌ Опа! Опитай пак.";
        resultElement.style.color = "red";
    }
}