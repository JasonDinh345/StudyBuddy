import path from "node:path";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";
import { mkdir } from "node:fs/promises";
import { JSONFilePreset } from "lowdb/node";
import {
    DEMO_USER_ID,
    STARTER_USER,
    STARTER_DECKS,
    STARTER_FLASHCARDS,
} from "./seed.js";

const dataDir = fileURLToPath(new URL("./data", import.meta.url));
const dbPath = path.join(dataDir, "db.json");

await mkdir(dataDir, { recursive: true });

export const db = await JSONFilePreset(dbPath, {
    users: [],
    decks: [],
    flashcards: [],
});

function clampMastery(score) {
    return Math.max(-5, Math.min(5, score));
}

function attachCards(decks, flashcards) {
    return decks.map((deck) => ({
        ...deck,
        cards: flashcards.filter((card) => card.deckId === deck.id),
    }));
}

export async function getAllDecks(userId) {
    await db.read();
    const filteredDecks = userId
        ? db.data.decks.filter((d) => d.userId === userId)
        : db.data.decks;
    return attachCards(filteredDecks, db.data.flashcards);
}

export async function getDeckById(deckId) {
    await db.read();
    const deck = db.data.decks.find((d) => d.id === deckId);
    if (!deck) return null;
    const cards = db.data.flashcards.filter((c) => c.deckId === deckId);
    return { ...deck, cards };
}

export async function createDeck({ title, userId = DEMO_USER_ID, cards = [] }) {
    await db.read();

    const newDeck = {
        id: crypto.randomUUID(),
        userId,
        title: title.trim(),
        isStarter: false,
    };

    db.data.decks.push(newDeck);

    const validCards = cards
        .filter(
            (c) =>
                c &&
                typeof c.question === "string" &&
                c.question.trim() &&
                typeof c.answer === "string" &&
                c.answer.trim()
        )
        .map((c) => ({
            id: crypto.randomUUID(),
            deckId: newDeck.id,
            userId,
            question: c.question.trim(),
            answer: c.answer.trim(),
            mastery_score:
                typeof c.mastery_score === "number" ? clampMastery(c.mastery_score) : 0,
        }));

    db.data.flashcards.push(...validCards);
    await db.write();

    return { ...newDeck, cards: validCards };
}

export async function updateDeck(deckId, { title }) {
    await db.read();
    const deck = db.data.decks.find((d) => d.id === deckId);
    if (!deck) return null;

    deck.title = title.trim();
    await db.write();

    const cards = db.data.flashcards.filter((c) => c.deckId === deckId);
    return { ...deck, cards };
}

export async function deleteDeck(deckId) {
    await db.read();
    const idx = db.data.decks.findIndex((d) => d.id === deckId);
    if (idx === -1) return false;

    db.data.decks.splice(idx, 1);
    db.data.flashcards = db.data.flashcards.filter((c) => c.deckId !== deckId);
    await db.write();
    return true;
}

export async function addCardToDeck(
    deckId,
    { question, answer, mastery_score = 0 }
) {
    await db.read();
    const deck = db.data.decks.find((d) => d.id === deckId);
    if (!deck) return null;

    const newCard = {
        id: crypto.randomUUID(),
        deckId: deck.id,
        userId: deck.userId,
        question: question.trim(),
        answer: answer.trim(),
        mastery_score:
            typeof mastery_score === "number" ? clampMastery(mastery_score) : 0,
    };

    db.data.flashcards.push(newCard);
    await db.write();
    return newCard;
}

export async function updateCardMastery(cardId, { delta, mastery_score }) {
    await db.read();
    const card = db.data.flashcards.find((c) => c.id === cardId);
    if (!card) return null;

    const currentScore =
        typeof card.mastery_score === "number" ? card.mastery_score : 0;

    if (typeof mastery_score === "number") {
        card.mastery_score = clampMastery(mastery_score);
    } else if (typeof delta === "number") {
        card.mastery_score = clampMastery(currentScore + delta);
    }

    await db.write();
    return card;
}

export async function getLowMasteryCards({ userId, deckId, threshold = 0 } = {}) {
    await db.read();
    return db.data.flashcards
        .filter((card) => {
            if (userId && card.userId !== userId) return false;
            if (deckId && card.deckId !== deckId) return false;
            return card.mastery_score < threshold;
        })
        .sort((a, b) => a.mastery_score - b.mastery_score);
}

export async function restoreStarterDecks() {
    await db.read();

    // Make sure the demo user record exists
    if (!db.data.users.some((u) => u.id === STARTER_USER.id)) {
        db.data.users.push({ ...STARTER_USER });
    }

    // Re-insert any deleted starter decks without touching user or AI decks
    const existingDeckIds = new Set(db.data.decks.map((d) => d.id));
    for (const starterDeck of STARTER_DECKS) {
        if (!existingDeckIds.has(starterDeck.id)) {
            db.data.decks.push({ ...starterDeck });
        }
    }

    // Re-insert missing starter cards or reset existing starter cards to mastery_score 0
    for (const starterCard of STARTER_FLASHCARDS) {
        const existingCard = db.data.flashcards.find((c) => c.id === starterCard.id);
        if (existingCard) {
            existingCard.mastery_score = 0;
        } else {
            db.data.flashcards.push({ ...starterCard, mastery_score: 0 });
        }
    }

    await db.write();
    return attachCards(db.data.decks, db.data.flashcards);
}