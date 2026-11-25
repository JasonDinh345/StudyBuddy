import dotenv from "dotenv";
import express from "express";
import {
    getAllDecks,
    getDeckById,
    createDeck,
    updateDeck,
    deleteDeck,
    addCardToDeck,
    updateCardMastery,
    getLowMasteryCards,
    restoreStarterDecks,
} from "./db.js";
// Check for a .env file in this folder first; if none exists yet, use the shared backend/.env
dotenv.config();
dotenv.config({ path: "../.env" });

const app = express();
const PORT = process.env.PORT || 3002;
const SERVICE_API_KEY = process.env.SERVICE_API_KEY || "tcss460-secret";

app.use(express.json());

// Public health check for gateway monitoring
app.get("/health", (req, res) => {
    res.json({ status: "ok", service: "decks-service", port: Number(PORT) });
});

function requireApiKey(req, res, next) {
    if (req.header("x-api-key") !== SERVICE_API_KEY) {
        return res
            .status(401)
            .json({ error: "Missing or invalid x-api-key header." });
    }
    next();
}
// List all decks with their cards
app.get("/decks", requireApiKey, async (req, res) => {
    try {
        const decks = await getAllDecks(req.query.userId);
        res.status(200).json({ decks });
    } catch (err) {
        console.error("GET /decks error:", err);
        res.status(500).json({ error: "Failed to load decks." });
    }
});
// Must be registered before /decks/:deckId
// Must be registered before /decks/:deckId
app.post("/decks/restore-starter", requireApiKey, async (req, res) => {
    try {
        const { decks, restoredTitles } = await restoreStarterDecks();
        const message =
            restoredTitles.length > 0
                ? `Restored ${restoredTitles.join(", ")} (mastery scores reset to 0).`
                : "Nothing to restore — all starter decks are already present.";

        res.status(200).json({
            message,
            restoredCount: restoredTitles.length,
            decks,
        });
    } catch (err) {
        console.error("POST /decks/restore-starter error:", err);
        res.status(500).json({ error: "Failed to restore starter decks." });
    }
});
// Get one deck by ID
app.get("/decks/:deckId", requireApiKey, async (req, res) => {
    try {
        const deck = await getDeckById(req.params.deckId);
        if (!deck) {
            return res
                .status(404)
                .json({ error: `Deck '${req.params.deckId}' was not found.` });
        }
        res.status(200).json(deck);
    } catch (err) {
        console.error("GET /decks/:deckId error:", err);
        res.status(500).json({ error: "Failed to fetch deck." });
    }
});

// Create a new deck with optional initial cards
app.post("/decks", requireApiKey, async (req, res) => {
    try {
        const { title, userId, cards } = req.body || {};
        if (typeof title !== "string" || !title.trim()) {
            return res
                .status(400)
                .json({ error: "Deck title is required and must be a non-empty string." });
        }
        if (cards !== undefined && !Array.isArray(cards)) {
            return res.status(400).json({ error: "cards must be an array." });
        }

        const created = await createDeck({ title, userId, cards });
        res.status(201).json(created);
    } catch (err) {
        console.error("POST /decks error:", err);
        res.status(500).json({ error: "Failed to create deck." });
    }
});

// Rename an existing deck
app.put("/decks/:deckId", requireApiKey, async (req, res) => {
    try {
        const { title } = req.body || {};
        if (typeof title !== "string" || !title.trim()) {
            return res
                .status(400)
                .json({ error: "Deck title is required and must be a non-empty string." });
        }

        const updated = await updateDeck(req.params.deckId, { title });
        if (!updated) {
            return res
                .status(404)
                .json({ error: `Deck '${req.params.deckId}' was not found.` });
        }
        res.status(200).json(updated);
    } catch (err) {
        console.error("PUT /decks/:deckId error:", err);
        res.status(500).json({ error: "Failed to update deck." });
    }
});

// Delete a deck and its flashcards
app.delete("/decks/:deckId", requireApiKey, async (req, res) => {
    try {
        const deleted = await deleteDeck(req.params.deckId);
        if (!deleted) {
            return res
                .status(404)
                .json({ error: `Deck '${req.params.deckId}' was not found.` });
        }
        res.status(204).send();
    } catch (err) {
        console.error("DELETE /decks/:deckId error:", err);
        res.status(500).json({ error: "Failed to delete deck." });
    }
});

// Add a single flashcard to an existing deck
app.post("/decks/:deckId/cards", requireApiKey, async (req, res) => {
    try {
        const { question, answer, mastery_score } = req.body || {};
        if (
            typeof question !== "string" ||
            !question.trim() ||
            typeof answer !== "string" ||
            !answer.trim()
        ) {
            return res
                .status(400)
                .json({ error: "Both question and answer must be non-empty strings." });
        }

        const card = await addCardToDeck(req.params.deckId, {
            question,
            answer,
            mastery_score,
        });
        if (!card) {
            return res
                .status(404)
                .json({ error: `Deck '${req.params.deckId}' was not found.` });
        }
        res.status(201).json(card);
    } catch (err) {
        console.error("POST /decks/:deckId/cards error:", err);
        res.status(500).json({ error: "Failed to add flashcard." });
    }
});

// Query cards below a mastery threshold (used by groq-service tool calls)
app.get("/cards/low-mastery", requireApiKey, async (req, res) => {
    try {
        const threshold =
            req.query.threshold !== undefined ? Number(req.query.threshold) : 0;
        if (Number.isNaN(threshold)) {
            return res.status(400).json({ error: "threshold must be a valid number." });
        }

        const cards = await getLowMasteryCards({
            userId: req.query.userId,
            deckId: req.query.deckId,
            threshold,
        });
        res.status(200).json({ cards });
    } catch (err) {
        console.error("GET /cards/low-mastery error:", err);
        res.status(500).json({ error: "Failed to fetch low-mastery cards." });
    }
});

// Update card mastery_score by delta (+1 / -1) or explicit value
app.patch("/cards/:cardId", requireApiKey, async (req, res) => {
    try {
        const { delta, mastery_score } = req.body || {};
        const hasDelta = typeof delta === "number" && !Number.isNaN(delta);
        const hasScore =
            typeof mastery_score === "number" && !Number.isNaN(mastery_score);

        if (!hasDelta && !hasScore) {
            return res.status(400).json({
                error: "Provide a numeric delta (e.g., 1 or -1) or mastery_score (-5 to 5).",
            });
        }

        const updated = await updateCardMastery(req.params.cardId, {
            delta: hasDelta ? delta : undefined,
            mastery_score: hasScore ? mastery_score : undefined,
        });

        if (!updated) {
            return res
                .status(404)
                .json({ error: `Flashcard '${req.params.cardId}' was not found.` });
        }
        res.status(200).json(updated);
    } catch (err) {
        console.error("PATCH /cards/:cardId error:", err);
        res.status(500).json({ error: "Failed to update flashcard mastery." });
    }
});

app.use((req, res) => {
    res.status(404).json({ error: `No route for ${req.method} ${req.path}.` });
});

app.use((err, req, res, next) => {
    res.status(err.status || 400).json({ error: "Request body is not valid JSON." });
});

app.listen(PORT, () => {
    console.log(`Decks Service running at http://localhost:${PORT}`);
});