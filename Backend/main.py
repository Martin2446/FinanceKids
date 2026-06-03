from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional
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
                options TEXT NOT NULL,  -- Ще пазим отговорите като JSON текст
                correct INTEGER NOT NULL
            )
        ''')
    
    conn.commit()
    
    for diff in difficulties:
        cursor.execute(f"SELECT COUNT(*) FROM questions_{diff}")
        if cursor.fetchone()[0] == 0:
            if diff == "easy":
                cursor.execute("INSERT INTO questions_easy (question, options, correct) VALUES (?, ?, ?)",
                               ("Какво е най-добре да направиш, ако получиш пари за рождения си ден?", 
                                json.dumps(["Да ги изхарчиш веднага за бонбони", "Да ги скриеш под възглавницата", "Да спестиш част от тях в касичка", "Да ги хвърлиш във въздуха"]), 2))
            elif diff == "medium":
                cursor.execute("INSERT INTO questions_medium (question, options, correct) VALUES (?, ?, ?)",
                               ("Каква е разликата между 'нужда' и 'желание'?", 
                                json.dumps(["Няма никаква разлика", "Нуждата е нещо важно за живота (храна), а желанието е за удоволствие (играчка)", "Желанието е по-важно от нуждата", "Нуждите са безплатни"]), 1))
            elif diff == "hard":
                cursor.execute("INSERT INTO questions_hard (question, options, correct) VALUES (?, ?, ?)",
                               ("Какво означава да инвестираш пари?", 
                                json.dumps(["Да ги дадеш назаем на приятел", "Да ги похарчиш в мола", "Да ги вложиш в нещо с цел те да нараснат след време", "Да ги заровиш в градината"]), 2))
    
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
            "options": json.loads(row["options"]), # Превръщаме JSON текста обратно в списък
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