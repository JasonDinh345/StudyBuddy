# StudyBuddy
TCSS 460: Client/Server Programming For Internet Applications Group Project (Autumn 2026)

## Group Members & Contributions (Team 2)
* **Jason Dinh:** Created and configured the GitHub repository, organized the backend project structure, 
set up the Express server (`server.js`), MySQL database connection pool (`db.js`),
and Gemini API routing foundation (`routers/gemini.js`).
* **David Mwaura:** Designed the UI wireframe for the dashboard, flashcard viewer, Pomodoro timer, 
and all the rest of the UI components for the side panel. Revised (`App.jsx`, and `App.css`) 
UI components to match layout concepts.
* **Salima Hafurova:** Implemented the initial React frontend dashboard (`App.jsx`, `App.css`), added persistent
client state with `localStorage` across page refreshes, per-deck mastery scoring, keyboard shortcuts, MySQL DB schema
(`schema.sql`), & project documentation.

## Project Overview
StudyBuddy is a full-stack study web application built with React (Vite) frontend
and a Node.js/Express backend. It combines a 25-minute Pomodoro study timer with an active recall
flashcard system that tracks deck mastery scores from -5 to 5. 

## Prerequisites
* Node.js (LTS version) and npm installed on your machine.

## How to Install and Run the Prototype
Because this project uses a decoupled client-server architecture, the backend & frontend run in two separate
terminal tabs.

### Start the Express Backend (Port 3000)
Open a terminal in the root `StudyBuddy` folder and run: 
```bash
cd backend
npm install
npm start
```
The Express server will start at http://localhost:3000.

### Start the React Frontend (Port 5173)
Open a 2nd terminal in the root `StudyBuddy` folder and run:
```bash
cd frontend
npm install
npm run dev
```
Open your browser and go to http://localhost:5173

---
### How to Test Phase II Functionality
#### Frontend-Backend Integration (Valid Request - HTTP 200):
* On the Dashboard under Generate Flashcards, type a topic or study notes 
(for example, Biochemistry) and click Generate.
* React sends a POST request to http://localhost:3000/gemini/generate-flashcards. 
Express validates the input and returns a JSON response with generated flashcard data, 
and the UI displays the confirmation message.

#### Backend Validation & Error Handling (Invalid Request - HTTP 400):
* Leave the Generate Flashcards text box completely empty (or type only spaces) and click Generate.
* Express catches the missing input and returns an HTTP 400 Bad Request JSON error, which is displayed 
on the React dashboard.

#### Interactive Flashcards, Keyboard Shortcuts, & Persistent State:
* Select any preset deck on the right panel (Java Collections, Python Syntax, 
Client/Server Programming, or OS Basics).
* Click the card or press Spacebar to flip between question and answer.
* Click the green check button (or press 1) to increment the deck mastery score (up to 5), 
or click the red X button (or press 2) to decrement the score (down to -5), 
automatically cycling through the cards (1/3 -> 2/3 -> 3/3).
* Refresh the browser page (Cmd + R or Ctrl + R). All deck mastery scores, active tab selection, 
sidebar open/closed state, and Pomodoro timer countdown states persist via localStorage.

#### Additional Notes 
No .env or MySQL is needed to run Phase II; .env.example and schema.sql are for Phase III.
(.env.example included as per assignment 'include' instructions).