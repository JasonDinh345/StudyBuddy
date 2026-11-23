export default function FlashcardViewer({
                                            activeDeckTitle,
                                            currentCards,
                                            currentIndex,
                                            isFlipped,
                                            animatingBtn,
                                            onFlip,
                                            onPrev,
                                            onNext,
                                            onMastery,
                                            isFullscreen = false,
                                        }) {
    const currentCard = currentCards[currentIndex];

    if (!activeDeckTitle || !currentCard) {
        return (
            <section className={isFullscreen ? "fullscreen-flashcards" : "card-box viewer-card"}>
                <h3>No Flashcards Selected</h3>
                <p className="subtitle-hint">
                    Select a deck or generate new flashcards from your notes to start studying.
                </p>
            </section>
        );
    }

    const cardMastery =
        typeof currentCard.mastery_score === "number" ? currentCard.mastery_score : 0;

    const masteryClass =
        cardMastery < 0
            ? "mastery-low"
            : cardMastery > 0
                ? "mastery-high"
                : "";

    const cardDisplay = (
        <div
            className={`flashcard-preview ${isFullscreen ? "fullscreen-fc" : ""}`}
            onClick={onFlip}
        >
            <div className={`fc-top-left-badge ${masteryClass}`}>
                Card Mastery: {cardMastery}
            </div>
            <div className="fc-counter">
                {currentIndex + 1} / {currentCards.length}
            </div>
            <div className="fc-body">
                <p className={isFullscreen ? "fs-text" : ""}>
                    {isFlipped ? currentCard.answer : currentCard.question}
                </p>
            </div>
            {!isFullscreen && (
                <div className="fc-action-prompt">
                    {isFlipped ? "Showing Answer (Space to flip)" : "See answer (Spacebar)"}
                </div>
            )}
        </div>
    );

    const controls = (
        <div className="flashcard-nav-controls">
            <button onClick={onPrev} className="nav-action-btn">
                ← Previous
            </button>

            <div className="grading-buttons">
                <button
                    onClick={() => onMastery(-1, "red")}
                    className={`glass-grade-btn red-glass ${animatingBtn === "red" ? "pulse-red" : ""}`}
                    title="Incorrect (Press 2)"
                >
                    ✕
                </button>
                <button
                    onClick={() => onMastery(1, "green")}
                    className={`glass-grade-btn green-glass ${animatingBtn === "green" ? "pulse-green" : ""}`}
                    title="Got it (Press 1)"
                >
                    ✓
                </button>
            </div>

            <button onClick={onNext} className="nav-action-btn">
                Next →
            </button>
        </div>
    );

    if (isFullscreen) {
        return (
            <div className="fullscreen-flashcards">
                <h2>{activeDeckTitle} - Fullscreen Study!</h2>
                {cardDisplay}
                {controls}
            </div>
        );
    }

    return (
        <section className="card-box viewer-card">
            <div className="viewer-header">
                <span>Flashcards ({activeDeckTitle})</span>
                <span className="subtitle-hint">Review and build knowledge</span>
            </div>
            {cardDisplay}
            {controls}
        </section>
    );
}