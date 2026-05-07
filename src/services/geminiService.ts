import { StudyGuide, PipelineStep } from "../types";

export async function processText(
  rawText: string,
  onProgress: (step: PipelineStep, message: string) => void
): Promise<StudyGuide> {

  onProgress(PipelineStep.STRUCTURING, "Sending text to backend...");

  const res = await fetch("/api/gemini", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      type: "text",
      input: rawText,
    }),
  });

  if (!res.ok) {
  const err = await res.text();
  throw new Error("Backend error: " + err);
}

  onProgress(PipelineStep.COMPLETED, "Study material ready!");
  return await res.json();
}


export async function processAudio(
  audioBase64: string,
  mimeType: string,
  onProgress: (step: PipelineStep, message: string) => void
): Promise<StudyGuide> {

  onProgress(PipelineStep.TRANSCRIBING, "Sending audio to backend...");

  const res = await fetch("/api/gemini", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      type: "audio",
      input: audioBase64,
      mimeType,
    }),
  });

  if (!res.ok) {
    throw new Error("Backend request failed");
  }

  onProgress(PipelineStep.COMPLETED, "Study material ready!");
  return await res.json();
}