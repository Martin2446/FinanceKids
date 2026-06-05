const API_URL = "http://127.0.0.1:8000/api";

function switchAdminSection(section) {
    const qSection = document.getElementById('section-questions');
    const uSection = document.getElementById('section-users');
    const qBtn = document.getElementById('nav-questions-btn');
    const uBtn = document.getElementById('nav-users-btn');

    if (section === 'questions') {
        qSection.style.display = 'block';
        uSection.style.display = 'none';
        qBtn.classList.add('active');
        uBtn.classList.remove('active');
    } else {
        qSection.style.display = 'none';
        uSection.style.display = 'block';
        uBtn.classList.add('active');
        qBtn.classList.remove('active');
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

    if(!question || options.some(opt => opt === "")) {
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
        if(questions.length === 0) {
            listContainer.innerHTML = "<p>Няма въпроси в тази таблица.</p>";
            return;
        }

        questions.forEach(q => {
            const div = document.createElement('div');
            div.className = 'question-item';
            div.innerHTML = `
                <div>
                    <strong>[ID: ${q.id}] ${q.question}</strong><br>
                    <small style="color: green;">Правилен индекс: ${q.correct} (${q.options[q.correct]})</small>
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
    if(!confirm("Сигурни ли сте, че искате да изтриете този въпрос?")) return;

    try {
        const response = await fetch(`${API_URL}/admin/questions/${difficulty}/${id}`, { method: 'DELETE' });
        const data = await response.json();
        alert(data.message);
        loadAdminQuestions(difficulty);
    } catch (error) {
        console.error("Грешка:", error);
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
                    <strong>ID: ${u.id} | Потребител: ${u.username}</strong> <br>
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