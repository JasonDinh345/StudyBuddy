import { useState, useEffect } from "react";
import "./App.css";
import {
    fetchDecks,
    createDeck,
    deleteDeck,
    updateCardMastery,
    restoreStarterDecks,
    generateFlashcardsFromNotes,
    addCardToDeck,
    generateRemedialCards,
} from "./services/api";
import Sidebar from "./components/Sidebar";
import GenerateForm from "./components/GenerateForm";
import PomodoroTimer from "./components/PomodoroTimer";
import FlashcardViewer from "./components/FlashcardViewer";
import DeckList from "./components/DeckList";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
export default function App() {

    const [isSidebarOpen, setIsSidebarOpen] = useState(() => {
        const saved = localStorage.getItem("studybuddy_sidebar_open");
        return saved !== null ? JSON.parse(saved) : true;
    });

    const [decks, setDecks] = useState([]);
    const [isLoadingDecks, setIsLoadingDecks] = useState(true);
    const [decksError, setDecksError] = useState("");
    const [isRestoring, setIsRestoring] = useState(false);
    const [restoreMsg, setRestoreMsg] = useState("");

    const [activeDeckId, setActiveDeckId] = useState(
        () => localStorage.getItem("studybuddy_active_deck_id") || ""
    );

    // Track each deck's current card index by deckId so switching decks remembers your slide
    const [deckIndices, setDeckIndices] = useState(() => {
        try {
            const saved = localStorage.getItem("studybuddy_deck_indices");
            return saved ? JSON.parse(saved) : {};
        } catch {
            return {};
        }
    });

    const [isFlipped, setIsFlipped] = useState(false);
    const [notesInput, setNotesInput] = useState("");
    const [statusMsg, setStatusMsg] = useState("");
    const [isGenerating, setIsGenerating] = useState(false);
    const [animatingBtn, setAnimatingBtn] = useState(null);
    const [remedialLoading, setRemedialLoading] = useState(false);
    const [remedialError, setRemedialError] = useState("");
    const [remedialResult, setRemedialResult] = useState(null);
    const [remedialSaveMsg, setRemedialSaveMsg] = useState("");
    const [isSavingRemedial, setIsSavingRemedial] = useState(false);
    const [struggleNudge, setStruggleNudge] = useState(null);
    const [timerState, setTimerState] = useState(() => {
        try {
            const savedTimer = localStorage.getItem("studybuddy_timer_v8");
            if (savedTimer) return JSON.parse(savedTimer);
        } catch (e) {
            console.error(e);
        }
        return { timeLeft: 25 * 60, isRunning: false, mode: "study" };
    });

    // Load persisted decks from decks-service via API Gateway
    useEffect(() => {
        let cancelled = false;

        async function loadDecks() {
            setIsLoadingDecks(true);
            setDecksError("");
            try {
                const loaded = await fetchDecks();
                if (!cancelled) {
                    setDecks(loaded);
                    if (loaded.length > 0) {
                        setActiveDeckId((prev) =>
                            loaded.some((d) => d.id === prev) ? prev : loaded[0].id
                        );
                    }
                }
            } catch (err) {
                if (!cancelled) {
                    setDecksError(
                        `${err.message} (Decks service may be stopped; timer still works.)`
                    );
                }
            } finally {
                if (!cancelled) setIsLoadingDecks(false);
            }
        }

        loadDecks();
        return () => {
            cancelled = true;
        };
    }, []);

    useEffect(() => {
        localStorage.setItem("studybuddy_sidebar_open", JSON.stringify(isSidebarOpen));
    }, [isSidebarOpen]);

    useEffect(() => {
        if (activeDeckId) {
            localStorage.setItem("studybuddy_active_deck_id", activeDeckId);
        }
    }, [activeDeckId]);

    useEffect(() => {
        localStorage.setItem("studybuddy_deck_indices", JSON.stringify(deckIndices));
    }, [deckIndices]);

    useEffect(() => {
        localStorage.setItem("studybuddy_timer_v8", JSON.stringify(timerState));
    }, [timerState]);

    // Pomodoro countdown interval
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
    // Autoclear statusMsg (Generate/Delete feedback) after 10 seconds
    useEffect(() => {
        if (!statusMsg) return;
        const timer = setTimeout(() => setStatusMsg(""), 10000);
        return () => clearTimeout(timer);
    }, [statusMsg]);

    // Autoclear restoreMsg (Restore Starter Decks pill) after 10 seconds
    useEffect(() => {
        if (!restoreMsg) return;
        const timer = setTimeout(() => setRestoreMsg(""), 10000);
        return () => clearTimeout(timer);
    }, [restoreMsg]);
    useEffect(() => {
        if (!remedialSaveMsg) return;
        const timer = setTimeout(() => setRemedialSaveMsg(""), 10000);
        return () => clearTimeout(timer);
    }, [remedialSaveMsg]);
    const activeDeck = decks.find((d) => d.id === activeDeckId) || decks[0] || null;
    const resolvedDeckId = activeDeck ? activeDeck.id : "";
    const resolvedDeckTitle = activeDeck ? activeDeck.title : "";
    const currentCards = activeDeck?.cards || [];
    const rawIndex = resolvedDeckId ? deckIndices[resolvedDeckId] ?? 0 : 0;
    const safeIndex =
        currentCards.length > 0 ? Math.min(rawIndex, currentCards.length - 1) : 0;

    function flipCard() {
        if (currentCards.length === 0) return;
        setIsFlipped((prev) => !prev);
    }

    function prevCard() {
        if (!resolvedDeckId || currentCards.length === 0) return;
        setIsFlipped(false);
        setDeckIndices((prev) => {
            const curr = Math.min(prev[resolvedDeckId] ?? 0, currentCards.length - 1);
            return {
                ...prev,
                [resolvedDeckId]: curr > 0 ? curr - 1 : currentCards.length - 1,
            };
        });
    }

    function nextCard() {
        if (!resolvedDeckId || currentCards.length === 0) return;
        setIsFlipped(false);
        setDeckIndices((prev) => {
            const curr = Math.min(prev[resolvedDeckId] ?? 0, currentCards.length - 1);
            return {
                ...prev,
                [resolvedDeckId]: curr < currentCards.length - 1 ? curr + 1 : 0,
            };
        });
    }

    // Per card mastery update persisted to lowdb
    async function handleMastery(delta, btnColor) {
        const targetCard = currentCards[safeIndex];
        if (!activeDeck || !targetCard) return;

        setAnimatingBtn(btnColor);
        setTimeout(() => setAnimatingBtn(null), 300);
        const currentScore =
            typeof targetCard.mastery_score === "number"
                ? targetCard.mastery_score
                : 0;
        const nextScore = Math.max(-5, Math.min(5, currentScore + delta));

        if (delta < 0 && nextScore <= -2) {
            setStruggleNudge({
                deckId: activeDeck.id,
                cardId: targetCard.id,
                masteryScore: nextScore,
            });
        }
        setDecks((prevDecks) =>
            prevDecks.map((deck) => {
                if (deck.id !== activeDeck.id) return deck;
                return {
                    ...deck,
                    cards: deck.cards.map((card) =>
                        card.id === targetCard.id
                            ? {
                                ...card,
                                mastery_score: Math.max(
                                    -5,
                                    Math.min(5, (card.mastery_score || 0) + delta)
                                ),
                            }
                            : card
                    ),
                };
            })
        );

        setTimeout(() => nextCard(), 200);

        try {
            const updatedCard = await updateCardMastery(targetCard.id, delta);
            setDecksError("");
            setDecks((prevDecks) =>
                prevDecks.map((deck) => {
                    if (deck.id !== activeDeck.id) return deck;
                    return {
                        ...deck,
                        cards: deck.cards.map((card) =>
                            card.id === updatedCard.id ? updatedCard : card
                        ),
                    };
                })
            );
        } catch (err) {
            setDecksError(`Could not save mastery score: ${err.message}`);
        }
    }

    function selectDeck(deckId) {
        setActiveDeckId(deckId);
        setIsFlipped(false);
        setRemedialResult(null);
        setRemedialError("");
        setStruggleNudge(null);
    }

    async function handleDeleteDeck(deckIdToDelete) {
        const target = decks.find((d) => d.id === deckIdToDelete);
        if (!target) return;

        try {
            await deleteDeck(deckIdToDelete);
            setDecksError("");
            setRestoreMsg("");

            setDeckIndices((prev) => {
                const copy = { ...prev };
                delete copy[deckIdToDelete];
                return copy;
            });

            setDecks((prevDecks) => {
                const remaining = prevDecks.filter((d) => d.id !== deckIdToDelete);
                if (resolvedDeckId === deckIdToDelete) {
                    setActiveDeckId(remaining[0]?.id || "");
                    setIsFlipped(false);
                }
                return remaining;
            });
            setStatusMsg(`Deleted deck "${target.title}".`);
        } catch (err) {
            setDecksError(`Could not delete deck: ${err.message}`);
        }
    }

    async function handleRestoreStarterDecks() {
        setIsRestoring(true);
        setRestoreMsg("");
        setDecksError("");

        try {
            const data = await restoreStarterDecks();
            const updatedDecks = Array.isArray(data?.decks) ? data.decks : [];
            setDecks(updatedDecks);

            if (
                updatedDecks.length > 0 &&
                !updatedDecks.some((d) => d.id === resolvedDeckId)
            ) {
                setActiveDeckId(updatedDecks[0].id);
                setIsFlipped(false);
            }

            const msg =
                data?.message ||
                "Starter decks restored and starter card mastery scores reset to 0.";
            setRestoreMsg(msg);
        } catch (err) {
            setDecksError(`Could not restore starter decks: ${err.message}`);
        } finally {
            setIsRestoring(false);
        }
    }

    // Keyboard shortcuts: Space = flip, 1 = correct (+1), 2 = wrong (-1), Arrows = nav
    useEffect(() => {
        function handleKeyDown(e) {
            if (window.location.pathname === "/timer") return;
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
    }, [safeIndex, resolvedDeckId, decks, isFlipped]);

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
        if (!notesInput.trim()) {
            setStatusMsg("Please enter a topic or study notes first.");
            return;
        }

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

            const newDeckTitle = `Generated: ${notesInput.trim().substring(0, 15)}`;
            const savedDeck = await createDeck(newDeckTitle, generatedCards);

            setDecks((prev) => [...prev, savedDeck]);
            setActiveDeckId(savedDeck.id);
            setIsFlipped(false);
            setNotesInput("");
            setStatusMsg(
                `Success! Saved ${savedDeck.cards.length} flashcards in "${savedDeck.title}".`
            );
        } catch (err) {
            console.error(err);
            setStatusMsg(`Error: ${err.message}`);
        } finally {
            setIsGenerating(false);
        }
    }
    async function handleGenerateRemedial() {
        if (!resolvedDeckId) return;
        setRemedialLoading(true);
        setRemedialError("");
        setRemedialSaveMsg("");
        setStruggleNudge(null);

        try {
            const result = await generateRemedialCards(resolvedDeckId);
            setRemedialResult(result);
        } catch (err) {
            setRemedialError(
                `${err.message} (Other features like studying and the timer still work.)`
            );
        } finally {
            setRemedialLoading(false);
        }
    }

    async function handleAddRemedialToCurrentDeck() {
        if (!remedialResult || !remedialResult.cards?.length) return;
        setIsSavingRemedial(true);
        setRemedialError("");

        try {
            const createdCards = [];
            for (const card of remedialResult.cards) {
                const saved = await addCardToDeck(remedialResult.deckId, card);
                createdCards.push(saved);
            }

            setDecks((prevDecks) =>
                prevDecks.map((deck) =>
                    deck.id === remedialResult.deckId
                        ? { ...deck, cards: [...deck.cards, ...createdCards] }
                        : deck
                )
            );
            setRemedialSaveMsg(
                `Added ${createdCards.length} remedial cards to "${remedialResult.deckTitle}".`
            );
            setRemedialResult(null);
        } catch (err) {
            setRemedialError(`Could not add cards to deck: ${err.message}`);
        } finally {
            setIsSavingRemedial(false);
        }
    }

    async function handleSaveRemedialAsNewDeck() {
        if (!remedialResult || !remedialResult.cards?.length) return;
        setIsSavingRemedial(true);
        setRemedialError("");

        try {
            const title = `Remedial: ${remedialResult.deckTitle || resolvedDeckTitle}`;
            const savedDeck = await createDeck(title, remedialResult.cards);

            setDecks((prev) => [...prev, savedDeck]);
            setActiveDeckId(savedDeck.id);
            setIsFlipped(false);
            setRemedialSaveMsg(
                `Saved ${savedDeck.cards.length} remedial cards as "${savedDeck.title}".`
            );
            setRemedialResult(null);
        } catch (err) {
            setRemedialError(`Could not save remedial deck: ${err.message}`);
        } finally {
            setIsSavingRemedial(false);
        }
    }

    function handleDiscardRemedial() {
        setRemedialResult(null);
        setRemedialError("");
    }
    const flashcardViewerProps = {
        activeDeckTitle: resolvedDeckTitle,
        currentCards,
        currentIndex: safeIndex,
        isFlipped,
        animatingBtn,
        onFlip: flipCard,
        onPrev: prevCard,
        onNext: nextCard,
        onMastery: handleMastery,
        remedialLoading,
        remedialError,
        remedialResult,
        remedialSaveMsg,
        isSavingRemedial,
        struggleNudge:
            struggleNudge?.deckId === resolvedDeckId ? struggleNudge : null,
        onDismissNudge: () => setStruggleNudge(null),
        onGenerateRemedial: handleGenerateRemedial,
        onAddRemedialToCurrentDeck: handleAddRemedialToCurrentDeck,
        onSaveRemedialAsNewDeck: handleSaveRemedialAsNewDeck,
        onDiscardRemedial: handleDiscardRemedial,
    };
    return (
        <BrowserRouter>
            <div className="app-layout">
                <Sidebar
                    isOpen={isSidebarOpen}
                    onToggle={() => setIsSidebarOpen((prev) => !prev)}
                />

                <main className="main-content">
                    <Routes>
                        <Route
                            path="/"
                            element={
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
                                        <FlashcardViewer {...flashcardViewerProps} />



                                        <DeckList
                                            decks={decks}
                                            activeDeckId={resolvedDeckId}
                                            isLoadingDecks={isLoadingDecks}
                                            decksError={decksError}
                                            isRestoring={isRestoring}
                                            restoreMsg={restoreMsg}
                                            onSelectDeck={selectDeck}
                                            onDeleteDeck={handleDeleteDeck}
                                            onRestoreStarterDecks={handleRestoreStarterDecks}
                                        />
                                    </div>
                                </div>
                            }
                        />

                        <Route
                            path="/flashcards"
                            element={
                                <FlashcardViewer {...flashcardViewerProps} isFullscreen/>}/>


                        <Route
                            path="/timer"
                            element={
                                <PomodoroTimer
                                    timerState={timerState}
                                    onToggle={toggleTimer}
                                    onReset={resetTimer}
                                    isFullscreen
                                />
                            }
                        />

                        <Route path="*" element={<Navigate to="/" replace />} />
                    </Routes>
                </main>
            </div>
        </BrowserRouter>
    );
}