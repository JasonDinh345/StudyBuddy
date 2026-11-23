export const INITIAL_DECKS = {
    "Java Collections": {
        cards: [
            {
                id: "java-1",
                question: "What does a constructor do in Java?",
                answer: "Initializes object & assigns values to its fields.",
                mastery_score: 0,
            },
            {
                id: "java-2",
                question: "What is the diff. between ArrayList & LinkedList?",
                answer: "ArrayList dynamic (fast random access), LinkedList doubly-linked nodes (fast insertions/deletions).",
                mastery_score: 0,
            },
            {
                id: "java-3",
                question: "What does HashMap class do?",
                answer: "Store key/value pairs w/ O(1) avg. time complexity for get & put.",
                mastery_score: 0,
            },
        ],
    },
    "Python Syntax": {
        cards: [
            {
                id: "py-1",
                question: "What is a lambda fnx. in Python?",
                answer: "Anonymous small fnx. defined using 'lambda' keyword",
                mastery_score: 0,
            },
            {
                id: "py-2",
                question: "How do list comprehensions work?",
                answer: "Provide concise way to create lists [expression for item in iterable if condition].",
                mastery_score: 0,
            },
            {
                id: "py-3",
                question: "What is difference between is and == in Python?",
                answer: "'is' checks memory address equality; '==' checks value equality.",
                mastery_score: 0,
            },
        ],
    },
    "Client/Server Programming": {
        cards: [
            {
                id: "cs-1",
                question: "What is the primary communication pattern used in client/server web apps?",
                answer: "Stateless request/response pattern over HTTP; client initiates a request & server processes it to send back a response.",
                mastery_score: 0,
            },
            {
                id: "cs-2",
                question: "Which 2 pieces of info in an HTTP request tell the server what action to perform & where?",
                answer: "HTTP method (GET, POST) defines requested operation; while resource URI identifies target resource on server.",
                mastery_score: 0,
            },
            {
                id: "cs-3",
                question: "How are responsibilities separated in a standard 3 tier web app. architecture?",
                answer: "Responsibilities split into top tier (UI/browser for input & display), middle tier (web server handling business logic), and a bottom tier (DB maintaining persistent data).",
                mastery_score: 0,
            },
        ],
    },
    "OS Basics": {
        cards: [
            {
                id: "os-1",
                question: "What is a proc. in an OS?",
                answer: "Program in execution, having its own mem space & sys resources",
                mastery_score: 0,
            },
            {
                id: "os-2",
                question: "What is a deadlock?",
                answer: "Situation where 2+ competing actions are waiting for the other to finish, causing infinite wait.",
                mastery_score: 0,
            },
            {
                id: "os-3",
                question: "What is VM?",
                answer: "Mem. management capability that uses hardware & software to map memory addresses.",
                mastery_score: 0,
            },
        ],
    },
};