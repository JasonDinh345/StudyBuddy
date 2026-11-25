import { useState } from "react";

function TrashCanIcon({ isOpen, isDragOver }) {
    const fillColor = isDragOver ? "#2563eb" : "#394957";

    return (
        <svg
            className={`trash-svg ${isOpen ? "open" : ""}`}
            viewBox="0 0 64 76"
            width="28"
            height="34"
            aria-hidden="true"
        >
            {/* Animated Lid */}
            <g className="trash-lid">
                <path
                    d="M23 14 V9 C23 6.8 24.8 5 27 5 H37 C39.2 5 41 6.8 41 9 V14"
                    fill="none"
                    stroke={fillColor}
                    strokeWidth="4.5"
                    strokeLinecap="round"
                />
                <rect x="8" y="13" width="48" height="8" rx="4" fill={fillColor} />
            </g>

            {/* Trashcan Body */}
            <path
                d="M13 25 H51 L47.5 68 C47.2 71.2 44.6 73.5 41.4 73.5 H22.6 C19.4 73.5 16.8 71.2 16.5 68 L13 25 Z"
                fill={fillColor}
            />

            {/* 4 vertical cutouts */}
            <rect x="20" y="33" width="3.5" height="32" rx="1.75" fill="#ffffff" />
            <rect x="27.5" y="33" width="3.5" height="32" rx="1.75" fill="#ffffff" />
            <rect x="35" y="33" width="3.5" height="32" rx="1.75" fill="#ffffff" />
            <rect x="42.5" y="33" width="3.5" height="32" rx="1.75" fill="#ffffff" />
        </svg>
    );
}

export default function DeckList({
                                     decks,
                                     activeDeckId,
                                     isLoadingDecks,
                                     decksError,
                                     isRestoring,
                                     restoreMsg,
                                     onSelectDeck,
                                     onDeleteDeck,
                                     onRestoreStarterDecks,
                                 }) {
    const [isTrashOpen, setIsTrashOpen] = useState(false);
    const [isDragOverTrash, setIsDragOverTrash] = useState(false);
    const [draggingDeckId, setDraggingDeckId] = useState(null);

    const lidShouldBeOpen = isTrashOpen || isDragOverTrash;

    function handleDragStart(e, deckId) {
        e.dataTransfer.setData("text/plain", deckId);
        e.dataTransfer.effectAllowed = "move";
        setDraggingDeckId(deckId);
    }

    function handleDragEnd() {
        setDraggingDeckId(null);
        setIsDragOverTrash(false);
    }

    function handleDragOverTrash(e) {
        e.preventDefault();
        e.dataTransfer.dropEffect = "move";
        if (!isDragOverTrash) setIsDragOverTrash(true);
    }

    function handleDropOnTrash(e) {
        e.preventDefault();
        const droppedId = e.dataTransfer.getData("text/plain") || draggingDeckId;
        setIsDragOverTrash(false);
        setDraggingDeckId(null);
        if (droppedId) {
            onDeleteDeck(droppedId);
        }
    }

    return (
        <section className="card-box decks-card">
            <div className="decks-header">
                <h3>Decks</h3>
                <button
                    type="button"
                    className={`trash-dropzone ${isDragOverTrash ? "drag-over" : ""} ${
                        isTrashOpen ? "toggled-open" : ""
                    }`}
                    onClick={() => setIsTrashOpen((prev) => !prev)}
                    onDragOver={handleDragOverTrash}
                    onDragEnter={(e) => {
                        e.preventDefault();
                        setIsDragOverTrash(true);
                    }}
                    onDragLeave={() => setIsDragOverTrash(false)}
                    onDrop={handleDropOnTrash}
                    title={
                        lidShouldBeOpen
                            ? "Drag a deck here to delete (Click to close)"
                            : "Click to open trash or drag a deck here to delete"
                    }
                    aria-label="Toggle trash can or drop a deck here to delete"
                >
                    <TrashCanIcon isOpen={lidShouldBeOpen} isDragOver={isDragOverTrash} />
                </button>
            </div>

            <div className="trash-hint-slot">
                {(isTrashOpen || draggingDeckId) && (
                    <p className={`trash-hint ${isDragOverTrash ? "ready-drop" : ""}`}>
                        {isDragOverTrash
                            ? "Release to remove deck"
                            : "Drag any deck onto the trash icon to remove it."}
                    </p>
                )}
            </div>

            {decksError && (
                <p className="deck-error-banner" role="alert">
                    {decksError}
                </p>
            )}

            <div className="decks-list">
                {isLoadingDecks ? (
                    <p className="subtitle-hint">Loading decks...</p>
                ) : decks.length === 0 ? (
                    <p className="subtitle-hint">
                        No decks left. Restore starter decks below or generate new ones!
                    </p>
                ) : (
                    decks.map((deck) => (
                        <div
                            key={deck.id}
                            draggable
                            onDragStart={(e) => handleDragStart(e, deck.id)}
                            onDragEnd={handleDragEnd}
                            className={`deck-item ${
                                activeDeckId === deck.id ? "active-deck" : ""
                            } ${draggingDeckId === deck.id ? "is-dragging" : ""}`}
                            onClick={() => onSelectDeck(deck.id)}
                            title="Click to study, or drag to trash icon to remove"
                        >
                            <span>
                                {deck.title} ({deck.cards?.length || 0})
                            </span>
                            <span className="arrow">&gt;</span>
                        </div>
                    ))
                )}
            </div>

            <div className="decks-footer">
                <button
                    type="button"
                    className="restore-starter-btn"
                    onClick={onRestoreStarterDecks}
                    disabled={isRestoring}
                    title="Restores missing starter decks and resets starter card mastery scores to 0"
                >
                    {isRestoring ? "Restoring..." : "Restore Starter Decks"}
                </button>
                {restoreMsg && <p className="restore-status">{restoreMsg}</p>}
            </div>
        </section>
    );
}