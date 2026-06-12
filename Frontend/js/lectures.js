const API_URL = "http://127.0.0.1:8000/api";
const currentUser = sessionStorage.getItem('loggedInUser') || 'guest';

let lecturesData = [];
let activeLecture = null;
let currentLectureQuestionIndex = 0;
let lectureAnswers = [];

window.addEventListener('load', () => {
    if (!sessionStorage.getItem('loggedInUser')) {
        window.location.href = "index.html";
        return;
    }
    fetchLecturesFromDB();
});

async function fetchLecturesFromDB() {
    try {
        const response = await fetch(`${API_URL}/lectures`);
        if (response.ok) {
            lecturesData = await response.json();
            renderLecturesList();
        } else {
            console.error("Грешка при извличане на лекции.");
        }
    } catch (error) {
        console.error("Няма връзка със сървъра:", error);
    }
}

function renderLecturesList() {
    const container = document.getElementById('lectures-container');
    container.innerHTML = "";

    lecturesData.forEach(lecture => {
        const isCompleted = localStorage.getItem(`${currentUser}_completed_${lecture.id}`) === 'true';

        const div = document.createElement('div');
        div.className = `lecture-item ${isCompleted ? 'completed' : ''} ${activeLecture?.id === lecture.id ? 'active' : ''}`;
        div.onclick = () => openLecture(lecture);

        div.innerHTML = `
            <span>${lecture.title}</span>
            <span class="status-badge ${isCompleted ? 'done' : 'pending'}">
                ${isCompleted ? '✅ Готова' : '📖 Непрочетена'}
            </span>
        `;
        container.appendChild(div);
    });
}

function openLecture(lecture) {
    activeLecture = lecture;
    renderLecturesList();

    const view = document.getElementById('lecture-view');
    view.innerHTML = `
        <h2>${lecture.title}</h2>
        <hr>
        <div class="lecture-text-content">
            ${lecture.content}
        </div>
        <button onclick="startLectureQuiz()" class="btn-action">Премини към теста към урока</button>
    `;
}

function startLectureQuiz() {
    currentLectureQuestionIndex = 0;
    lectureAnswers = [];
    displayLectureQuestion();
}

function displayLectureQuestion() {
    const view = document.getElementById('lecture-view');
    const questionData = activeLecture.quiz[currentLectureQuestionIndex];

    view.innerHTML = `
        <h3>📝 Тест: ${activeLecture.title}</h3>
        <p>Въпрос ${currentLectureQuestionIndex + 1} от ${activeLecture.quiz.length}</p>
        <hr>
        <h4 class="lecture-question-title">${questionData.question}</h4>
        <div id="lecture-options-container"></div>
    `;

    const optionsContainer = document.getElementById('lecture-options-container');
    questionData.options.forEach((option, idx) => {
        const button = document.createElement('button');
        button.className = 'btn-option-lecture';
        button.innerText = option;
        button.onclick = () => handleLectureAnswer(idx);
        optionsContainer.appendChild(button);
    });
}

function handleLectureAnswer(selectedIdx) {
    const questionData = activeLecture.quiz[currentLectureQuestionIndex];
    const isCorrect = selectedIdx === questionData.correct;

    lectureAnswers.push(isCorrect);

    currentLectureQuestionIndex++;
    if (currentLectureQuestionIndex < activeLecture.quiz.length) {
        displayLectureQuestion();
    } else {
        finishLectureQuiz();
    }
}

function finishLectureQuiz() {
    const view = document.getElementById('lecture-view');
    const totalQuestions = activeLecture.quiz.length;
    const correctAnswers = lectureAnswers.filter(ans => ans === true).length;

    if (correctAnswers === totalQuestions) {
        localStorage.setItem(`${currentUser}_completed_${activeLecture.id}`, 'true');

        view.innerHTML = `
            <div class="quiz-result-wrapper text-center">
                <h2 class="text-success">Браво! Изпитът е взет успешно!</h2>
                <p class="result-score-text">Ти отговори вярно на <strong>${correctAnswers} от ${totalQuestions}</strong> въпроса.</p>
                <p>Урокът е официално завършен и маркиран в твоя профил!</p>
                <button onclick="resetAcademyView()" class="btn-action btn-blue">Супер</button>
            </div>
        `;
    } else {
        view.innerHTML = `
            <div class="quiz-result-wrapper text-center">
                <h2 class="text-danger">Опа, имаш грешки.</h2>
                <p class="result-score-text">Твоят резултат е: <strong>${correctAnswers} от ${totalQuestions}</strong> верни отговора.</p>
                <p>Прочети лекцията внимателно още веднъж и опитай пак теста, за да я завършиш!</p>
                <button onclick="openLecture(activeLecture)" class="btn-action btn-orange">Прочети пак</button>
            </div>
        `;
    }

    renderLecturesList();
}

function resetAcademyView() {
    const view = document.getElementById('lecture-view');
    view.innerHTML = `
        <div class="welcome-academy-message">
            <h3>📚 Избери следващата лекция от списъка вляво, за да продължиш!</h3>
        </div>
    `;
    activeLecture = null;
    renderLecturesList();
}