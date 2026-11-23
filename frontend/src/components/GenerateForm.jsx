export default function GenerateForm({
                                         notesInput,
                                         onNotesChange,
                                         onSubmit,
                                         isGenerating,
                                         statusMsg,
                                     }) {
    return (
        <section className="card-box generate-card">
            <h3>Generate Flashcards</h3>
            <form onSubmit={onSubmit}>
        <textarea
            value={notesInput}
            onChange={(e) => onNotesChange(e.target.value)}
            placeholder="Enter a topic or paste notes below. We'll create flashcards for you!"
            rows={3}
            disabled={isGenerating}
        />
                <button type="submit" className="primary-btn" disabled={isGenerating}>
                    {isGenerating ? "Generating..." : "Generate"}
                </button>
            </form>
            {statusMsg && <p className="status-note">{statusMsg}</p>}
        </section>
    );
}