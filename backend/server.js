import express from "express";
import cors from "cors";
import geminiRouter from "./routers/gemini.js";

const app = express();
app.use(cors());
app.use(express.json());

const PORT = 3000;
app.use("/gemini", geminiRouter);
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
