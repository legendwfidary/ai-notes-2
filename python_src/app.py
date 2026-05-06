import streamlit as st
import os
from pipeline.speech_to_text import transcribe_audio
from pipeline.structuring import structure_notes
from pipeline.summarization import summarize_text
from pipeline.flashcards import generate_flashcards
from utils.pdf_export import export_pdf

st.set_page_config(page_title="Auto-Notes Architect", page_icon="🧠")

st.title("🧠 Auto-Notes Architect")
st.markdown("Convert messy lecture audio or transcripts into structured study material.")

tab1, tab2 = st.tabs(["📁 Upload Audio", "📝 Paste Text"])

with tab1:
    audio_file = st.file_uploader("Upload lecture audio", type=["mp3", "wav", "m4a"])

with tab2:
    text_input = st.text_area("Paste lecture transcript here", height=300)

if st.button("Generate Notes"):
    with st.status("Architecting Study Guide...", expanded=True) as status:
        transcript = ""
        if audio_file:
            st.write("Transcribing audio...")
            transcript = transcribe_audio(audio_file)
        else:
            transcript = text_input
            
        if transcript:
            st.write("Structuring notes...")
            notes = structure_notes(transcript)
            
            st.write("Summarizing content...")
            summary = summarize_text(transcript)
            
            st.write("Creating flashcards...")
            cards = generate_flashcards(transcript)
            
            st.session_state['result'] = {
                'notes': notes,
                'summary': summary,
                'cards': cards,
                'title': "Lecture Study Guide"
            }
            status.update(label="Architecting Complete!", state="complete")
        else:
            st.error("Please provide input.")

if 'result' in st.session_state:
    res = st.session_state['result']
    st.divider()
    st.header(res['title'])
    
    st.subheader("Summary")
    st.write(res['summary'])
    
    st.subheader("Structured Notes")
    st.write(res['notes'])
    
    st.subheader("Flashcards")
    for card in res['cards']:
        with st.expander(card['q']):
            st.write(card['a'])
            
    col1, col2 = st.columns(2)
    with col1:
        st.download_button("Download PDF", data="pdf_bytes", file_name="notes.pdf")
    with col2:
        st.download_button("Download TXT", data="notes_text", file_name="notes.txt")
