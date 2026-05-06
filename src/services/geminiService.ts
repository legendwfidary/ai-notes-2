import { GoogleGenAI, Type } from "@google/genai";
import { StudyGuide, PipelineStep } from "../types";

let aiInstance: GoogleGenAI | null = null;

const getAI = () => {
  if (aiInstance) return aiInstance;
  
  const key = process.env.GEMINI_API_KEY;

  if (!key) {
    throw new Error("MISSING_API_KEY: Please configure GEMINI_API_KEY in the AI Studio Settings (Secrets) menu.");
  }
  
  aiInstance = new GoogleGenAI({ apiKey: key });
  return aiInstance;
};

export async function processAudio(
  audioBase64: string, 
  mimeType: string,
  onProgress: (step: PipelineStep, message: string) => void
): Promise<StudyGuide> {
  const modelName = "gemini-3-flash-preview";

  try {
    const ai = getAI();
    
    // 1. Transcription & Cleaning
    onProgress(PipelineStep.TRANSCRIBING, "Transcribing audio and cleaning text...");
    
    const transcriptionResponse = await ai.models.generateContent({
      model: modelName,
      contents: [
        {
          role: "user",
          parts: [
            { text: "Transcript this lecture audio accurately into clear, readable text. Remove filler words (um, ah, like) and noise. Return ONLY the cleaned transcript text without any markdown or formatting." },
            { inlineData: { data: audioBase64, mimeType } }
          ]
        }
      ]
    });
    
    const transcript = transcriptionResponse.text || "";

    if (!transcript || transcript.length < 10) {
        throw new Error("Transcription failed: Empty or too short response from model.");
    }

    return await processText(transcript, onProgress);
  } catch (error) {
    console.error("Gemini Audio Error:", error);
    throw error;
  }
}

export async function processText(
  rawText: string,
  onProgress: (step: PipelineStep, message: string) => void
): Promise<StudyGuide> {
  const modelName = "gemini-3-flash-preview";

  try {
    const ai = getAI();
    
    // 2. Structuring & NLP Processing
    onProgress(PipelineStep.STRUCTURING, "Analyzing topics and structuring notes...");
    
    const response = await ai.models.generateContent({
      model: modelName,
      contents: `You are an expert academic assistant. Your task is to generate a comprehensive, structured study guide from the provided lecture transcript.
      
      Transcript:
      "${rawText}"
      
      Generate a JSON object following this EXACT schema:
      {
        "title": "Main Lecture Title",
        "summary": "2-3 paragraphs summarizing the core concepts in markdown format.",
        "keyTakeaways": ["list of 5-8 major critical points"],
        "structuredNotes": [
          {
            "title": "Major Topic Title",
            "content": "Description of the topic",
            "subtopics": [
              { "title": "Subtopic Title", "content": "Details" }
            ]
          }
        ],
        "flashcards": [
          { "question": "Question text?", "answer": "Concise answer." }
        ]
      }
      
      Ensure the output is valid JSON. Use markdown within the summary strings for formatting.`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            title: { type: Type.STRING },
            summary: { type: Type.STRING },
            keyTakeaways: { type: Type.ARRAY, items: { type: Type.STRING } },
            structuredNotes: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  title: { type: Type.STRING },
                  content: { type: Type.STRING },
                  subtopics: {
                    type: Type.ARRAY,
                    items: {
                       type: Type.OBJECT,
                       properties: {
                         title: { type: Type.STRING },
                         content: { type: Type.STRING }
                       }
                    }
                  }
                },
                required: ["title", "content"]
              }
            },
            flashcards: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  question: { type: Type.STRING },
                  answer: { type: Type.STRING }
                },
                required: ["question", "answer"]
              }
            }
          },
          required: ["title", "summary", "keyTakeaways", "structuredNotes", "flashcards"]
        }
      }
    });

    onProgress(PipelineStep.COMPLETED, "Study material ready!");
    
    const text = response.text || "{}";
    const cleanJson = text.replace(/^```json\n?/, "").replace(/\n?```$/, "").trim();
    
    try {
        return JSON.parse(cleanJson) as StudyGuide;
    } catch (parseError) {
        console.error("JSON Parsing Error:", parseError, "Raw Text:", text);
        throw new Error("Failed to parse the structured response from Gemini.");
    }

  } catch (error) {
    console.error("Gemini Processing Error:", error);
    throw error;
  }
}
