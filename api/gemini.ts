import { GoogleGenerativeAI } from "@google/generative-ai";

export default async function handler(req, res) {
  try {
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

    const model = genAI.getGenerativeModel({
      model: "gemini-1.5-flash",
    });

    const { type, input } = req.body;

    let prompt = "";

    if (type === "text") {
      prompt = input;
    } else if (type === "audio") {
      prompt = "Convert this lecture into structured study notes:\n" + input;
    }

    const result = await model.generateContent(prompt);

    res.status(200).json({
      title: "Generated Notes",
      summary: result.response.text(),
      keyTakeaways: [result.response.text()],
      structuredNotes: [],
      flashcards: [],
    });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}