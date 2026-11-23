const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:3000";

function extractGeneratedCards(data) {
    let cardList = [];

    if (Array.isArray(data)) {
        cardList = data;
    } else if (data && Array.isArray(data.cards)) {
        cardList = data.cards;
    } else if (data && Array.isArray(data.flashcards)) {
        cardList = data.flashcards;
    } else if (data && typeof data === "object") {
        if (typeof data.question === "string" && typeof data.answer === "string") {
            cardList = [data];
        } else {
            const values = Object.values(data);
            for (let i = 0; i < values.length; i++) {
                if (Array.isArray(values[i])) {
                    cardList = values[i];
                    break;
                }
            }
        }
    }

    return cardList
        .filter(
            (card) =>
                card &&
                typeof card.question === "string" &&
                typeof card.answer === "string"
        )
        .map((card, idx) => ({
            id: card.card_id ?? card.id ?? `${Date.now()}-${idx}`,
            question: card.question,
            answer: card.answer,
            mastery_score: typeof card.mastery_score === "number" ? card.mastery_score : 0,
        }));
}

export async function generateFlashcardsFromNotes(notes) {
    const response = await fetch(`${API_BASE_URL}/api/groq/generate-flashcards`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notes }),
    });

    let data = {};
    try {
        data = await response.json();
    } catch (parseErr) {
        console.error("Failed to parse JSON:", parseErr);
    }

    if (!response.ok) {
        const errMsg =
            data?.error || data?.message || `Request failed (HTTP ${response.status})`;
        throw new Error(errMsg);
    }

    return extractGeneratedCards(data);
}