# StudyBuddy
TCSS 460: Client/Server Programming For Internet Applications Group Project (Autumn 2026)

## Group Members & Contributions (Team 2)
* **Jason Dinh (Sprint 1 Team Leader & Scrum Master):** Created and configured the GitHub repository, refactored the 
backend into microservices (`backend/api-gateway`, `backend/decks-service`, `backend/groq-service`), set up the MySQL 
connection pool (`lib/db.js`), and integrated the Groq API for flashcard generation.
* **David Mwaura:** Designed the UI wireframe for the dashboard, flashcard viewer, Pomodoro timer, and side panel 
components. Revised (`App.jsx` and `App.css`) UI components and implemented flashing red Pomodoro countdown warnings 
at 15, 10, and 5 minutes remaining.
* **Salima Hafurova:** Implemented the React frontend dashboard (`App.jsx`, `App.css`), persistent client state with 
`localStorage`, keyboard shortcuts, MySQL DB schema (`schema.sql`), connected the frontend flashcard generator to the 
new `/api/groq/generate-flashcards` endpoint, & project documentation.

## Project Overview
StudyBuddy is a full-stack study web application built with React (Vite) frontend
and a Node.js/Express backend. It combines a 25-minute Pomodoro study timer with an active recall
flashcard system that tracks deck mastery scores from -5 to 5. 

## Prerequisites
* Node.js (LTS version) and npm installed on your machine.
* A valid Groq API key (stored locally in `backend/.env`).
* MySQL installed locally (for persistent deck and flashcard storage via `backend/schema.sql`).

## Environment Setup
We removed the placeholder `.env.example` file in Phase III Sprint 1 because the app now uses a real `.env` file 
excluded via `.gitignore` so our API keys are never leaked publicly on GitHub.

To run the backend locally, create your own `.env` file inside the `backend/` folder with your Groq API key and local MySQL settings:
```env
DB_HOST="localhost"
DB_USER="tcss460"
DB_PASSWORD="your_mysql_password"
DB_NAME="studybuddy"
DB_PORT="3306"
GROQ_API_KEY="your_groq_api_key_here"
GROQ_MODEL="openai/gpt-oss-20b"
```

## How to Install and Run the Prototype
Because this project uses a decoupled client-server architecture, the backend & frontend run in two separate
terminal tabs.

### Start the Backend Services (API Gateway on Port 3000)
Open a terminal in the root `StudyBuddy` folder and run: 
```bash
cd backend
npm run install-all
npm start
```
The API Gateway will start at http://localhost:3000 and route requests to groq-service and decks-service.

### Start the React Frontend (Port 5173)
Open a 2nd terminal in the root `StudyBuddy` folder and run:
```bash
cd frontend
npm install
npm run dev
```
Open your browser and go to http://localhost:5173

---
### How to Test Phase III (Sprint 1) Functionality
#### Frontend-Backend Integration (Valid Request - HTTP 200):
* On the Dashboard under Generate Flashcards, type a topic or study notes 
(for example, Biochemistry) and click Generate.
* React sends a POST request to http://localhost:3000/api/groq/generate-flashcards through the API Gateway. 
Groq generates the flashcards and returns JSON to the frontend, which adds the new deck to your Decks list and 
selects it.

#### Backend Validation & Error Handling (Invalid Request - HTTP 400):
* Leave the Generate Flashcards text box completely empty (or type only spaces) and click Generate.
* The backend catches the missing input and returns an HTTP 400 Bad Request JSON error, which is displayed 
on the React dashboard.

#### Interactive Flashcards, Keyboard Shortcuts, & Persistent State:
* Select any preset or AI-generated deck on the right panel (Java Collections, Python Syntax, Client/Server Programming,
or OS Basics).
* Click the card or press Spacebar to flip between question and answer.
* Click the green check button (or press 1) to increment the deck mastery score (up to 5), 
or click the red X button (or press 2) to decrement the score (down to -5), 
automatically cycling through the cards (1/3 -> 2/3 -> 3/3).
* Refresh the browser page (Cmd + R or Ctrl + R). All deck mastery scores, active tab selection, 
sidebar open/closed state, and Pomodoro timer countdown states persist via localStorage.
* Start the 25-minute Study timer to see flashing red countdown warnings at 15, 10, and 5 minutes remaining.

#### Additional Notes 
* Database Status (Sprint 1 vs. Sprint 2): MySQL does not need to be running to test Sprint 1 flashcard generation-decks 
currently persist via localStorage on the frontend, and full MySQL CRUD integration via backend/decks-service and 
backend/schema.sql will be wired up in Sprint 2.