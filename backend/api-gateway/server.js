import express from "express";
import cors from "cors";
import dotenv from "dotenv";
dotenv.config({ path: "../.env" });
const app = express();
app.use(cors());
app.use(express.json());
const SERVICE_API_KEY = process.env.SERVICE_API_KEY || "tcss460-secret";
const SERVICES = {
    groq: process.env.GROG_URL || "http://localhost:3001",
    decks: process.env.DECKS_URL || "http://localhost:3002"
};
const PORT = process.env.PORT || 3000;

async function forward(res, serviceName, path, options = {}) {
    try {
        const response = await fetch(`${SERVICES[serviceName]}${path}`, {
            method: options.method || "GET",
            headers: {
                "Content-Type": "application/json",
                "x-api-key": SERVICE_API_KEY
            },
            body: options.body ? JSON.stringify(options.body) : undefined
        });

        const data = await response.json();
        res.status(response.status).json(data);
    } catch {
        res.status(502).json({
            error: `The API Gateway could not reach the ${serviceName} service.`
        });
    }
}
app.post("/api/groq/generate-flashcards", (req, res) => {
    forward(res, "groq", `/generate-flashcards`, {
        method: "POST",
        body: req.body
    });
});
app.post("/api/groq/low-mastery/:deckID", (req, res) => {
    forward(
        res,
        "groq",
        `/low-mastery/${encodeURIComponent(req.params.deckID)}`,
        {
            method: "POST"
        }
    );
});
app.post("/api/decks/add", (req, res) => {
    forward(res, "decks", `/add`, {
        method: "POST",
        body: res.body
    });
});
app.get("/api/decks/", (req, res) => {
    const query = req.query.deckID
        ? `?deckID=${encodeURIComponent(req.query.deckID)}`
        : "";
    forward(res, "decks", `/${query}`);
});
app.use((req, res) => {
    res.status(404).json({
        error: `No route for ${req.method} ${req.path}. See /docs.`
    });
});
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
