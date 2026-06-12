from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import sqlite3
import json

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

DB_NAME = "finance.db"

def get_db_connection():
    conn = sqlite3.connect(DB_NAME)
    conn.row_factory = sqlite3.Row 
    return conn

class LectureQuestionModel(BaseModel):
    question: str
    options: list
    correct: int

class LectureCreateModel(BaseModel):
    title: str
    content: str
    quiz: list[LectureQuestionModel]

def init_db():
    conn = get_db_connection()
    cursor = conn.cursor()
    
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT UNIQUE NOT NULL,
            password TEXT NOT NULL,
            points INTEGER DEFAULT 0
        )
    ''')
    
    difficulties = ["easy", "medium", "hard"]
    for diff in difficulties:
        cursor.execute(f'''
            CREATE TABLE IF NOT EXISTS questions_{diff} (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                question TEXT NOT NULL,
                options TEXT NOT NULL,
                correct INTEGER NOT NULL
            )
        ''')

    cursor.execute('''
        CREATE TABLE IF NOT EXISTS lectures (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            title TEXT NOT NULL,
            content TEXT NOT NULL
        )
    ''')

    cursor.execute('''
        CREATE TABLE IF NOT EXISTS lecture_questions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            lecture_id INTEGER NOT NULL,
            question TEXT NOT NULL,
            options TEXT NOT NULL,
            correct INTEGER NOT NULL,
            FOREIGN KEY (lecture_id) REFERENCES lectures(id) ON DELETE CASCADE
        )
    ''')
    
    conn.commit()
    conn.close()

init_db()

class RegisterModel(BaseModel):
    username: str
    password: str

@app.get("/api/questions")
def get_questions(difficulty: str = Query(..., description="Трудност: easy, medium или hard")):
    diff = difficulty.lower()
    if diff not in ["easy", "medium", "hard"]:
        raise HTTPException(status_code=400, detail="Невалидна трудност!")
    
    conn = get_db_connection()
    cursor = conn.cursor()

    cursor.execute(f"SELECT * FROM questions_{diff}")
    rows = cursor.fetchall()
    conn.close()
    
    questions = []
    for row in rows:
        questions.append({
            "id": row["id"],
            "question": row["question"],
            "options": json.loads(row["options"]),
            "correct": row["correct"]
        })
    return questions

@app.post("/api/register")
def register_user(user_data: RegisterModel):
    conn = get_db_connection()
    cursor = conn.cursor()
    
    try:
        cursor.execute("INSERT INTO users (username, password, points) VALUES (?, ?, ?)", 
                       (user_data.username, user_data.password, 0))
        conn.commit()
    except sqlite3.IntegrityError:
        conn.close()
        raise HTTPException(status_code=400, detail="Потребителското име вече е заето!")
    
    conn.close()

    return {
        "message": "Регистрацията и входът са успешни!", 
        "username": user_data.username,
        "points": 0
    }

class LoginModel(BaseModel):
    username: str
    password: str

@app.post("/api/login")
def login_user(user_data: LoginModel):
    conn = get_db_connection()
    cursor = conn.cursor()

    cursor.execute("SELECT * FROM users WHERE username = ? AND password = ?", 
                   (user_data.username, user_data.password))
    user = cursor.fetchone()
    conn.close()
    
    if not user:
        raise HTTPException(status_code=401, detail="Грешно потребителско име или парола!")
    
    return {
        "message": "Входът е успешен!", 
        "username": user["username"],
        "points": user["points"]
    }

class QuestionModel(BaseModel):
    difficulty: str
    question: str
    options: list
    correct: int

@app.post("/api/admin/questions")
def add_question(q: QuestionModel):
    diff = q.difficulty.lower()
    if diff not in ["easy", "medium", "hard"]:
        raise HTTPException(status_code=400, detail="Невалидна трудност!")
    
    conn = get_db_connection()
    cursor = conn.cursor()

    options_json = json.dumps(q.options)
    
    cursor.execute(f"INSERT INTO questions_{diff} (question, options, correct) VALUES (?, ?, ?)",
                   (q.question, options_json, q.correct))
    conn.commit()
    conn.close()
    
    return {"message": f"Въпросът е добавен успешно в таблица questions_{diff}!"}

@app.delete("/api/admin/questions/{difficulty}/{question_id}")
def delete_question(difficulty: str, question_id: int):
    diff = difficulty.lower()
    if diff not in ["easy", "medium", "hard"]:
        raise HTTPException(status_code=400, detail="Невалидна трудност!")
    
    conn = get_db_connection()
    cursor = conn.cursor()

    cursor.execute(f"SELECT * FROM questions_{diff} WHERE id = ?", (question_id,))
    if not cursor.fetchone():
        conn.close()
        raise HTTPException(status_code=404, detail="Въпросът не е намерен!")
    
    cursor.execute(f"DELETE FROM questions_{diff} WHERE id = ?", (question_id,))
    conn.commit()
    conn.close()
    
    return {"message": f"Въпросът с ID {question_id} е изтрит от таблица questions_{diff}!"}

@app.get("/api/admin/users")
def get_all_users():
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT id, username, points FROM users")
    rows = cursor.fetchall()
    conn.close()
    
    users = []
    for row in rows:
        users.append({
            "id": row["id"],
            "username": row["username"],
            "points": row["points"]
        })
    return users

@app.post("/api/admin/users")
def admin_add_user(user_data: RegisterModel):
    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        cursor.execute("INSERT INTO users (username, password, points) VALUES (?, ?, ?)", 
                       (user_data.username, user_data.password, 0))
        conn.commit()
    except sqlite3.IntegrityError:
        conn.close()
        raise HTTPException(status_code=400, detail="Потребителското име вече съществува!")
    conn.close()
    return {"message": f"Потребителят {user_data.username} е добавен успешно!"}

@app.delete("/api/admin/users/{user_id}")
def delete_user(user_id: int):
    conn = get_db_connection()
    cursor = conn.cursor()

    cursor.execute("SELECT * FROM users WHERE id = ?", (user_id,))
    if not cursor.fetchone():
        conn.close()
        raise HTTPException(status_code=404, detail="Потребителят не е намерен!")
        
    cursor.execute("DELETE FROM users WHERE id = ?", (user_id,))
    conn.commit()
    conn.close()
    return {"message": f"Потребителят с ID {user_id} е изтрит успешно!"}

class UpdatePointsModel(BaseModel):
    username: str
    points_to_add: int

@app.post("/api/users/update_points")
def update_user_points(data: UpdatePointsModel):
    conn = get_db_connection()
    cursor = conn.cursor()
    
    cursor.execute("SELECT points FROM users WHERE username = ?", (data.username,))
    user = cursor.fetchone()
    
    if not user:
        conn.close()
        raise HTTPException(status_code=404, detail="Потребителят не е намерен!")
    
    new_points = user["points"] + data.points_to_add
    cursor.execute("UPDATE users SET points = ? WHERE username = ?", (new_points, data.username))
    conn.commit()
    conn.close()
    
    return {"message": "Точките са обновени успешно!", "new_points": new_points}

@app.get("/api/leaderboard")
def get_leaderboard():
    conn = get_db_connection()
    cursor = conn.cursor()
    
    cursor.execute("SELECT username, points FROM users ORDER BY points DESC LIMIT 10")
    top_users = cursor.fetchall()
    
    conn.close()
    
    leaderboard_data = [{"username": user["username"], "points": user["points"]} for user in top_users]
    return leaderboard_data

@app.get("/api/lectures")
def get_lectures():
    conn = get_db_connection()
    cursor = conn.cursor()
    
    cursor.execute("SELECT * FROM lectures")
    lecture_rows = cursor.fetchall()
    
    result = []
    for l_row in lecture_rows:
        cursor.execute("SELECT * FROM lecture_questions WHERE lecture_id = ?", (l_row["id"],))
        q_rows = cursor.fetchall()
        
        quiz = [{
            "question": q["question"],
            "options": json.loads(q["options"]),
            "correct": q["correct"]
        } for q in q_rows]
        
        result.append({
            "id": f"lecture_{l_row['id']}",
            "db_id": l_row["id"],
            "title": l_row["title"],
            "content": l_row["content"],
            "quiz": quiz
        })
    conn.close()
    return result

@app.post("/api/admin/lectures")
def add_lecture(data: LectureCreateModel):
    conn = get_db_connection()
    cursor = conn.cursor()
    
    try:
        cursor.execute("INSERT INTO lectures (title, content) VALUES (?, ?)", (data.title, data.content))
        lecture_id = cursor.lastrowid
        
        for q in data.quiz:
            options_json = json.dumps(q.options)
            cursor.execute(
                "INSERT INTO lecture_questions (lecture_id, question, options, correct) VALUES (?, ?, ?, ?)",
                (lecture_id, q.question, options_json, q.correct)
            )
        conn.commit()
    except Exception as e:
        conn.close()
        raise HTTPException(status_code=500, detail=f"Грешка при запис: {str(e)}")
        
    conn.close()
    return {"message": "Лекцията и въпросите са добавени успешно в базата данни!"}

@app.delete("/api/admin/lectures/{lecture_id}")
def delete_lecture(lecture_id: int):
    conn = get_db_connection()
    cursor = conn.cursor()

    cursor.execute("SELECT * FROM lectures WHERE id = ?", (lecture_id,))
    if not cursor.fetchone():
        conn.close()
        raise HTTPException(status_code=404, detail="Лекцията не е намерена!")
    
    cursor.execute("DELETE FROM lectures WHERE id = ?", (lecture_id,))
    conn.commit()
    conn.close()
    
    return {"message": f"Лекцията с ID {lecture_id} и нейните въпроси бяха изтрити успешно!"}