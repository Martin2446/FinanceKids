const API_URL = "http://127.0.0.1:8000/api";

let currentQuestion = null;
let loggedInUser = sessionStorage.getItem('loggedInUser');
let userPoints = parseInt(sessionStorage.getItem('userPoints')) || 0;

let gameQuestions = [];
let currentQuestionIndex = 0;
let timerInterval = null;
let timeLeft = 0;
let userAnswersSummary = [];

const DIFFICULTY_TIMES = {
    'easy': 120,
    'medium': 90,
    'hard': 60
};

if (!loggedInUser) {
    window.location.href = "index.html";
} else {
    updateWelcomeMessage();
    updateBadges();
    refreshLeaderboard()
}

function updateWelcomeMessage() {
    const isGuest = sessionStorage.getItem('isGuest') === 'true';
    if (isGuest) {
        document.getElementById('welcome-message').innerText = `Профил: ${loggedInUser} (Точки: ${userPoints})`;
    } else {
        document.getElementById('welcome-message').innerText = `Добре дошъл, ${loggedInUser}! (Точки: ${userPoints})`;
    }
}

async function loadQuestions(difficulty) {
    document.getElementById('summary-box').style.display = "none";
    document.getElementById('result').innerText = "";

    try {
        const response = await fetch(`${API_URL}/questions?difficulty=${difficulty}`);
        const allQuestions = await response.json();

        if (allQuestions.length > 0) {
            document.getElementById('lobby-container').style.display = "none";
            gameQuestions = allQuestions.sort(() => 0.5 - Math.random()).slice(0, 5);

            currentQuestionIndex = 0;
            userAnswersSummary = [];

            timeLeft = DIFFICULTY_TIMES[difficulty] || 60;

            startTimer();
            displayCurrentQuestion();
        } else {
            alert("Няма добавени въпроси за тази трудност.");
        }
    } catch (error) {
        console.error("Грешка при зареждане на въпроси:", error);
    }
}

function startTimer() {
    clearInterval(timerInterval);
    document.getElementById('time-left').innerText = timeLeft;

    timerInterval = setInterval(() => {
        timeLeft--;
        document.getElementById('time-left').innerText = timeLeft;

        if (timeLeft <= 0) {
            clearInterval(timerInterval);
            alert("⌛ Времето изтече!");
            endGame();
        }
    }, 1000);
}

function displayCurrentQuestion() {
    document.getElementById('quiz-box').style.display = "block";
    document.getElementById('question-progress').innerText = `Въпрос: ${currentQuestionIndex + 1} / 5`;

    currentQuestion = gameQuestions[currentQuestionIndex];
    document.getElementById('question-text').innerText = currentQuestion.question;

    const container = document.getElementById('options-container');
    container.innerHTML = "";

    currentQuestion.options.forEach((option, index) => {
        const button = document.createElement('button');
        button.setAttribute('type', 'button');
        button.className = 'btn-option';
        button.innerText = option;
        button.addEventListener('click', (event) => {
            event.preventDefault();
            event.stopPropagation();
            handleAnswerSelection(index);
        });
        container.appendChild(button);
    });
}

async function handleAnswerSelection(selectedIndex) {
    const isCorrect = selectedIndex === currentQuestion.correct;

    userAnswersSummary.push({
        question: currentQuestion.question,
        userAnswer: currentQuestion.options[selectedIndex],
        correctAnswer: currentQuestion.options[currentQuestion.correct],
        isCorrect: isCorrect
    });

    if (isCorrect) {
        userPoints += 10;
        sessionStorage.setItem('userPoints', userPoints);
        updateWelcomeMessage();
        updateBadges();

        if (sessionStorage.getItem('isGuest') !== 'true') {
            try {
                await fetch(`${API_URL}/users/update_points`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ username: loggedInUser, points_to_add: 10 })
                });
            } catch (e) { console.error(e); }
        }
    }

    currentQuestionIndex++;
    if (currentQuestionIndex < gameQuestions.length) {
        displayCurrentQuestion();
    } else {
        endGame();
    }
}

function endGame() {
    clearInterval(timerInterval)
    document.getElementById('quiz-box').style.display = "none";
    document.getElementById('lobby-container').style.display = "block";

    refreshLeaderboard();

    const summaryBox = document.getElementById('summary-box');
    const summaryScore = document.getElementById('summary-score');
    const summaryDetails = document.getElementById('summary-details');

    summaryBox.style.display = "block";

    const correctCount = userAnswersSummary.filter(a => a.isCorrect).length;
    summaryScore.innerText = `Ти отговори правилно на ${correctCount} от 5 въпроса! 🎉`;

    if (correctCount === 5) {
        sessionStorage.setItem('badge_perfect', 'true');
        updateBadges();
    }

    summaryDetails.innerHTML = "";
    userAnswersSummary.forEach((item, idx) => {
        const itemDiv = document.createElement('div');
        itemDiv.className = `summary-item ${item.isCorrect ? 'correct-style' : 'incorrect-style'}`;

        itemDiv.innerHTML = `
            <p><strong>Въпрос ${idx + 1}:</strong> ${item.question}</p>
            <p>👉 Твоят отговор: <span class="answer-text">${item.userAnswer}</span></p>
            ${!item.isCorrect ? `<p>✅ Правилен отговор: <span>${item.correctAnswer}</span></p>` : ''}
        `;
        summaryDetails.appendChild(itemDiv);
    });
}

function updateBadges() {
    const pointBadges = [
        { id: 'badge-first_points', target: 10 },
        { id: 'badge-apprentice', target: 50 },
        { id: 'badge-ninja', target: 100 },
        { id: 'badge-guru', target: 200 },
        { id: 'badge-millionaire', target: 500 }
    ];

    pointBadges.forEach(b => {
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

    const perfectBadgeElement = document.getElementById('badge-perfect');
    if (perfectBadgeElement) {
        const hasPerfectScore = sessionStorage.getItem('badge_perfect') === 'true';
        if (hasPerfectScore) {
            perfectBadgeElement.classList.remove('locked');
            perfectBadgeElement.classList.add('unlocked');
        } else {
            perfectBadgeElement.classList.add('locked');
            perfectBadgeElement.classList.remove('unlocked');
        }
    }
}

async function refreshLeaderboard() {
    const rowsContainer = document.getElementById('leaderboard-rows');
    if (!rowsContainer) return;

    rowsContainer.innerHTML = "<tr><td colspan='3'>Зареждане...</td></tr>";

    try {
        const response = await fetch(`${API_URL}/leaderboard`);
        const data = await response.json();
        rowsContainer.innerHTML = "";

        if (data.length === 0) {
            rowsContainer.innerHTML = "<tr><td colspan='3'>Няма резултати</td></tr>";
            return;
        }

        data.forEach((user, index) => {
            const tr = document.createElement('tr');
            let rankDisplay = index + 1;
            if (index === 0) rankDisplay = "🥇";
            if (index === 1) rankDisplay = "🥈";
            if (index === 2) rankDisplay = "🥉";

            if (user.username === loggedInUser) {
                tr.classList.add('current-user-row');
            }

            tr.innerHTML = `
                <td class="rank">${rankDisplay}</td>
                <td class="username"> ${user.username}</td>
                <td class="xp">${user.points}</td>
            `;
            rowsContainer.appendChild(tr);
        });
    } catch (error) {
        console.error("Грешка при лидерборда:", error);
        rowsContainer.innerHTML = "<tr><td colspan='3' style='color:red;'>Грешка</td></tr>";
    }
}