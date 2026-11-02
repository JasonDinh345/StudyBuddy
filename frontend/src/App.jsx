import { useState, useEffect } from 'react';
import './App.css';
import logoImg from './assets/logo.png';

const INITIAL_DECKS = {
    "Java Collections": {
        mastery_score: 0,
        cards: [
            {
                question: "What does a constructor do in Java?",
                answer: "Initializes object & assigns values to its fields."
            },
            {
                question: "What is the diff. between ArrayList & LinkedList?",
                answer: "ArrayList dynamic (fast random access), LinkedList doubly-linked nodes (fast insertions/deletions)."
            },
            {
                question: "What does HashMap class do?",
                answer: "Store key/value pairs w/ O(1) avg. time complexity for get & put."
            }
        ]
    },
    "Python Syntax": {
        mastery_score: 0,
        cards: [
            {
                question: "What is a lambda fnx. in Python?",
                answer: "Anonymous small fnx. defined using 'lambda' keyword"
            },
            {
                question: "How do list comprehensions work?",
                answer: "Provide concise way to create lists [expression for item in iterable if condition]."
            },
            {
                question: "What is difference between is and == in Python?",
                answer: "'is' checks memory address equality; '==' checks value equality."
            }
        ]
    },
    "Client/Server Programming": {
        mastery_score: 0,
        cards: [
            {
                question: "What is the primary communication pattern used in client/server web apps?",
                answer: "Stateless request/response pattern over HTTP; client initiates a request & server processes it to send back a response."
            },
            {
                question: "Which 2 pieces of info in an HTTP request tell the server what action to perform & where?",
                answer: "HTTP method (GET, POST) defines requested operation; while resource URI identifies target resource on server."
            },
            {
                question: "How are responsibilities separated in a standard 3 tier web app. architecture?",
                answer: "Responsibilities split into top tier (UI/browser for input & display), middle tier (web server handling business logic), and a bottom tier (DB maintaining persistent data)."
            }
        ]
    },
    "OS Basics": {
        mastery_score: 0,
        cards: [
            {
                question: "What is a proc. in an OS?",
                answer: "Program in execution, having its own mem space & sys resources"
            },
            {
                question: "What is a deadlock?",
                answer: "Situation where 2+ competing actions are waiting for the other to finish, causing infinite wait."
            },
            {
                question: "What is VM?",
                answer: "Mem. management capability that uses hardware & software to map memory addresses."
            }
        ]
    }
};

export default function App() {
    const [activeTab, setActiveTab] = useState(() =>
        localStorage.getItem("studybuddy_tab") || "dashboard"
    );

    const [isSidebarOpen, setIsSidebarOpen] = useState(() => {
        const saved = localStorage.getItem("studybuddy_sidebar_open");
        return saved !== null ? JSON.parse(saved) : true;
    });

    const [decks, setDecks] = useState(() => {
        try {
            const savedDecks = localStorage.getItem("studybuddy_deck_mastery_v8");
            if (savedDecks) return JSON.parse(savedDecks);
        } catch (e) {
            console.error(e);
        }
        return INITIAL_DECKS;
    });

    const [activeDeckTitle, setActiveDeckTitle] = useState(() =>
        localStorage.getItem("studybuddy_active_title") || "Java Collections"
    );
    const [currentIndex, setCurrentIndex] = useState(() =>
        Number(localStorage.getItem("studybuddy_card_index") || 0)
    );
    const [isFlipped, setIsFlipped] = useState(false);
    const [notesInput, setNotesInput] = useState("");
    const [statusMsg, setStatusMsg] = useState("");
    const [animatingBtn, setAnimatingBtn] = useState(null);

    const [timerState, setTimerState] = useState(() => {
        try {
            const savedTimer = localStorage.getItem("studybuddy_timer_v8");
            if (savedTimer) return JSON.parse(savedTimer);
        } catch (e) {
            console.error(e);
        }
        return {
            timeLeft: 25 * 60,
            isRunning: false,
            mode: "study"
        };
    });

    useEffect(() => {
        localStorage.setItem("studybuddy_tab", activeTab);
    }, [activeTab]);

    useEffect(() => {
        localStorage.setItem("studybuddy_sidebar_open", JSON.stringify(isSidebarOpen));
    }, [isSidebarOpen]);

    useEffect(() => {
        localStorage.setItem("studybuddy_active_title", activeDeckTitle);
    }, [activeDeckTitle]);

    useEffect(() => {
        localStorage.setItem("studybuddy_card_index", currentIndex);
    }, [currentIndex]);

    useEffect(() => {
        localStorage.setItem("studybuddy_deck_mastery_v8", JSON.stringify(decks));
    }, [decks]);

    useEffect(() => {
        localStorage.setItem("studybuddy_timer_v8", JSON.stringify(timerState));
    }, [timerState]);

    useEffect(() => {
        let interval = null;
        if (timerState.isRunning) {
            interval = setInterval(() => {
                setTimerState((prev) => {
                    if (prev.timeLeft > 0) {
                        return { ...prev, timeLeft: prev.timeLeft - 1 };
                    } else {
                        clearInterval(interval);
                        return { ...prev, isRunning: false };
                    }
                });
            }, 1000);
        }
        return () => clearInterval(interval);
    }, [timerState.isRunning]);

    const activeDeck = decks[activeDeckTitle] || decks["Java Collections"];
    const currentCards = activeDeck.cards;
    const currentCard = currentCards[currentIndex] || currentCards[0];
    const deckMastery = activeDeck.mastery_score;

    function flipCard() {
        setIsFlipped(!isFlipped);
    }

    function prevCard() {
        setIsFlipped(false);
        setCurrentIndex((prev) => (prev > 0 ? prev - 1 : currentCards.length - 1));
    }

    function nextCard() {
        setIsFlipped(false);
        setCurrentIndex((prev) => (prev < currentCards.length - 1 ? prev + 1 : 0));
    }

    function handleMastery(delta, btnColor) {
        setAnimatingBtn(btnColor);
        setTimeout(() => setAnimatingBtn(null), 300);

        setDecks((prevDecks) => {
            const currentDeck = prevDecks[activeDeckTitle];
            const newScore = Math.max(-5, Math.min(5, (currentDeck.mastery_score || 0) + delta));
            return {
                ...prevDecks,
                [activeDeckTitle]: {
                    ...currentDeck,
                    mastery_score: newScore
                }
            };
        });
        setTimeout(() => nextCard(), 200);
    }

    function selectDeck(title) {
        setActiveDeckTitle(title);
        setCurrentIndex(0);
        setIsFlipped(false);
    }

    useEffect(() => {
        function handleKeyDown(e) {
            if (["INPUT", "TEXTAREA"].includes(document.activeElement?.tagName)) return;
            if (e.code === "Space") {
                e.preventDefault();
                flipCard();
            } else if (e.key === "1") {
                e.preventDefault();
                handleMastery(1, 'green');
            } else if (e.key === "2") {
                e.preventDefault();
                handleMastery(-1, 'red');
            } else if (e.code === "ArrowLeft") {
                e.preventDefault();
                prevCard();
            } else if (e.code === "ArrowRight") {
                e.preventDefault();
                nextCard();
            }
        }

        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, [currentIndex, activeDeckTitle, decks, isFlipped]);

    const minutes = Math.floor(timerState.timeLeft / 60);
    const seconds = timerState.timeLeft % 60;
    const formattedTime = `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;

    function toggleTimer() {
        setTimerState((prev) => ({ ...prev, isRunning: !prev.isRunning }));
    }

    function resetTimer(minutesVal = 25) {
        setTimerState({ timeLeft: minutesVal * 60, isRunning: false, mode: minutesVal === 25 ? "study" : "rest" });
    }

    return (
        <div className="app-layout">
            <button
                className="sidebar-toggle-floating"
                onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                title="Toggle Sidebar">
                ☰
            </button>

            <aside className={`sidebar ${isSidebarOpen ? "open" : "closed"}`}>
                <div className="sidebar-brand">
                    <img src={logoImg} alt="StudyBuddy Logo" className="brand-logo-img" />
                </div>

                <nav className="sidebar-nav">
                    <button
                        className={`nav-item ${activeTab === "dashboard" ? "active" : ""}`}
                        onClick={() => setActiveTab("dashboard")}>
                        Dashboard
                    </button>
                    <button
                        className={`nav-item ${activeTab === "flashcards" ? "active" : ""}`}
                        onClick={() => setActiveTab("flashcards")}>
                        Flashcards
                    </button>
                    <button
                        className={`nav-item ${activeTab === "timer" ? "active" : ""}`}
                        onClick={() => setActiveTab("timer")}>
                        Timer
                    </button>
                </nav>

                <div className="sidebar-footer">
                    <p>Small steps everyday lead to big results</p>
                    <div className="footer-star">★</div>
                </div>
            </aside>

            <main className="main-content">
                {activeTab === "dashboard" && (
                    <div className="dashboard-grid">
                        <div className="top-row">
                            <section className="card-box generate-card">
                                <h3>Generate Flashcards</h3>
                                <form onSubmit={(e) => {
                                    e.preventDefault();
                                    setStatusMsg("Gemini API in progress; functionality isn't hooked up YET, " +
                                        "so no flashcards are being generated as of right now.");
                                }}>
                                    <textarea
                                        value={notesInput}
                                        onChange={(e) => setNotesInput(e.target.value)}
                                        placeholder="Enter a topic or paste notes below. We'll create flashcards for you!"
                                        rows={3}
                                    />
                                    <button type="submit" className="primary-btn">Generate</button>
                                </form>
                                {statusMsg && <p className="status-note">{statusMsg}</p>}
                            </section>

                            <section className="card-box timer-card">
                                <h3>Timer</h3>
                                <div className="timer-display">{formattedTime}</div>
                                <div className="timer-controls">
                                    <button onClick={toggleTimer} className="icon-btn">
                                        {timerState.isRunning ? "❚❚" : "▶"}
                                    </button>
                                    <button onClick={() => resetTimer(timerState.mode === "study" ? 25 : 5)} className="icon-btn">
                                        ↻
                                    </button>
                                </div>
                                <div className="timer-mode-buttons">
                                    <button onClick={() => resetTimer(25)} className={`mode-btn ${timerState.timeLeft === 1500 ? "active-mode" : ""}`}>Study (25m)</button>
                                    <button onClick={() => resetTimer(5)} className={`mode-btn ${timerState.timeLeft === 300 ? "active-mode" : ""}`}>Rest (5m)</button>
                                </div>
                            </section>
                        </div>

                        <div className="bottom-row">
                            <section className="card-box viewer-card">
                                <div className="viewer-header">
                                    <span>Flashcards ({activeDeckTitle})</span>
                                    <span className="subtitle-hint">Review and build knowledge</span>
                                </div>

                                <div
                                    className="flashcard-preview"
                                    onClick={flipCard}>
                                    <div className="fc-top-left-badge">
                                        Mastery: {deckMastery}
                                    </div>
                                    <div className="fc-counter">
                                        {currentIndex + 1} / {currentCards.length}
                                    </div>
                                    <div className="fc-body">
                                        <p>{isFlipped ? currentCard.answer : currentCard.question}</p>
                                    </div>
                                    <div className="fc-action-prompt">
                                        {isFlipped ? "Showing Answer (Space to flip)" : "See answer (Spacebar)"}
                                    </div>
                                </div>

                                <div className="flashcard-nav-controls">
                                    <button onClick={prevCard} className="nav-action-btn">← Previous</button>

                                    <div className="grading-buttons">
                                        <button
                                            onClick={() => handleMastery(-1, 'red')}
                                            className={`glass-grade-btn red-glass ${animatingBtn === 'red' ? 'pulse-red' : ''}`}
                                            title="Incorrect (Press 2)">
                                            ✕
                                        </button>
                                        <button
                                            onClick={() => handleMastery(1, 'green')}
                                            className={`glass-grade-btn green-glass ${animatingBtn === 'green' ? 'pulse-green' : ''}`}
                                            title="Got it (Press 1)">
                                            ✓
                                        </button>
                                    </div>

                                    <button onClick={nextCard} className="nav-action-btn">Next →</button>
                                </div>
                            </section>

                            <section className="card-box decks-card">
                                <h3>Decks</h3>
                                <div className="decks-list">
                                    {Object.keys(INITIAL_DECKS).map((title) => (
                                        <div
                                            key={title}
                                            className={`deck-item ${activeDeckTitle === title ? "active-deck" : ""}`}
                                            onClick={() => selectDeck(title)}>
                                            <span>{title}</span>
                                            <span className="arrow">&gt;</span>
                                        </div>
                                    ))}
                                </div>
                            </section>
                        </div>
                    </div>
                )}

                {activeTab === "flashcards" && (
                    <div className="fullscreen-flashcards">
                        <h2>{activeDeckTitle} - Fullscreen Study!</h2>
                        <div
                            className="flashcard-preview fullscreen-fc"
                            onClick={flipCard}>
                            <div className="fc-top-left-badge">Mastery: {deckMastery}</div>
                            <div className="fc-counter">{currentIndex + 1} / {currentCards.length}</div>
                            <div className="fc-body">
                                <p className="fs-text">{isFlipped ? currentCard.answer : currentCard.question}</p>
                            </div>
                        </div>
                        <div className="flashcard-nav-controls">
                            <button onClick={prevCard} className="nav-action-btn">← Previous</button>
                            <button onClick={() => handleMastery(-1, 'red')} className={`glass-grade-btn red-glass ${animatingBtn === 'red' ? 'pulse-red' : ''}`}>✕</button>
                            <button onClick={() => handleMastery(1, 'green')} className={`glass-grade-btn green-glass ${animatingBtn === 'green' ? 'pulse-green' : ''}`}>✓</button>
                            <button onClick={nextCard} className="nav-action-btn">Next →</button>
                        </div>
                    </div>
                )}

                {activeTab === "timer" && (
                    <div className="fullscreen-timer">
                        <h2>Focus Timer</h2>
                        <div className="big-timer-display">{formattedTime}</div>
                        <div className="timer-controls big-controls">
                            <button onClick={toggleTimer} className="primary-btn">
                                {timerState.isRunning ? "Pause" : "Start"}
                            </button>
                            <button onClick={() => resetTimer(25)} className="nav-action-btn">Reset (25m)</button>
                            <button onClick={() => resetTimer(5)} className="nav-action-btn">Rest (5m)</button>
                        </div>
                    </div>
                )}
            </main>
        </div>
    );
}