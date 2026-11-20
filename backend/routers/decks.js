import { Router } from "express";
import dotenv from "dotenv";

import pool from "../lib/db.js";
dotenv.config();
const decksRouter = Router();

decksRouter.post("/add", async (req, res) => {
    const { deck, title } = req.body;
    if (!deck || !Array.isArray(deck) || deck.length === 0) {
        return res.status(400).json({ message: "Invalid Request" });
    }
    try {
        const [deckResult] = await pool.query(
            `INSERT INTO decks (title) VALUES (?)`,
            [title]
        );
        const values = deck.map((card) => [card.question, card.answer, deckID]);
        const deckID = deckResult.insertId;
        if (!deckID) {
            throw new Error(deckResult.message);
        }
        const [result] = await pool.query(
            `
            INSERT INTO flashcards (question, answer, deck_id)
            VALUES ?
        `,
            [values]
        );

        res.status(201).json({
            message: "Flashcards added successfully",
            insertedCount: result.affectedRows
        });
    } catch (err) {
        console.error(err);

        return res.status(500).json({
            error: err.message || "Issue with insertion into database."
        });
    }
});

decksRouter.get("/", async (req, res) => {
    const { deckID } = req.query;

    try {
        const [result] = await pool.query(
            `SELECT * FROM decks ${deckID ? "WHERE deck_id = ?" : ""}`,
            deckID ? [deckID] : []
        );

        res.status(200).json(deckID ? result[0] : result);
    } catch (err) {
        console.error(err);

        return res.status(500).json({
            error: err.message || "Issue with insertion into database."
        });
    }
});
decksRouter.delete("/:id", async (req, res) => {
    const { id } = req.params;
    if (!id) {
        return res.status(400).json({ error: "Invalid Request!" });
    }
    try {
        const [result] = await pool.query(
            `DELETE FROM decks WHERE deck_id = ?}`,
            [id]
        );

        res.status(202).json({ message: "Sucessfully deleted deck!" });
    } catch (err) {
        console.error(err);

        return res.status(500).json({
            error: err.message || "Issue with insertion into database."
        });
    }
});
export default decksRouter;
