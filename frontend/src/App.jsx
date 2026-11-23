import { useState, useEffect } from "react";
import "./App.css";
import { INITIAL_DECKS } from "./data/initialDecks";
import { generateFlashcardsFromNotes } from "./services/api";
import Sidebar from "./components/Sidebar";
import GenerateForm from "./components/GenerateForm";
import PomodoroTimer from "./components/PomodoroTimer";
import FlashcardViewer from "./components/FlashcardViewer";
import DeckList from "./components/DeckList";

const DECKS_STORAGE_KEY = "studybuddy_card_mastery_v9";

function normalizeDecks(rawDecks) {
    const normalized = {};
    for (const [title, deck] of Object.entries(rawDecks || {})) {
        const cards = Array.isArray(deck?.cards) ? deck.cards : [];
        normalized[title] = {
            cards: cards.map((card, idx) => ({
                id: card.id ?? card.card_id ?? `${title}-${idx}`,
                question: card.question,
                answer: card.answer,
                mastery_score:
                    typeof card.mastery_score === "number" ? card.mastery_score : 0,
            })),
        };
    }
    return normalized;
}

export default function App() {
    const [activeTab, setActiveTab] = useState(
        () => localStorage.getItem("studybuddy_tab") || "dashboard"
    );

    const [isSidebarOpen, setIsSidebarOpen] = useState(() => {
        const saved = localStorage.getItem("studybuddy_sidebar_open");
        return saved !== null ? JSON.parse(saved) : true;
    });

    const [decks, setDecks] = useState(() => {
        try {
            const savedV9 = localStorage.getItem(DECKS_STORAGE_KEY);
            if (savedV9) return normalizeDecks(JSON.parse(savedV9));

            // Migrate any existing v8 decks smoothly so generated decks aren't lost
            const savedV8 = localStorage.getItem("studybuddy_deck_mastery_v8");
            if (savedV8) return normalizeDecks(JSON.parse(savedV8));
        } catch (e) {
            console.error(e);
        }
        return INITIAL_DECKS;
    });

    const [activeDeckTitle, setActiveDeckTitle] = useState(() => {
        const saved = localStorage.getItem("studybuddy_active_title");
        return saved || "Java Collections";
    });

    const [currentIndex, setCurrentIndex] = useState(() =>
        Number(localStorage.getItem("studybuddy_card_index") || 0)
    );
    const [isFlipped, setIsFlipped] = useState(false);
    const [notesInput, setNotesInput] = useState("");
    const [statusMsg, setStatusMsg] = useState("");
    const [isGenerating, setIsGenerating] = useState(false);
    const [animatingBtn, setAnimatingBtn] = useState(null);

    const [timerState, setTimerState] = useState(() => {
        try {
            const savedTimer = localStorage.getItem("studybuddy_timer_v8");
            if (savedTimer) return JSON.parse(savedTimer);
        } catch (e) {
            console.error(e);
        }
        return { timeLeft: 25 * 60, isRunning: false, mode: "study" };
    });

    // Persist states to localStorage
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
        localStorage.setItem("studybuddy_card_index", String(currentIndex));
    }, [currentIndex]);

    useEffect(() => {
        localStorage.setItem(DECKS_STORAGE_KEY, JSON.stringify(decks));
    }, [decks]);

    useEffect(() => {
        localStorage.setItem("studybuddy_timer_v8", JSON.stringify(timerState));
    }, [timerState]);

    // Pomodoro interval
    useEffect(() => {
        let interval = null;
        if (timerState.isRunning) {
            interval = setInterval(() => {
                setTimerState((prev) => {
                    if (prev.timeLeft > 0) {
                        return { ...prev, timeLeft: prev.timeLeft - 1 };
                    }
                    clearInterval(interval);
                    return { ...prev, isRunning: false };
                });
            }, 1000);
        }
        return () => clearInterval(interval);
    }, [timerState.isRunning]);

    const deckTitles = Object.keys(decks);
    const resolvedDeckTitle = decks[activeDeckTitle]
        ? activeDeckTitle
        : deckTitles[0] || "";
    const activeDeck = resolvedDeckTitle ? decks[resolvedDeckTitle] : null;
    const currentCards = activeDeck ? activeDeck.cards : [];
    const safeIndex =
        currentCards.length > 0 ? Math.min(currentIndex, currentCards.length - 1) : 0;

    function flipCard() {
        if (currentCards.length === 0) return;
        setIsFlipped((prev) => !prev);
    }

    function prevCard() {
        if (currentCards.length === 0) return;
        setIsFlipped(false);
        setCurrentIndex((prev) => (prev > 0 ? prev - 1 : currentCards.length - 1));
    }

    function nextCard() {
        if (currentCards.length === 0) return;
        setIsFlipped(false);
        setCurrentIndex((prev) => (prev < currentCards.length - 1 ? prev + 1 : 0));
    }

    // Per card persistent mastery update
    function handleMastery(delta, btnColor) {
        if (!resolvedDeckTitle || !currentCards[safeIndex]) return;

        setAnimatingBtn(btnColor);
        setTimeout(() => setAnimatingBtn(null), 300);

        setDecks((prevDecks) => {
            const targetDeck = prevDecks[resolvedDeckTitle];
            if (!targetDeck) return prevDecks;

            const updatedCards = targetDeck.cards.map((card, idx) => {
                if (idx !== safeIndex) return card;
                const currentScore =
                    typeof card.mastery_score === "number" ? card.mastery_score : 0;
                const newScore = Math.max(-5, Math.min(5, currentScore + delta));
                return { ...card, mastery_score: newScore };
            });

            return {
                ...prevDecks,
                [resolvedDeckTitle]: {
                    ...targetDeck,
                    cards: updatedCards,
                },
            };
        });

        setTimeout(() => nextCard(), 200);
    }

    function selectDeck(title) {
        setActiveDeckTitle(title);
        setCurrentIndex(0);
        setIsFlipped(false);
    }

    function handleDeleteDeck(titleToDelete) {
        setDecks((prevDecks) => {
            if (!prevDecks[titleToDelete]) return prevDecks;
            const updated = { ...prevDecks };
            delete updated[titleToDelete];

            if (resolvedDeckTitle === titleToDelete) {
                const remaining = Object.keys(updated);
                setActiveDeckTitle(remaining[0] || "");
                setCurrentIndex(0);
                setIsFlipped(false);
            }
            return updated;
        });
        setStatusMsg(`Deleted deck "${titleToDelete}".`);
    }
    function handleRestoreStarterDecks() {
        const starterTitles = Object.keys(INITIAL_DECKS);
        const missingTitles = starterTitles.filter((title) => !decks[title]);

        if (missingTitles.length > 0) {
            // Case 1: At least one starter deck was trashed -> restore ONLY missing ones, preserve existing mastery
            // scores
            setDecks((prevDecks) => {
                const updated = { ...prevDecks };
                for (const title of missingTitles) {
                    updated[title] = INITIAL_DECKS[title];
                }
                return updated;
            });
            if (!resolvedDeckTitle) {
                setActiveDeckTitle(missingTitles[0]);
                setCurrentIndex(0);
                setIsFlipped(false);
            }
            setStatusMsg(`Restored missing starter deck(s): ${missingTitles.join(", ")}.`);
        } else {
            // Case 2: All 4 starter decks are already present -> reset their card mastery scores to 0
            setDecks((prevDecks) => {
                const updated = { ...prevDecks };
                for (const title of starterTitles) {
                    updated[title] = {
                        ...updated[title],
                        cards: updated[title].cards.map((card) => ({
                            ...card,
                            mastery_score: 0,
                        })),
                    };
                }
                return updated;
            });
            setStatusMsg("Reset card mastery scores to 0 for all 4 starter decks.");
        }
    }
    // Keyboard shortcuts: Space = flip, 1 = correct (+1), 2 = wrong (-1), Arrows = nav
    useEffect(() => {
        function handleKeyDown(e) {
            if (["INPUT", "TEXTAREA"].includes(document.activeElement?.tagName)) return;
            if (currentCards.length === 0) return;

            if (e.code === "Space") {
                e.preventDefault();
                flipCard();
            } else if (e.key === "1") {
                e.preventDefault();
                handleMastery(1, "green");
            } else if (e.key === "2") {
                e.preventDefault();
                handleMastery(-1, "red");
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
    }, [safeIndex, resolvedDeckTitle, decks, isFlipped]);

    function toggleTimer() {
        setTimerState((prev) => ({ ...prev, isRunning: !prev.isRunning }));
    }

    function resetTimer(minutesVal = 25) {
        setTimerState({
            timeLeft: minutesVal * 60,
            isRunning: false,
            mode: minutesVal === 25 ? "study" : "rest",
        });
    }

    async function handleGenerateFlashcards(e) {
        e.preventDefault();
        setIsGenerating(true);
        setStatusMsg("Sending notes to API Gateway...");

        try {
            const generatedCards = await generateFlashcardsFromNotes(notesInput);
            if (generatedCards.length === 0) {
                setStatusMsg(
                    "Error: Groq returned no valid flashcards. Try adding more detail to your notes."
                );
                return;
            }

            const newDeckName = `Generated: ${notesInput.trim().substring(0, 15)}`;
            setDecks((prev) => ({
                ...prev,
                [newDeckName]: { cards: generatedCards },
            }));
            setActiveDeckTitle(newDeckName);
            setCurrentIndex(0);
            setIsFlipped(false);
            setNotesInput("");
            setStatusMsg(
                `Success! Generated ${generatedCards.length} flashcards in "${newDeckName}".`
            );
        } catch (err) {
            console.error(err);
            if (err instanceof TypeError) {
                setStatusMsg("Network error: Could not reach API Gateway on port 3000.");
            } else {
                setStatusMsg(`Error: ${err.message}`);
            }
        } finally {
            setIsGenerating(false);
        }
    }

    return (
        <div className="app-layout">
            <Sidebar
                isOpen={isSidebarOpen}
                onToggle={() => setIsSidebarOpen((prev) => !prev)}
                activeTab={activeTab}
                onSelectTab={setActiveTab}
            />

            <main className="main-content">
                {activeTab === "dashboard" && (
                    <div className="dashboard-grid">
                        <div className="top-row">
                            <GenerateForm
                                notesInput={notesInput}
                                onNotesChange={setNotesInput}
                                onSubmit={handleGenerateFlashcards}
                                isGenerating={isGenerating}
                                statusMsg={statusMsg}
                            />

                            <PomodoroTimer
                                timerState={timerState}
                                onToggle={toggleTimer}
                                onReset={resetTimer}
                            />
                        </div>

                        <div className="bottom-row">
                            <FlashcardViewer
                                activeDeckTitle={resolvedDeckTitle}
                                currentCards={currentCards}
                                currentIndex={safeIndex}
                                isFlipped={isFlipped}
                                animatingBtn={animatingBtn}
                                onFlip={flipCard}
                                onPrev={prevCard}
                                onNext={nextCard}
                                onMastery={handleMastery}
                            />

                            <DeckList
                                decks={decks}
                                activeDeckTitle={resolvedDeckTitle}
                                onSelectDeck={selectDeck}
                                onDeleteDeck={handleDeleteDeck}
                                onRestoreStarterDecks={handleRestoreStarterDecks}
                            />
                        </div>
                    </div>
                )}

                {activeTab === "flashcards" && (
                    <FlashcardViewer
                        activeDeckTitle={resolvedDeckTitle}
                        currentCards={currentCards}
                        currentIndex={safeIndex}
                        isFlipped={isFlipped}
                        animatingBtn={animatingBtn}
                        onFlip={flipCard}
                        onPrev={prevCard}
                        onNext={nextCard}
                        onMastery={handleMastery}
                        isFullscreen
                    />
                )}

                {activeTab === "timer" && (
                    <PomodoroTimer
                        timerState={timerState}
                        onToggle={toggleTimer}
                        onReset={resetTimer}
                        isFullscreen
                    />
                )}
            </main>
        </div>
    );
}