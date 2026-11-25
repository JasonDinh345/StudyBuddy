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
                                            remedialLoading = false,
                                            remedialError = "",
                                            remedialResult = null,
                                            remedialSaveMsg = "",
                                            isSavingRemedial = false,
                                            struggleNudge = null,
                                            onDismissNudge,
                                            onGenerateRemedial,
                                            onAddRemedialToCurrentDeck,
                                            onSaveRemedialAsNewDeck,
                                            onDiscardRemedial,
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
    const weakCardCount = currentCards.filter(
        (c) => typeof c.mastery_score === "number" && c.mastery_score < 0
    ).length;
    const masteryClass =
        cardMastery < 0
            ? "mastery-low"
            : cardMastery > 0
                ? "mastery-high"
                : "";

    const showNudge =
        struggleNudge !== null && !remedialLoading && !remedialResult;

    const nudgeBanner = showNudge && (
        <div className="remedial-nudge" role="status">
            <span>
                Struggling with this card (Mastery: {struggleNudge.masteryScore})?
            </span>
            <div className="remedial-nudge-actions">
                <button
                    type="button"
                    className="remedial-nudge-btn"
                    onClick={onGenerateRemedial}
                    disabled={remedialLoading}
                >
                    Generate Remedial Practice (AI)
                </button>
                {onDismissNudge && (
                    <button
                        type="button"
                        className="remedial-dismiss-btn"
                        onClick={onDismissNudge}
                        aria-label="Dismiss suggestion"
                    >
                        ✕
                    </button>
                )}
            </div>
        </div>
    );

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
    const remedialPanel = (
        <>
            {remedialLoading && (
                <div className="remedial-panel" role="status">
                    <p className="subtitle-hint">
                        AI Agent is inspecting weak cards in "{activeDeckTitle}"...
                    </p>
                </div>
            )}

            {remedialError && (
                <div className="deck-error-banner remedial-alert" role="alert">
                    {remedialError}
                </div>
            )}

            {remedialSaveMsg && (
                <p className="restore-status remedial-alert">{remedialSaveMsg}</p>
            )}

            {remedialResult && !remedialLoading && (
                <div className="remedial-panel">
                    <div className="remedial-panel-header">
                        <div className="remedial-title-row">
                            <span className="ai-badge">AI-Generated</span>
                            {remedialResult.mock && (
                                <span className="mock-badge">Mock Mode</span>
                            )}
                            <strong>
                                Remedial Drill for {remedialResult.deckTitle || activeDeckTitle}
                            </strong>
                        </div>
                        <button
                            type="button"
                            className="remedial-dismiss-btn"
                            onClick={onDiscardRemedial}
                            aria-label="Close remedial suggestions"
                        >
                            ✕
                        </button>
                    </div>

                    {Array.isArray(remedialResult.toolsUsed) &&
                        remedialResult.toolsUsed.length > 0 && (
                            <details className="tools-trace">
                                <summary>
                                    How this was produced ({remedialResult.toolsUsed.length} tool{" "}
                                    {remedialResult.toolsUsed.length === 1 ? "call" : "calls"})
                                </summary>
                                <ul className="tools-trace-list">
                                    {remedialResult.toolsUsed.map((entry, idx) => (
                                        <li key={`${entry.tool}-${idx}`}>
                                            <code>{entry.tool}</code>(
                                            <code>{JSON.stringify(entry.args)}</code>)
                                        </li>
                                    ))}
                                </ul>
                            </details>
                        )}

                    {!remedialResult.cards || remedialResult.cards.length === 0 ? (
                        <p className="subtitle-hint remedial-empty">
                            {remedialResult.message ||
                                "No weak cards below 0 in this deck yet!"}
                        </p>
                    ) : (
                        <>
                            <div className="remedial-cards-list">
                                {remedialResult.cards.map((card, idx) => (
                                    <div key={idx} className="remedial-card-item">
                                        <p className="remedial-q">
                                            <strong>Q{idx + 1}:</strong> {card.question}
                                        </p>
                                        <p className="remedial-a">
                                            <strong>A:</strong> {card.answer}
                                        </p>
                                    </div>
                                ))}
                            </div>

                            <div className="remedial-save-actions">
                                <button
                                    type="button"
                                    className="primary-btn"
                                    onClick={onAddRemedialToCurrentDeck}
                                    disabled={isSavingRemedial}
                                >
                                    {isSavingRemedial
                                        ? "Saving..."
                                        : "Add to Current Deck"}
                                </button>
                                <button
                                    type="button"
                                    className="nav-action-btn"
                                    onClick={onSaveRemedialAsNewDeck}
                                    disabled={isSavingRemedial}
                                >
                                    Save as New Remedial Deck
                                </button>
                                <button
                                    type="button"
                                    className="nav-action-btn"
                                    onClick={onDiscardRemedial}
                                    disabled={isSavingRemedial}
                                >
                                    Discard
                                </button>
                            </div>
                        </>
                    )}
                </div>
            )}
        </>
    );

    const headerButton = (
        <button
            type="button"
            className="practice-weak-btn"
            onClick={onGenerateRemedial}
            disabled={remedialLoading}
            title="Run the AI Agent to inspect low-mastery cards in this deck and generate drill cards"
        >
            {remedialLoading
                ? "Analyzing..."
                : weakCardCount > 0
                    ? `Practice Weak Cards (AI · ${weakCardCount})`
                    : "Practice Weak Cards (AI)"}
        </button>
    );

    if (isFullscreen) {
        return (
            <div className="fullscreen-flashcards">
                <div className="fullscreen-viewer-header">
                    <h2>{activeDeckTitle} - Fullscreen Study!</h2>
                    {headerButton}
                </div>
                {nudgeBanner}
                {cardDisplay}
                {controls}
                {remedialPanel}
            </div>
        );
    }

    return (
        <section className="card-box viewer-card">
            <div className="viewer-header viewer-header-row">
                <div className="viewer-header-text">
                    <span>Flashcards ({activeDeckTitle})</span>
                    <span className="subtitle-hint">Review and build knowledge</span>
                </div>
                {headerButton}
            </div>
            {nudgeBanner}
            {cardDisplay}
            {controls}
            {remedialPanel}
        </section>
    );
}