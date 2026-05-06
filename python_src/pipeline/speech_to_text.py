import whisper
import os

def transcribe_audio(audio_file):
    # This would use OpenAI Whisper in a local context
    model = whisper.load_model("base")
    # Save temp file
    with open("temp_audio", "wb") as f:
        f.write(audio_file.read())
    result = model.transcribe("temp_audio")
    os.remove("temp_audio")
    return result["text"]
