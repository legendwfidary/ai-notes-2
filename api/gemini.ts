import { GoogleGenerativeAI } from "@google/generative-ai";

// 🔁 Retry logic for 503 / overload errors
async function generateWithRetry(model, prompt, retries = 3) {
  for (let i = 0; i < retries; i++) {
    try {
      return await model.generateContent(prompt);
    } catch (err) {
      console.error(`Attempt ${i + 1} failed`, err);

      if (i === retries - 1) throw err;

      // exponential backoff
      await new Promise((res) => setTimeout(res, 1000 * (i + 1)));
    }
  }
}

export default async function handler(req, res) {
  try {
    // ✅ Fix request body parsing (Vercel issue)
    const body =
      typeof req.body === "string" ? JSON.parse(req.body) : req.body;

    const { type, input } = body || {};

    // ✅ Validate input
    if (!input) {
      return res.status(400).json({ error: "Missing input" });
    }

    // ✅ Check API key exists
    if (!process.env.GEMINI_API_KEY) {
      return res.status(500).json({ error: "Missing API key in environment" });
    }

    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

    const model = genAI.getGenerativeModel({
      model: "gemini-1.5-flash", // stable + fast
    });

    // 🔥 Trim input to improve speed
    const trimmedInput = input.slice(0, 10000);

    // 🔥 Optimized prompt (fast + reliable)
    let prompt = "";

    if (type === "text") {
      prompt = `
You are an expert academic assistant.

Convert the following lecture into structured study material.

Return ONLY valid JSON in this format:
{
  "title": "Lecture Title",
  "summary": "2-3 paragraph summary",
  "keyTakeaways": ["point1", "point2"],
  "structuredNotes": [
    {
      "title": "Topic",
      "content": "Explanation",
      "subtopics": [
        { "title": "Subtopic", "content": "Details" }
      ]
    }
  ],
  "flashcards": [
    { "question": "Q?", "answer": "A" }
  ]
}

Lecture:
${trimmedInput}
`;
    } else if (type === "audio") {
      prompt = `
Convert this lecture transcript into structured study notes in JSON format.

Transcript:
${trimmedInput}
`;
    }

    // 🔁 Call with retry
    const result = await generateWithRetry(model, prompt);

    const text = result.response.text() || "";

    // ✅ Extract JSON safely
    const match = text.match(/\{[\s\S]*\}/);

    if (!match) {
      console.error("RAW RESPONSE:", text);
      throw new Error("No valid JSON found in response");
    }

    let parsed;
    try {
      parsed = JSON.parse(match[0]);
    } catch (err) {
      console.error("JSON PARSE ERROR:", err);
      console.error("RAW TEXT:", text);
      throw new Error("Failed to parse structured response from Gemini");
    }

    // ✅ Return clean structured response
    return res.status(200).json(parsed);

  } catch (err) {
    console.error("🔥 API ERROR:", err);

    return res.status(500).json({
      error: err.message || "Internal server error",
    });
  }
}