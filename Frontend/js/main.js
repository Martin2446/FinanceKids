let currentQuestion = null;
let loggedInUser = sessionStorage.getItem('loggedInUser');
let userPoints = parseInt(sessionStorage.getItem('userPoints')) || 0;

if (!loggedInUser) {
    window.location.href = "index.html";
} else {
    const isGuest = sessionStorage.getItem('isGuest') === 'true';
    if (isGuest) {
        document.getElementById('welcome-message').innerText = `Профил: ${loggedInUser} (Точки: ${userPoints})`;
    } else {
        document.getElementById('welcome-message').innerText = `Добре дошъл, ${loggedInUser}! (Точки: ${userPoints})`;
    }
    updateBadges();
}

async function loadQuestions(difficulty) {
    document.getElementById('result').innerText = "";
    try {
        const response = await fetch(`http://127.0.0.1:8000/api/questions?difficulty=${difficulty}`);
        const questions = await response.json();

        if (questions.length > 0) {
            currentQuestion = questions[Math.floor(Math.random() * questions.length)];
            displayQuestion(currentQuestion);
        } else {
            alert("Няма добавени въпроси за тази трудност.");
        }
    } catch (error) {
        console.error("Грешка при зареждане на въпроси:", error);
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

async function checkAnswer(selectedIndex) {
    const resultElement = document.getElementById('result');

    if (selectedIndex === currentQuestion.correct) {
        userPoints += 10;
        sessionStorage.setItem('userPoints', userPoints);

        updateBadges();
        const isGuest = sessionStorage.getItem('isGuest') === 'true';

        if (isGuest) {
            document.getElementById('welcome-message').innerText = `Профил: ${loggedInUser} (Точки: ${userPoints})`;
        } else {
            document.getElementById('welcome-message').innerText = `Добре дошъл, ${loggedInUser}! (Точки: ${userPoints})`;
        }

        resultElement.innerText = "Браво! Правилен отговор! +10 точки 🪙";
        resultElement.style.color = "green";

        if (!isGuest) {
            try {
                await fetch(`http://127.0.0.1:8000/api/users/update_points`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ username: loggedInUser, points_to_add: 10 })
                });
            } catch (e) {
                console.error("Грешка при синхронизация на регистриран потребител:", e);
            }
        }
    } else {
        resultElement.innerText = "❌ Опа! Опитай пак.";
        resultElement.style.color = "red";
    }
}

function updateBadges() {
    const badges = [
        { id: 'badge-first_points', target: 10 },
        { id: 'badge-apprentice', target: 50 },
        { id: 'badge-ninja', target: 100 },
        { id: 'badge-guru', target: 200 },
        { id: 'badge-millionaire', target: 500 }
    ];

    badges.forEach(b => {
        const badgeElement = document.getElementById(b.id);
        if (badgeElement) {
            if (userPoints >= b.target) {
                badgeElement.classList.remove('locked');
                badgeElement.classList.add('unlocked');
            } else {
                badgeElement.classList.add('locked');
                badgeElement.classList.remove('unlocked');
            }
        }
    });
}