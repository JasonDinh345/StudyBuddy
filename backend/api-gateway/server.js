import express from "express";
import cors from "cors";
import dotenv from "dotenv";
// check for a .env file in api-gateway first; if missing, use shared backend/.env
dotenv.config();
dotenv.config({ path: "../.env" });
const app = express();
app.use(cors());
app.use(express.json());
const SERVICE_API_KEY = process.env.SERVICE_API_KEY || "tcss460-secret";
const SERVICES = {
    groq: process.env.GROQ_URL || "http://localhost:3001",
    decks: process.env.DECKS_URL || "http://localhost:3002"
};
const PORT = process.env.PORT || 3000;

async function forward(res, serviceName, targetPath, options = {}) {
    try {
        const response = await fetch(`${SERVICES[serviceName]}${targetPath}`, {
            method: options.method || "GET",
            headers: {
                "Content-Type": "application/json",
                "x-api-key": SERVICE_API_KEY
            },
            body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
        });

        // Pass 204 No Content through without trying to parse an empty body
        if (response.status === 204) {
            return res.status(204).send();
        }

        const rawText = await response.text();
        let data = {};
        if (rawText) {
            try {
                data = JSON.parse(rawText);
            } catch {
                data = { error: rawText };
            }
        }

        return res.status(response.status).json(data);
    } catch {
        return res.status(502).json({
            error: `The API Gateway could not reach the ${serviceName} service.`
        });
    }
}
// Aggregated health check across all downstream services
app.get("/api/health", async (req, res) => {
    const services = {};
    for (const [name, url] of Object.entries(SERVICES)) {
        try {
            const response = await fetch(`${url}/health`);
            services[name] = response.ok ? "up" : "down";
        } catch {
            services[name] = "down";
        }
    }
    const allUp = Object.values(services).every((status) => status === "up");
    res.status(allUp ? 200 : 503).json({ gateway: "up", services });
});
// Groq AI routes
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
            method: "POST",
            body: req.body,
        }
    );
});
// Decks and flashcards routes
app.get("/api/decks", (req, res) => {
    const qs = req.query.userId
        ? `?userId=${encodeURIComponent(req.query.userId)}`
        : "";
    forward(res, "decks", `/decks${qs}`);
});
// Must come before /api/decks/:deckId
app.post("/api/decks/restore-starter", (req, res) => {
    forward(res, "decks", "/decks/restore-starter", { method: "POST" });
});

app.get("/api/decks/:deckId", (req, res) => {
    forward(res, "decks", `/decks/${encodeURIComponent(req.params.deckId)}`);
});

app.post("/api/decks", (req, res) => {
    forward(res, "decks", "/decks", {
        method: "POST",
        body: req.body,
    });
});

app.put("/api/decks/:deckId", (req, res) => {
    forward(res, "decks", `/decks/${encodeURIComponent(req.params.deckId)}`, {
        method: "PUT",
        body: req.body,
    });
});

app.delete("/api/decks/:deckId", (req, res) => {
    forward(res, "decks", `/decks/${encodeURIComponent(req.params.deckId)}`, {
        method: "DELETE",
    });
});

app.post("/api/decks/:deckId/cards", (req, res) => {
    forward(
        res,
        "decks",
        `/decks/${encodeURIComponent(req.params.deckId)}/cards`,
        {
            method: "POST",
            body: req.body,
        }
    );
});

app.get("/api/cards/low-mastery", (req, res) => {
    const params = new URLSearchParams();
    if (req.query.userId) params.set("userId", req.query.userId);
    if (req.query.deckId) params.set("deckId", req.query.deckId);
    if (req.query.threshold !== undefined) params.set("threshold", req.query.threshold);
    const qs = params.toString() ? `?${params.toString()}` : "";
    forward(res, "decks", `/cards/low-mastery${qs}`);
});

app.patch("/api/cards/:cardId", (req, res) => {
    forward(res, "decks", `/cards/${encodeURIComponent(req.params.cardId)}`, {
        method: "PATCH",
        body: req.body,
    });
});
app.use((req, res) => {
    res.status(404).json({
        error: `No route for ${req.method} ${req.path}. See /docs.`
    });
});
app.use((err, req, res, next) => {
    res.status(err.status || 400).json({ error: "Request body is not valid JSON." });
});
app.listen(PORT, () => console.log(`API Gateway running on port ${PORT}`));
