-- StudyBuddy MySQL DB (Database) Schema
-- defines relational tables for users, flashcard decks, & individual flashcards
CREATE DATABASE IF NOT EXISTS studybuddy;
USE studybuddy;

-- Users Table: Stores authenticated user accounts from Google OAuth (Open Authorization) I haven't implemented this yet
-- PK (Primary Key): user_id uniquely identifies each user & auto-increments (1, 2, 3; etc.)
-- UNIQUE constraint on email prevents duplicate accounts.
CREATE TABLE IF NOT EXISTS users (
                                     user_id INT AUTO_INCREMENT PRIMARY KEY,
                                     email VARCHAR(255) NOT NULL UNIQUE,
    name VARCHAR(100) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

-- Decks Table: store flashcard sets owned by a specific user
-- PK (Primary Key): deck_id uniquely identifies each deck
-- FK (Foreign Key): user_id links each deck to users(user_id)
-- ON DELETE CASCADE automatically deletes a user's decks if their user account is deleted
CREATE TABLE IF NOT EXISTS decks (
                                     deck_id INT AUTO_INCREMENT PRIMARY KEY,
                                     user_id INT NOT NULL,
                                     title VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
    );

-- Flashcards Table: Stores q&a cards belonging to a specific deck
-- PK (Primary Key): card_id uniquely identifies each flashcard
-- FK (Foreign Key): deck_id links each card to decks(deck_id)
-- mastery_score: Tracks user recall proficiency from -5 (weakest) to 5 (mastered), defaulting to 0
-- Used by the Gemini AI (Artificial Intelligence) route (/gemini/low-mastery) to query weak cards
CREATE TABLE IF NOT EXISTS flashcards (
                                          card_id INT AUTO_INCREMENT PRIMARY KEY,
                                          deck_id INT NOT NULL,
                                          question TEXT NOT NULL,
                                          answer TEXT NOT NULL,
                                          mastery_score INT DEFAULT 0 CHECK (mastery_score BETWEEN -5 AND 5),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (deck_id) REFERENCES decks(deck_id) ON DELETE CASCADE
    );

-- Seed/starter Data: Inserts starter test records so queries return data immediately during testing
INSERT IGNORE INTO users (user_id, email, name) VALUES
(1, 'test@uw.edu', 'Test');

INSERT IGNORE INTO decks (deck_id, user_id, title) VALUES
(1, 1, 'Microbiology and CS Review');

INSERT IGNORE INTO flashcards (deck_id, question, answer, mastery_score) VALUES
(1, 'What target temperature is achieved during loop incineration?', '1800 deg C to sterilize the loop.', 0),
(1, 'What is purpose of a constructor in Java?', 'Initializes new object & assigns initial values to its fields.', -2),
(1, 'Which HTTP status code is returned when required input is missing?', 'HTTP 400 Bad Request.', 1);