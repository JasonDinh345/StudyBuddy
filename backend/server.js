import express from "express";
import geminiRouter from "./routers/gemini";

const app = express();
app.use(express.json());

const PORT = 5000;
app.use("/gemini", geminiRouter);
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
