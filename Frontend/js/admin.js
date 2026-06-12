const API_URL = "http://127.0.0.1:8000/api";
let lectureQuestionCounter = 0;

function switchAdminSection(section) {
    const qSection = document.getElementById('section-questions');
    const lSection = document.getElementById('section-lectures');
    const uSection = document.getElementById('section-users');

    const qBtn = document.getElementById('nav-questions-btn');
    const lBtn = document.getElementById('nav-lectures-btn');
    const uBtn = document.getElementById('nav-users-btn');

    if (section === 'questions') {
        qSection.style.display = 'block';
        uSection.style.display = 'none';
        lSection.style.display = 'none';
        qBtn.classList.add('active');
        uBtn.classList.remove('active');
        lBtn.classList.remove('active');
    } else if (section === 'lectures') {
        lSection.style.display = 'block';
        qSection.style.display = 'none';
        uSection.style.display = 'none';
        lBtn.classList.add('active');
        qBtn.classList.remove('active');
        uBtn.classList.remove('active');
    } else {
        qSection.style.display = 'none';
        uSection.style.display = 'block';
        lSection.style.display = 'none';
        uBtn.classList.add('active');
        qBtn.classList.remove('active');
        lBtn.classList.remove('active');
        loadAdminUsers();
    }
}

async function addQuestion() {
    const difficulty = document.getElementById('q-diff').value;
    const question = document.getElementById('q-text').value;
    const options = [
        document.getElementById('opt-0').value,
        document.getElementById('opt-1').value,
        document.getElementById('opt-2').value,
        document.getElementById('opt-3').value
    ];
    const correct = parseInt(document.getElementById('q-correct').value);

    if (!question || options.some(opt => opt === "")) {
        alert("Моля, попълнете въпроса и четирите опции!");
        return;
    }

    try {
        const response = await fetch(`${API_URL}/admin/questions`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ difficulty, question, options, correct })
        });
        const data = await response.json();
        alert(data.message);

        document.getElementById('q-text').value = "";
        options.forEach((_, i) => document.getElementById(`opt-${i}`).value = "");
        loadAdminQuestions(difficulty);
    } catch (error) {
        console.error("Грешка:", error);
    }
}

async function loadAdminQuestions(difficulty) {
    const listContainer = document.getElementById('admin-questions-list');
    listContainer.innerHTML = "Зареждане...";

    try {
        const response = await fetch(`${API_URL}/questions?difficulty=${difficulty}`);
        const questions = await response.json();

        listContainer.innerHTML = "";
        if (questions.length === 0) {
            listContainer.innerHTML = "<p>Няма въпроси в тази таблица.</p>";
            return;
        }

        questions.forEach(q => {
            const div = document.createElement('div');
            div.className = 'question-item';
            const answerLetter = String.fromCharCode(65 + q.correct);
            div.innerHTML = `
                <div>
                    <strong>${q.question}</strong><br>
                    <small style="color: green;">Правилен отговор: ${answerLetter} (${q.options[q.correct]})</small>
                </div>
                <button class="btn-delete" onclick="deleteQuestion('${difficulty}', ${q.id})">Изтрий ❌</button>
            `;
            listContainer.appendChild(div);
        });
    } catch (error) {
        console.error("Грешка:", error);
    }
}

async function deleteQuestion(difficulty, id) {
    if (!confirm("Сигурни ли сте, че искате да изтриете този въпрос?")) return;

    try {
        const response = await fetch(`${API_URL}/admin/questions/${difficulty}/${id}`, { method: 'DELETE' });
        const data = await response.json();
        alert(data.message);
        loadAdminQuestions(difficulty);
    } catch (error) {
        console.error("Грешка:", error);
    }
}

function addQuestionFieldToLecture() {
    lectureQuestionCounter++;
    const container = document.getElementById('lecture-questions-builder');

    const div = document.createElement('div');
    div.className = 'lecture-question-box';
    div.id = `l-q-box-${lectureQuestionCounter}`;
    div.innerHTML = `
        <button type="button" class="btn-remove-box" onclick="document.getElementById('l-q-box-${lectureQuestionCounter}').remove()">Махни</button>
        <h5>Въпрос към теста</h5>
        <input type="text" class="l-q-text" placeholder="Въпрос (напр: Колко лева са 300 стотинки?)" style="margin-bottom: 5px;" required>
        <div class="lecture-options-grid">
            <input type="text" class="l-opt-0" placeholder="Опция A" required>
            <input type="text" class="l-opt-1" placeholder="Опция B" required>
            <input type="text" class="l-opt-2" placeholder="Опция C" required>
        </div>
        <label style="font-size: 13px;">Правилен отговор:</label>
        <select class="l-q-correct" style="width: auto; padding: 4px;">
            <option value="0">Опция A</option>
            <option value="1">Опция B</option>
            <option value="2">Опция C</option>
        </select>
    `;
    container.appendChild(div);
}

async function addLecture() {
    const title = document.getElementById('l-title').value;
    const content = document.getElementById('l-content').value;
    const questionBoxes = document.querySelectorAll('.lecture-question-box');

    if (!title || !content) {
        alert("Моля, попълнете заглавие и съдържание на лекцията!");
        return;
    }
    if (questionBoxes.length === 0) {
        alert("Добавете поне един въпрос към теста на лекцията!");
        return;
    }

    const quiz = [];
    let isValid = true;

    questionBoxes.forEach(box => {
        const questionText = box.querySelector('.l-q-text').value;
        const opt0 = box.querySelector('.l-opt-0').value;
        const opt1 = box.querySelector('.l-opt-1').value;
        const opt2 = box.querySelector('.l-opt-2').value;
        const correct = parseInt(box.querySelector('.l-q-correct').value);

        if (!questionText || !opt0 || !opt1 || !opt2) {
            isValid = false;
        }

        quiz.push({
            question: questionText,
            options: [opt0, opt1, opt2],
            correct: correct
        });
    });

    if (!isValid) {
        alert("Моля, попълнете текстовете на всички добавени въпроси и техните 3 опции!");
        return;
    }

    try {
        const response = await fetch(`${API_URL}/admin/lectures`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ title, content, quiz })
        });
        const data = await response.json();
        alert(data.message);

        document.getElementById('l-title').value = "";
        document.getElementById('l-content').value = "";
        document.getElementById('lecture-questions-builder').innerHTML = "";
        lectureQuestionCounter = 0;
        addQuestionFieldToLecture();
        loadAdminLectures();
    } catch (error) {
        console.error("Грешка при добавяне на лекция:", error);
    }
}

async function loadAdminLectures() {
    const container = document.getElementById('admin-lectures-list');
    container.innerHTML = "Зареждане...";

    try {
        const response = await fetch(`${API_URL}/lectures`);
        const lectures = await response.json();

        container.innerHTML = "";
        if (lectures.length === 0) {
            container.innerHTML = "<p style='color: gray;'>Няма създадени лекции в базата данни.</p>";
            return;
        }

        lectures.forEach(l => {
            const div = document.createElement('div');
            div.className = 'lecture-item-row';
            div.innerHTML = `
                <div>
                    <strong>${l.title}</strong><br>
                    <small style="color: #555;">Съдържа ${l.quiz.length} въпроса в изпита към нея</small>
                </div>
                <button class="btn-delete" onclick="deleteLecture(${l.db_id})">Изтрий Лекция ❌</button>
            `;
            container.appendChild(div);
        });
    } catch (error) {
        console.error("Грешка при зареждане на лекции:", error);
    }
}

async function deleteLecture(dbId) {
    if (!confirm("Сигурни ли сте, че искате да изтриете тази лекция?")) return;

    try {
        const response = await fetch(`${API_URL}/admin/lectures/${dbId}`, { method: 'DELETE' });
        const data = await response.json();
        alert(data.message);
        loadAdminLectures();
    } catch (error) {
        console.error("Грешка при изтриване на лекция:", error);
    }
}

async function loadAdminUsers() {
    const container = document.getElementById('admin-users-list');
    container.innerHTML = "Зареждане...";

    try {
        const response = await fetch(`${API_URL}/admin/users`);
        const users = await response.json();

        container.innerHTML = "";
        if (users.length === 0) {
            container.innerHTML = "<p>Няма регистрирани потребители.</p>";
            return;
        }

        users.forEach(u => {
            const div = document.createElement('div');
            div.className = 'user-item';
            div.innerHTML = `
                <div>
                    <strong>Потребител: ${u.username}</strong> <br>
                </div>
                <button class="btn-delete" onclick="deleteUser(${u.id}, '${u.username}')">Изтрий профил ❌</button>
            `;
            container.appendChild(div);
        });
    } catch (error) {
        console.error("Грешка при зареждане на потребители:", error);
    }
}

async function adminAddUser() {
    const username = document.getElementById('u-username').value;
    const password = document.getElementById('u-password').value;

    if (!username || !password) {
        alert("Моля, попълнете потребителско име и парола!");
        return;
    }

    try {
        const response = await fetch(`${API_URL}/admin/users`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password })
        });
        const data = await response.json();

        if (response.ok) {
            document.getElementById('u-username').value = "";
            document.getElementById('u-password').value = "";
            loadAdminUsers();
        } else {
            alert(data.detail);
        }
    } catch (error) {
        console.error("Грешка при добавяне на потребител:", error);
    }
}

async function deleteUser(id, name) {
    if (!confirm(`Сигурни ли сте, че искате да изтриете профила на ${name}?`)) return;

    try {
        const response = await fetch(`${API_URL}/admin/users/${id}`, { method: 'DELETE' });
        const data = await response.json();
        loadAdminUsers();
    } catch (error) {
        console.error("Грешка при изтриване на потребител:", error);
    }
}

document.addEventListener('DOMContentLoaded', () => {
    const builder = document.getElementById('lecture-questions-builder');
    if (builder) {
        addQuestionFieldToLecture();
    }
    const lecturesList = document.getElementById('admin-lectures-list');
    if (lecturesList) loadAdminLectures();
});