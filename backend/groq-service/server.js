import dotenv from "dotenv";

import pool from "../lib/db.js";
dotenv.config({ path: "../.env" });
import express from "express";

const app = express();
const PORT = process.env.PORT || 3001;
const SERVICE_API_KEY = process.env.SERVICE_API_KEY || "tcss460-secret";

app.use(express.json());

function requireApiKey(req, res, next) {
    if (req.header("x-api-key") !== SERVICE_API_KEY) {
        return res
            .status(401)
            .json({ error: "Missing or invalid x-api-key header." });
    }

    next();
}
app.post("/generate-flashcards", requireApiKey, async (req, res) => {
    const { notes } = req.body;

    // Validate input
    if (!notes || typeof notes !== "string" || !notes.trim()) {
        return res.status(400).json({ message: "Invalid Input" });
    }

    if (!process.env.GROQ_API_KEY) {
        return res.status(500).json({
            message: "Missing GROQ_API_KEY environment variable."
        });
    }

    try {
        const prompt = `
                    You are helping a student study by creating flashcards.

                    Read the following notes and generate useful flashcards
                    that cover the important concepts, definitions, and details.

                    Notes:
                    ${notes.trim()}

                    Return ONLY valid JSON in this exact format:

                    [
                        {
                            "question": "A question about the notes",
                            "answer": "The correct answer"
                        }
                    ]

                    Generate enough flashcards to cover the important information.
                    Make questions clear and answers concise.
                    Only use information supported by the notes.
                    `;

        const groqResponse = await fetch(
            "https://api.groq.com/openai/v1/chat/completions",
            {
                method: "POST",
                headers: {
                    Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    model: process.env.GROQ_MODEL,
                    messages: [
                        {
                            role: "system",
                            content:
                                "You are a helpful teaching assistant that creates accurate study flashcards."
                        },
                        {
                            role: "user",
                            content: prompt
                        }
                    ],
                    temperature: 0.2,
                    max_completion_tokens: 2000,
                    response_format: {
                        type: "json_object"
                    }
                })
            }
        );

        const groqData = await groqResponse.json();

        // Handle Groq API errors
        if (!groqResponse.ok) {
            console.error(groqData);

            return res.status(502).json({
                error: "Groq API request failed.",
                groqStatus: groqResponse.status,
                details: groqData
            });
        }

        const text = groqData.choices?.[0]?.message?.content?.trim() || "";

        // Parse generated JSON
        const parsed = JSON.parse(text);

        // Send flashcards
        res.status(200).json(parsed);
    } catch (err) {
        console.error(err);

        return res.status(500).json({
            error: err.message || "Internal Server Error during AI generation."
        });
    }
});

app.post("/low-mastery/:deckID", requireApiKey, async (req, res) => {
    const { deckID } = req.params;

    if (!deckID) {
        return res.status(401).json({ message: "Invalid Request" });
    }
    try {
        const [lowMasteryCards] = await pool.execute(
            `SELECT f.* FROM flashcards f 
                JOIN decks d ON f.deck_id = d.deck_id 
                WHERE d.deck_id = ? 
                AND f.mastery_score <  -2`,
            [deckID]
        );
        const prompt = `
                    You are helping a student study by creating flashcards.

                    The student is struggling with these flashcards an need more assistance on them.

                    Flashcards:
                    ${JSON.stringify(lowMasteryCards)}

                    Return ONLY valid JSON in this exact format:

                    [
                        {
                            "question": "A question about the notes",
                            "answer": "The correct answer"
                        }
                    ]

                    Generate enough flashcards to help the student understand these flash cards better.
                    Make questions clear and answers concise.
                    `;

        const groqResponse = await fetch(
            "https://api.groq.com/openai/v1/chat/completions",
            {
                method: "POST",
                headers: {
                    Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    model: process.env.GROQ_MODEL,
                    messages: [
                        {
                            role: "system",
                            content:
                                "You are a helpful teaching assistant that creates accurate study flashcards."
                        },
                        {
                            role: "user",
                            content: prompt
                        }
                    ],
                    temperature: 0.2,
                    max_completion_tokens: 2000,
                    response_format: {
                        type: "json_object"
                    }
                })
            }
        );

        const groqData = await groqResponse.json();

        // Handle Groq API errors
        if (!groqResponse.ok) {
            console.error(groqData);

            return res.status(502).json({
                error: "Groq API request failed.",
                groqStatus: groqResponse.status,
                details: groqData
            });
        }

        const text = groqData.choices?.[0]?.message?.content?.trim() || "";

        // Parse generated JSON
        const parsed = JSON.parse(text);

        // Send flashcards
        res.status(200).json(parsed);
    } catch (err) {
        console.error(err);

        return res.status(500).json({
            error: err.message || "Internal Server Error during AI generation."
        });
    }
});

app.listen(PORT, () => {
    console.log(`Groq Service running at http://localhost:${PORT}`);
});
