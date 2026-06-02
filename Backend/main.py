from fastapi import FastAPI, Query
from fastapi.middleware.cors import CORSMiddleware
from typing import List, Optional

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

QUESTIONS = [
    {
        "id": 1,
        "difficulty": "easy",
        "question": "Какво е най-добре да направиш, ако получиш пари за рождения си ден?",
        "options": ["Да ги изхарчиш веднага за бонбони", "Да ги скриеш под възглавницата", "Да спестиш част от тях в касичка", "Да ги хвърлиш във въздуха"],
        "correct": 2
    },
    {
        "id": 2,
        "difficulty": "medium",
        "question": "Каква е разликата между 'нужда' и 'желание'?",
        "options": ["Няма никаква разлика", "Нуждата е нещо важно за живота (храна), а желанието е за удоволствие (играчка)", "Желанието е по-важно от нуждата", "Нуждите са безплатни"],
        "correct": 1
    },
    {
        "id": 3,
        "difficulty": "hard",
        "question": "Какво означава да инвестираш пари?",
        "options": ["Да ги дадеш назаем на приятел", "Да ги похарчиш в мола", "Да ги вложиш в нещо с цел те да нараснат след време", "Да ги заровиш в градината"],
        "correct": 2
    }
]

@app.get("/api/questions")
def get_questions(difficulty: Optional[str] = None):
    """ Връща въпроси, филтрирани по трудност """
    if difficulty:
        filtered = [q for q in QUESTIONS if q["difficulty"] == difficulty.lower()]
        return filtered
    return QUESTIONS

# Стартиране на сървъра (в терминала): cd Backend ; uvicorn main:app --reload