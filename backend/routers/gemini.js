import { Router } from "express";
import { GoogleGenAI } from "@google/genai";

const geminiRouter = Router();

const gemini = new GoogleGenAI({
    apiKey: process.env.GEMINI_API_KEY
});

gemini.post("/generate-flashcards", (req, res) => {});

gemini.get("/low-mastery", (req, res) => {});

export default geminiRouter;
