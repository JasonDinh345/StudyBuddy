import dotenv from "dotenv";
import express from "express";
dotenv.config();
dotenv.config({ path: "../.env" });

const app = express();
const PORT = process.env.PORT || 3001;
const SERVICE_API_KEY = process.env.SERVICE_API_KEY || "tcss460-secret";
const DECKS_URL = process.env.DECKS_URL || "http://localhost:3002";
const GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions";
const GROQ_MODEL = process.env.GROQ_MODEL || "openai/gpt-oss-20b";
const MAX_STEPS = 5;
const GROQ_TIMEOUT_MS = 15000;
const SERVICE_TIMEOUT_MS = 8000;
const MAX_NOTES_LENGTH = 8000;
// Exclusive upper bound (< -1 selects mastery_score <= -2, ignoring a single -1 miss)
const LOW_MASTERY_THRESHOLD = -1;
app.use(express.json());
// Public health check for gateway monitoring
app.get("/health", (req, res) => {
    res.json({
        status: "ok",
        service: "groq-service",
        port: Number(PORT),
        mode: process.env.AI_MODE || "live",
    });
});

function requireApiKey(req, res, next) {
    if (req.header("x-api-key") !== SERVICE_API_KEY) {
        return res
            .status(401)
            .json({ error: "Missing or invalid x-api-key header." });
    }
    next();
}

function createHttpError(status, message) {
    const err = new Error(message);
    err.status = status;
    return err;
}
// Helper for calling decks-service over HTTP with x-api-key
async function callDecksService(path) {
    let response;
    try {
        response = await fetch(`${DECKS_URL}${path}`, {
            headers: { "x-api-key": SERVICE_API_KEY },
            signal: AbortSignal.timeout(SERVICE_TIMEOUT_MS),
        });
    } catch {
        throw createHttpError(
            502,
            "Could not reach decks-service to gather flashcard data."
        );
    }

    const data = await response.json().catch(() => ({}));
    if (response.status === 404) {
        throw createHttpError(404, data.error || "Requested deck was not found.");
    }
    if (!response.ok) {
        throw createHttpError(
            502,
            data.error || "decks-service returned an unexpected error."
        );
    }
    return data;
}

// Tool definitions exposed to Groq for agentic function calling
const toolSchemas = [
    {
        type: "function",
        function: {
            name: "getLowMasteryCards",
            description:
                "Fetch flashcards in a specific deck whose mastery_score is at or below -2 (exclusive threshold -1, " +
                "ignoring single -1 misses).",
            parameters: {
                type: "object",
                properties: {
                    deckId: {
                        type: "string",
                        description: "The ID of the active deck to inspect.",
                    },
                    threshold: {
                        type: "number",
                        description:
                            "Mastery score upper bound (exclusive). Defaults to -1 (which selects cards with mastery_score <= -2).",
                    },
                },
                required: ["deckId"],
            },
        },
    },
    {
        type: "function",
        function: {
            name: "getDeckDetails",
            description:
                "Fetch a deck's title and all existing flashcards so new drill questions stay on topic and never " +
                "duplicate existing cards.",
            parameters: {
                type: "object",
                properties: {
                    deckId: {
                        type: "string",
                        description: "The ID of the active deck.",
                    },
                },
                required: ["deckId"],
            },
        },
    },
];

// Server-side tool handlers (each calls decks-service via HTTP, never db.json)
const toolHandlers = {
    async getLowMasteryCards({ deckId, threshold = LOW_MASTERY_THRESHOLD }) {
        const numericThreshold =
            typeof threshold === "number" &&
            !Number.isNaN(threshold) &&
            threshold <= LOW_MASTERY_THRESHOLD
                ? threshold
                : LOW_MASTERY_THRESHOLD;
        const data = await callDecksService(
            `/cards/low-mastery?deckId=${encodeURIComponent(deckId)}&threshold=${encodeURIComponent(numericThreshold)}`
        );
        return {
            deckId,
            threshold: numericThreshold,
            cards: Array.isArray(data.cards) ? data.cards : [],
        };
    },

    async getDeckDetails({ deckId }) {
        const deck = await callDecksService(`/decks/${encodeURIComponent(deckId)}`);
        return {
            id: deck.id,
            title: deck.title,
            cards: Array.isArray(deck.cards) ? deck.cards : [],
        };
    },
};

// Shared upstream Groq caller with 15s timeout and 429/503 error mapping
async function callGroqChat(payload) {
    let response;
    try {
        response = await fetch(GROQ_API_URL, {
            method: "POST",
            headers: {
                Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
                "Content-Type": "application/json",
            },
            body: JSON.stringify(payload),
            signal: AbortSignal.timeout(GROQ_TIMEOUT_MS),
        });
    } catch (err) {
        if (err.name === "TimeoutError" || err.name === "AbortError") {
            throw createHttpError(
                503,
                "Groq AI request timed out. Please try again."
            );
        }
        throw createHttpError(
            503,
            "Groq AI service is temporarily unreachable."
        );
    }

    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
        console.error("Groq API error:", response.status, data);
        if (response.status === 429) {
            throw createHttpError(
                429,
                "Groq API rate limit exceeded. Please try again shortly."
            );
        }
        throw createHttpError(503, "Groq AI service is temporarily unavailable.");
    }

    return data;
}

// Parse and strictly validate structured flashcard output
function extractAndValidateCards(rawText) {
    if (!rawText || typeof rawText !== "string") {
        return null;
    }

    // Strip optional markdown code fences if a model wraps JSON
    const cleaned = rawText
        .trim()
        .replace(/^```(?:json)?\s*/i, "")
        .replace(/\s*```$/, "");

    let parsed;
    try {
        parsed = JSON.parse(cleaned);
    } catch {
        return null;
    }

    const candidateList = Array.isArray(parsed)
        ? parsed
        : Array.isArray(parsed?.cards)
            ? parsed.cards
            : Array.isArray(parsed?.flashcards)
                ? parsed.flashcards
                : null;

    if (!candidateList) {
        return null;
    }

    const validCards = candidateList
        .filter(
            (card) =>
                card &&
                typeof card.question === "string" &&
                card.question.trim().length > 0 &&
                typeof card.answer === "string" &&
                card.answer.trim().length > 0
        )
        .map((card) => ({
            question: card.question.trim(),
            answer: card.answer.trim(),
            ...(typeof card.sourceCardId === "string" && card.sourceCardId.trim()
                ? { sourceCardId: card.sourceCardId.trim() }
                : {}),
        }));

    return validCards;
}

// Build 3 to 4 realistic mock drill cards scoped strictly to the active deck
function buildMockRemedialCards(deckTitle, lowMasteryCards) {
    const prompts = [
        (card) => ({
            question: `[Mock Drill - ${deckTitle}] In your own words, explain: ${card.question}`,
            answer: card.answer,
            sourceCardId: card.id,
        }),
        (card) => ({
            question: `[Mock Drill - ${deckTitle}] What key takeaway should you recall for "${card.question}"?`,
            answer: `Core fact: ${card.answer}`,
            sourceCardId: card.id,
        }),
        (card) => ({
            question: `[Mock Drill - ${deckTitle}] How would you apply this concept in practice: ${card.question}`,
            answer: `Apply by remembering: ${card.answer}`,
            sourceCardId: card.id,
        }),
        (card) => ({
            question: `[Mock Drill - ${deckTitle}] Quick check — what common mistake happens with: ${card.question}`,
            answer: `Avoid confusion by recalling: ${card.answer}`,
            sourceCardId: card.id,
        }),
    ];

    const targetCount = Math.min(4, Math.max(3, lowMasteryCards.length));
    const drillCards = [];
    for (let i = 0; i < targetCount; i++) {
        const weakCard = lowMasteryCards[i % lowMasteryCards.length];
        const buildCard = prompts[i % prompts.length];
        drillCards.push(buildCard(weakCard));
    }
    return drillCards;
}

// Agentic remedial loop using both tools against decks-service
async function runRemedialAgent(deckId) {
    const toolsUsed = [];

    // Mock mode calls both real decks-service tools via HTTP without calling Groq
    if (process.env.AI_MODE === "mock") {
        const deckDetails = await toolHandlers.getDeckDetails({ deckId });
        toolsUsed.push({ tool: "getDeckDetails", args: { deckId } });

        const lowData = await toolHandlers.getLowMasteryCards({
            deckId,
            threshold: LOW_MASTERY_THRESHOLD,
        });
        toolsUsed.push({
            tool: "getLowMasteryCards",
            args: { deckId, threshold: LOW_MASTERY_THRESHOLD },
        });

        if (lowData.cards.length === 0) {
            return {
                deckId: deckDetails.id,
                deckTitle: deckDetails.title,
                cards: [],
                toolsUsed,
                message: "No weak cards at or below -2 in this deck yet!",
                aiGenerated: true,
                mock: true,
            };
        }

        const mockCards = buildMockRemedialCards(
            deckDetails.title,
            lowData.cards
        );
        return {
            deckId: deckDetails.id,
            deckTitle: deckDetails.title,
            cards: mockCards,
            toolsUsed,
            aiGenerated: true,
            mock: true,
        };
    }

    if (!process.env.GROQ_API_KEY) {
        throw createHttpError(
            503,
            "AI service is not configured (missing GROQ_API_KEY)."
        );
    }

    const messages = [
        {
            role: "system",
            content:
                "You are StudyBuddy's agentic study tutor. You MUST use the provided tools to inspect the exact deck " +
                "before answering. " +
                "Step 1: Call getDeckDetails(deckId) to read the deck title and all existing cards. " +
                `Step 2: Call getLowMasteryCards(deckId, threshold: ${LOW_MASTERY_THRESHOLD}) to retrieve cards with 
                mastery_score <= -2 in this deck. ` +
                "Strict rules: Stay 100% scoped to this deck's subject and NEVER invent cards from other subjects. " +
                "Never duplicate existing questions from getDeckDetails. " +
                "Even if only 1 card has mastery_score <= -2, generate 3 to 4 distinct, targeted remedial drill cards " +
                "that reinforce that weak concept from different angles. " +
                "Ground each card by including sourceCardId matching one of the real weak card IDs returned by " +
                "getLowMasteryCards. " +
                'When finished, return ONLY valid JSON in the exact format: { "cards": [ { "question": "...", ' +
                '"answer": "...", "sourceCardId": "..." } ] }.',
        },
        {
            role: "user",
            content: `Analyze deck "${deckId}" using your tools and generate 3 to 4 remedial practice flashcards for any 
            cards with mastery_score at or below -2.`,
        },
    ];
    let deckDetails = null;
    let lowMasteryCards = null;
    let finalText = "";
    for (let step = 0; step < MAX_STEPS; step++) {
        const groqData = await callGroqChat({
            model: GROQ_MODEL,
            messages,
            tools: toolSchemas,
            tool_choice: "auto",
            temperature: 0.2,
            max_completion_tokens: 1500,
        });
        const assistantMessage = groqData.choices?.[0]?.message;
        if (!assistantMessage) {
            throw createHttpError(503, "Groq returned an empty response.");
        }
        messages.push(assistantMessage);
        const toolCalls = assistantMessage.tool_calls;
        if (!toolCalls || toolCalls.length === 0) {
            finalText = assistantMessage.content || "";
            break;
        }
        for (const toolCall of toolCalls) {
            const fnName = toolCall.function?.name;
            const handler = toolHandlers[fnName];
            let parsedArgs = {};
            try {
                parsedArgs = toolCall.function?.arguments
                    ? JSON.parse(toolCall.function.arguments)
                    : {};
            } catch {
                parsedArgs = {};
            }
            // Force strict scoping to the requested deckId and -2 cutoff
            parsedArgs.deckId = deckId;
            if (fnName === "getLowMasteryCards") {
                parsedArgs.threshold = LOW_MASTERY_THRESHOLD;
            }
            if (!handler) {
                messages.push({
                    role: "tool",
                    tool_call_id: toolCall.id,
                    name: fnName || "unknown",
                    content: JSON.stringify({ error: `Unknown tool: ${fnName}` }),
                });
                continue;
            }
            const result = await handler(parsedArgs);
            toolsUsed.push({ tool: fnName, args: parsedArgs });
            if (fnName === "getDeckDetails") {
                deckDetails = result;
            } else if (fnName === "getLowMasteryCards") {
                lowMasteryCards = result.cards;
            }
            messages.push({
                role: "tool",
                tool_call_id: toolCall.id,
                name: fnName,
                content: JSON.stringify(result),
            });
        }
        // Short circuit cleanly if both tools ran and there are zero weak cards <= -2
        if (
            deckDetails &&
            Array.isArray(lowMasteryCards) &&
            lowMasteryCards.length === 0
        ) {
            return {
                deckId: deckDetails.id,
                deckTitle: deckDetails.title,
                cards: [],
                toolsUsed,
                message: "No weak cards at or below -2 in this deck yet!",
                aiGenerated: true,
            };
        }
    }
    // ensure deck metadata is known even if the model skipped one tool
    if (!deckDetails) {
        deckDetails = await toolHandlers.getDeckDetails({ deckId });
        toolsUsed.push({ tool: "getDeckDetails", args: { deckId } });
    }
    if (!Array.isArray(lowMasteryCards)) {
        const lowData = await toolHandlers.getLowMasteryCards({
            deckId,
            threshold: LOW_MASTERY_THRESHOLD,
        });
        lowMasteryCards = lowData.cards;
        toolsUsed.push({
            tool: "getLowMasteryCards",
            args: { deckId, threshold: LOW_MASTERY_THRESHOLD },
        });
    }
    if (lowMasteryCards.length === 0) {
        return {
            deckId: deckDetails.id,
            deckTitle: deckDetails.title,
            cards: [],
            toolsUsed,
            message: "No weak cards at or below -2 in this deck yet!",
            aiGenerated: true,
        };
    }

    // validate the models final text; if not valid JSON, run one strict json_object formatting pass
    let validCards = extractAndValidateCards(finalText);
    if (!validCards || validCards.length === 0) {
        messages.push({
            role: "user",
            content:
                'Return ONLY a valid JSON object matching { "cards": [ { "question": "...", "answer": "...", ' +
                '"sourceCardId": "..." } ] } with 3 to 4 remedial flashcards grounded only in the weak cards returned above.',
        });

        const formattedResp = await callGroqChat({
            model: GROQ_MODEL,
            messages,
            temperature: 0.2,
            max_completion_tokens: 1500,
            response_format: { type: "json_object" },
        });

        const formattedText =
            formattedResp.choices?.[0]?.message?.content || "";
        validCards = extractAndValidateCards(formattedText);
    }

    if (!validCards || validCards.length === 0) {
        throw createHttpError(
            503,
            "AI Agent could not produce valid structured flashcards. Please try again."
        );
    }
    // Ground every sourceCardId against real weak card IDs from decks-service
    const validWeakIds = new Set(lowMasteryCards.map((c) => c.id));
    const groundedCards = validCards.slice(0, 4).map((card, idx) => ({
        question: card.question,
        answer: card.answer,
        sourceCardId: validWeakIds.has(card.sourceCardId)
            ? card.sourceCardId
            : lowMasteryCards[idx % lowMasteryCards.length].id,
    }));

    return {
        deckId: deckDetails.id,
        deckTitle: deckDetails.title,
        cards: groundedCards,
        toolsUsed,
        aiGenerated: true,
    };
}
// Generate flashcards from raw pasted notes
app.post("/generate-flashcards", requireApiKey, async (req, res) => {
    const { notes } = req.body || {};
    if (!notes || typeof notes !== "string" || !notes.trim()) {
        return res.status(400).json({ error: "Notes input is required." });
    }
    if (notes.trim().length > MAX_NOTES_LENGTH) {
        return res.status(400).json({
            error: `Notes must be ${MAX_NOTES_LENGTH} characters or fewer.`,
        });
    }
    if (process.env.AI_MODE === "mock") {
        return res.status(200).json({
            cards: [
                {
                    question:
                        "[Mock] What does an API Gateway return when a microservice is stopped?",
                    answer: "502 Bad Gateway.",
                },
                {
                    question:
                        "[Mock] Why must microservices avoid sharing a database?",
                    answer:
                        "Each service owns its own data so services stay loosely coupled and communicate only through APIs.",
                },
            ],
            toolsUsed: [],
            aiGenerated: true,
            mock: true,
        });
    }
    if (!process.env.GROQ_API_KEY) {
        return res.status(503).json({
            error: "AI service is not configured (missing GROQ_API_KEY).",
        });
    }

    try {
        const prompt = `
You are helping a student study by creating flashcards.
Read the following notes and generate useful flashcards covering the important concepts, definitions, and details.

Notes:
${notes.trim()}

Return ONLY valid JSON in this exact format:
{
  "cards": [
    {
      "question": "A clear question about the notes",
      "answer": "A concise, accurate answer"
    }
  ]
}
Only use information supported by the notes.
`;

        const groqData = await callGroqChat({
            model: GROQ_MODEL,
            messages: [
                {
                    role: "system",
                    content:
                        "You are a helpful teaching assistant that creates accurate study flashcards.",
                },
                {
                    role: "user",
                    content: prompt,
                },
            ],
            temperature: 0.2,
            max_completion_tokens: 2000,
            response_format: { type: "json_object" },
        });

        const text = groqData.choices?.[0]?.message?.content?.trim() || "";
        const validCards = extractAndValidateCards(text);
        if (!validCards || validCards.length === 0) {
            return res.status(503).json({
                error: "AI service returned malformed flashcard data.",
            });
        }

        return res.status(200).json({
            cards: validCards,
            toolsUsed: [],
            aiGenerated: true,
        });
    } catch (err) {
        console.error("POST /generate-flashcards error:", err);
        return res.status(err.status || 500).json({
            error: err.message || "Internal Server Error during AI generation.",
        });
    }
});
// Agentic remedial drill endpoint using Groq tool calling
app.post("/low-mastery/:deckID", requireApiKey, async (req, res) => {
    const { deckID } = req.params;
    if (!deckID || !deckID.trim() || deckID.length > 100) {
        return res.status(400).json({ error: "Valid deckID parameter is required." });
    }

    try {
        const result = await runRemedialAgent(deckID.trim());
        return res.status(200).json(result);
    } catch (err) {
        console.error("POST /low-mastery/:deckID error:", err);
        return res.status(err.status || 500).json({
            error: err.message || "Internal Server Error during remedial AI run.",
        });
    }
});

app.use((req, res) => {
    res.status(404).json({ error: `No route for ${req.method} ${req.path}.` });
});

app.listen(PORT, () => {
    console.log(`Groq Service running at http://localhost:${PORT}`);
});