const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:3000";
async function apiRequest(path, options = {}) {
    let response;
    try {
        response = await fetch(`${API_BASE_URL}${path}`, {
            headers: { "Content-Type": "application/json", ...(options.headers || {}) },
            ...options,
        });
    } catch {
        throw new Error(`Network error: Could not reach API Gateway at ${API_BASE_URL}.`);
    }

    if (response.status === 204) {
        return null;
    }

    let data = {};
    try {
        data = await response.json();
    } catch {
        data = {};
    }

    if (!response.ok) {
        const errMsg =
            data?.error || data?.message || `Request failed (HTTP ${response.status})`;
        throw new Error(errMsg);
    }

    return data;
}
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
        .map((card) => ({
            question: card.question,
            answer: card.answer,
            mastery_score: typeof card.mastery_score === "number" ? card.mastery_score : 0,
        }));
}
export async function fetchDecks() {
    const data = await apiRequest("/api/decks");
    return Array.isArray(data?.decks) ? data.decks : [];
}
export async function createDeck(title, cards = []) {
    return apiRequest("/api/decks", {
        method: "POST",
        body: JSON.stringify({ title, cards }),
    });
}
export async function deleteDeck(deckId) {
    return apiRequest(`/api/decks/${encodeURIComponent(deckId)}`, {
        method: "DELETE",
    });
}
export async function updateCardMastery(cardId, delta) {
    return apiRequest(`/api/cards/${encodeURIComponent(cardId)}`, {
        method: "PATCH",
        body: JSON.stringify({ delta }),
    });
}

export async function restoreStarterDecks() {
    return apiRequest("/api/decks/restore-starter", {
        method: "POST",
    });
}

export async function generateFlashcardsFromNotes(notes) {
    const data = await apiRequest("/api/groq/generate-flashcards", {
        method: "POST",
        body: JSON.stringify({ notes }),
    });
    return extractGeneratedCards(data);
}
export async function addCardToDeck(deckId, card) {
    return apiRequest(`/api/decks/${encodeURIComponent(deckId)}/cards`, {
        method: "POST",
        body: JSON.stringify({
            question: card.question,
            answer: card.answer,
            mastery_score: 0,
        }),
    });
}

export async function generateRemedialCards(deckId) {
    return apiRequest(`/api/groq/low-mastery/${encodeURIComponent(deckId)}`, {
        method: "POST",
    });
}