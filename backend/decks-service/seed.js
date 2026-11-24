import path from "node:path";
import { fileURLToPath } from "node:url";
import { mkdir } from "node:fs/promises";
import { JSONFilePreset } from "lowdb/node";

export const DEMO_USER_ID = "user_demo_1";

export const STARTER_USER = {
    id: DEMO_USER_ID,
    name: "Demo Student",
    email: "demo@studybuddy.edu",
};

export const STARTER_DECKS = [
    { id: "deck-java", userId: DEMO_USER_ID, title: "Java Collections", isStarter: true },
    { id: "deck-python", userId: DEMO_USER_ID, title: "Python Syntax", isStarter: true },
    { id: "deck-cs", userId: DEMO_USER_ID, title: "Client/Server Programming", isStarter: true },
    { id: "deck-os", userId: DEMO_USER_ID, title: "OS Basics", isStarter: true },
];

export const STARTER_FLASHCARDS = [
    // 5 cards for Java Collections
    {
        id: "java-1",
        deckId: "deck-java",
        userId: DEMO_USER_ID,
        question: "What does a constructor do in Java?",
        answer: "Initializes object & assigns values to its fields.",
        mastery_score: 1,
    },
    {
        id: "java-2",
        deckId: "deck-java",
        userId: DEMO_USER_ID,
        question: "What is the diff. between ArrayList & LinkedList?",
        answer: "ArrayList dynamic (fast random access), LinkedList doubly-linked nodes (fast insertions/deletions).",
        mastery_score: -2,
    },
    {
        id: "java-3",
        deckId: "deck-java",
        userId: DEMO_USER_ID,
        question: "What does HashMap class do?",
        answer: "Store key/value pairs w/ O(1) avg. time complexity for get & put.",
        mastery_score: -1,
    },
    {
        id: "java-4",
        deckId: "deck-java",
        userId: DEMO_USER_ID,
        question: "How does HashSet prevent duplicate elements in Java?",
        answer: "It uses hashCode() and equals() backed by a HashMap to ensure each stored element is unique.",
        mastery_score: 0,
    },
    {
        id: "java-5",
        deckId: "deck-java",
        userId: DEMO_USER_ID,
        question: "When should you choose TreeMap over HashMap?",
        answer: "When keys must stay sorted in natural or custom Comparator order with O(log n) lookup.",
        mastery_score: -3,
    },

    // 5 cards for Python Syntax
    {
        id: "py-1",
        deckId: "deck-python",
        userId: DEMO_USER_ID,
        question: "What is a lambda fnx. in Python?",
        answer: "Anonymous small fnx. defined using 'lambda' keyword",
        mastery_score: 0,
    },
    {
        id: "py-2",
        deckId: "deck-python",
        userId: DEMO_USER_ID,
        question: "How do list comprehensions work?",
        answer: "Provide concise way to create lists [expression for item in iterable if condition].",
        mastery_score: 2,
    },
    {
        id: "py-3",
        deckId: "deck-python",
        userId: DEMO_USER_ID,
        question: "What is difference between is and == in Python?",
        answer: "'is' checks memory address equality; '==' checks value equality.",
        mastery_score: -2,
    },
    {
        id: "py-4",
        deckId: "deck-python",
        userId: DEMO_USER_ID,
        question: "What is the difference between a list and a tuple in Python?",
        answer: "Lists are mutable and can be modified in place; tuples are immutable after creation.",
        mastery_score: 1,
    },
    {
        id: "py-5",
        deckId: "deck-python",
        userId: DEMO_USER_ID,
        question: "What does a Python generator using yield do?",
        answer: "Produces values lazily one at a time on demand without storing the full sequence in memory.",
        mastery_score: -1,
    },

    // 5 cards for Client/Server Programming
    {
        id: "cs-1",
        deckId: "deck-cs",
        userId: DEMO_USER_ID,
        question: "What is the primary communication pattern used in client/server web apps?",
        answer: "Stateless request/response pattern over HTTP; client initiates a request & server processes it to " +
            "send back a response.",
        mastery_score: 1,
    },
    {
        id: "cs-2",
        deckId: "deck-cs",
        userId: DEMO_USER_ID,
        question: "Which 2 pieces of info in an HTTP request tell the server what action to perform & where?",
        answer: "HTTP method (GET, POST) defines requested operation; while resource URI identifies target resource " +
            "on server.",
        mastery_score: 0,
    },
    {
        id: "cs-3",
        deckId: "deck-cs",
        userId: DEMO_USER_ID,
        question: "How are responsibilities separated in a standard 3 tier web app. architecture?",
        answer: "Responsibilities split into top tier (UI/browser for input & display), middle tier (web server " +
            "handling business logic), and a bottom tier (DB maintaining persistent data).",
        mastery_score: -2,
    },
    {
        id: "cs-4",
        deckId: "deck-cs",
        userId: DEMO_USER_ID,
        question: "When does an API Gateway return HTTP 502 Bad Gateway?",
        answer: "When the gateway tries to forward a request to a downstream microservice that is unreachable or " +
            "stopped.",
        mastery_score: -3,
    },
    {
        id: "cs-5",
        deckId: "deck-cs",
        userId: DEMO_USER_ID,
        question: "Why do internal microservices require an x-api-key header?",
        answer: "To ensure requests only come from trusted internal callers like the API Gateway and reject direct " +
            "browser calls with 401.",
        mastery_score: 0,
    },

    // 5 cards for OS Basics
    {
        id: "os-1",
        deckId: "deck-os",
        userId: DEMO_USER_ID,
        question: "What is a proc. in an OS?",
        answer: "Program in execution, having its own mem space & sys resources",
        mastery_score: 1,
    },
    {
        id: "os-2",
        deckId: "deck-os",
        userId: DEMO_USER_ID,
        question: "What is a deadlock?",
        answer: "Situation where 2+ competing actions are waiting for the other to finish, causing infinite wait.",
        mastery_score: -2,
    },
    {
        id: "os-3",
        deckId: "deck-os",
        userId: DEMO_USER_ID,
        question: "What is VM?",
        answer: "Mem. management capability that uses hardware & software to map memory addresses.",
        mastery_score: -1,
    },
    {
        id: "os-4",
        deckId: "deck-os",
        userId: DEMO_USER_ID,
        question: "How does a thread differ from a process?",
        answer: "Threads inside a process share memory space and open files, whereas each process has its own " +
            "isolated address space.",
        mastery_score: 0,
    },
    {
        id: "os-5",
        deckId: "deck-os",
        userId: DEMO_USER_ID,
        question: "What is a context switch in an operating system?",
        answer: "Saving the CPU state of the running process or thread and loading the saved state of the next " +
            "scheduled one.",
        mastery_score: -1,
    },
];

async function runSeed() {
    const dataDir = fileURLToPath(new URL("./data", import.meta.url));
    const dbPath = path.join(dataDir, "db.json");

    await mkdir(dataDir, { recursive: true });
    const db = await JSONFilePreset(dbPath, { users: [], decks: [], flashcards: [] });

    db.data = {
        users: [{ ...STARTER_USER }],
        decks: STARTER_DECKS.map((d) => ({ ...d })),
        flashcards: STARTER_FLASHCARDS.map((c) => ({ ...c })),
    };

    await db.write();
    console.log(
        `Seeded ${db.data.users.length} user, ${db.data.decks.length} decks, and ${db.data.flashcards.length} flashcards.`
    );
}

// Only overwrite db.json when run directly via node seed.js or npm run seed
const isDirectRun =
    process.argv[1] &&
    path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);

if (isDirectRun) {
    runSeed().catch((err) => {
        console.error("Seed failed:", err);
        process.exit(1);
    });
}