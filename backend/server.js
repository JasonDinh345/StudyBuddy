import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import groqRouter from "./routers/groq.js";
dotenv.config();
const app = express();
app.use(cors());
app.use(express.json());

const PORT = 3000;
app.use("/api/groq", groqRouter);
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
