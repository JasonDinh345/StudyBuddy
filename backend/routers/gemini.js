import { Router } from "express";
import dotenv from "dotenv";

import gemini from "../lib/gemini.js";
import pool from "../lib/db.js";
dotenv.config();
const geminiRouter = Router();
// POST /gemini/generate-flashcards w/ HTTP 400 validation
geminiRouter.post("/generate-flashcards", async (req, res) => {
    const { notes } = req.body;
    //validates input
    if (!notes || !notes.trim()) {
        return res.status(400).json({ message: "Invalid Input" });
    }
    //generates flashcards
    try {
        const generated = await gemini.models.generateContent({
            model: process.env.GEMINI_MODEL,
            contents: `
                Read the following user notes:
                "${notes.trim()}"

                Analyze the input and return various flashcards to help the user study:
            `,
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: "ARRAY",
                    items: {
                        type: "OBJECT",
                        properties: {
                            question: { type: "STRING" },
                            answer: { type: "STRING" }
                        },
                        required: ["question", "answer"]
                    }
                }
            }
        });

        const data = JSON.parse(generated.text);
        //sends array as json
        res.status(200).json(data);
    } catch (err) {
        console.error(err);

        return res.status(500).json({
            error: err.message || "Internal Server Error during AI generation."
        });
    }
});

geminiRouter.post("/low-mastery/:deckID", async (req, res) => {
    //const { userID } = req.user;
    const userID = 1;
    const { deckID } = req.params;

    if (!userID) {
        return res.status(401).json({ message: "Unauthorized Request" });
    } else if (!deckID) {
        return res.status(401).json({ message: "Invalid Request" });
    }
    try {
        const [lowMasteryCards] = await pool.execute(
            `SELECT f.* FROM flashcards f 
                JOIN decks d ON f.deck_id = d.deck_id 
                JOIN users u ON d.user_id = u.user_id 
                WHERE d.deck_id = ? 
                AND f.mastery_score <  -2  
                AND u.user_id = ?`,
            [deckID, userID]
        );

        const generated = await gemini.models.generateContent({
            model: process.env.GEMINI_MODEL,
            contents: `
                The user is struggling on these cards:
                "${JSON.stringify(lowMasteryCards)}"

                Generate more flashcards to help the user understand these cards more.
            `,
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: "ARRAY",
                    items: {
                        type: "OBJECT",
                        properties: {
                            question: { type: "STRING" },
                            answer: { type: "STRING" }
                        },
                        required: ["question", "answer"]
                    }
                }
            }
        });
        const data = JSON.parse(generated.text);
        //sends array as json
        res.status(200).json(data);
    } catch (err) {}
});

export default geminiRouter;
