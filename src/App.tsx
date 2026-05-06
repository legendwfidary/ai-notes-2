/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef } from 'react';
import { 
  FileAudio, 
  FileText, 
  Download, 
  CheckCircle2, 
  Loader2, 
  BrainCircuit, 
  Cpu, 
  Upload,
  X,
  Plus
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from './lib/utils';
import { PipelineStep, StudyGuide, PipelineProgress } from './types';
import { processAudio, processText } from './services/geminiService';
import { exportToPDF, exportToTXT } from './utils/exportUtils';
import ReactMarkdown from 'react-markdown';

// --- Components ---

const PipelineIndicator = ({ currentStep }: { currentStep: PipelineStep }) => {
  const steps = [
    { id: PipelineStep.TRANSCRIBING, label: 'Transcribe', num: 1 },
    { id: PipelineStep.CLEANING, label: 'NLP Clean', num: 2 },
    { id: PipelineStep.STRUCTURING, label: 'Structure', num: 3 },
    { id: PipelineStep.COMPLETED, label: 'Export', num: 4 }
  ];
  
  const getStepStatus = (s: PipelineStep) => {
    const sequence = [
      PipelineStep.IDLE,
      PipelineStep.PREPARING,
      PipelineStep.TRANSCRIBING,
      PipelineStep.CLEANING,
      PipelineStep.STRUCTURING,
      PipelineStep.FINALIZING,
      PipelineStep.COMPLETED
    ];
    const currentIndex = sequence.indexOf(currentStep);
    const targetIndex = sequence.indexOf(s);

    if (currentStep === PipelineStep.COMPLETED) return 'completed';
    if (targetIndex < currentIndex) return 'completed';
    if (targetIndex === currentIndex) return 'active';
    if (currentIndex > targetIndex) return 'completed'; // For steps missed by simple indexOf
    return 'pending';
  };

  return (
    <div className="flex gap-8">
      {steps.map((s, i) => {
        const status = getStepStatus(s.id);
        const isActive = status === 'active';
        const isCompleted = status === 'completed';

        return (
          <div key={s.id} className={cn(
            "flex items-center gap-2 relative",
            i < steps.length - 1 && "after:content-[''] after:absolute after:-right-6 after:top-1/2 after:w-4 after:h-px after:bg-slate-200"
          )}>
            <div className={cn(
              "w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold transition-all duration-300",
              isCompleted && "bg-emerald-100 text-emerald-700",
              isActive && "bg-slate-900 text-white scale-110",
              status === 'pending' && "bg-slate-100 text-slate-400"
            )}>
              {isCompleted ? <CheckCircle2 className="w-3 h-3" /> : s.num}
            </div>
            <span className={cn(
              "text-xs font-semibold whitespace-nowrap",
              isActive ? "text-slate-900 font-bold" : "text-slate-400"
            )}>
              {s.label}
            </span>
          </div>
        );
      })}
    </div>
  );
};

export default function App() {
  const [activeTab, setActiveTab] = useState<'upload' | 'text'>('upload');
  const [pipeline, setPipeline] = useState<PipelineProgress>({ step: PipelineStep.IDLE, message: '' });
  const [studyGuide, setStudyGuide] = useState<StudyGuide | null>(null);
  const [inputText, setInputText] = useState('');
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setAudioFile(e.target.files[0]);
    }
  };

  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => {
        const base64 = (reader.result as string).split(',')[1];
        resolve(base64);
      };
      reader.onerror = error => reject(error);
    });
  };

  const startProcessing = async () => {
    setStudyGuide(null);
    try {
      if (activeTab === 'upload' && audioFile) {
        setPipeline({ step: PipelineStep.PREPARING, message: "Reading audio..." });
        const base64 = await fileToBase64(audioFile);
        const guide = await processAudio(base64, audioFile.type, (step, message) => setPipeline({ step, message }));
        setStudyGuide(guide);
      } else if (activeTab === 'text' && inputText) {
        setPipeline({ step: PipelineStep.PREPARING, message: "Parsing text..." });
        const guide = await processText(inputText, (step, message) => setPipeline({ step, message }));
        setStudyGuide(guide);
      }
    } catch (err) {
      let errorMessage = "System failure occurred during processing.";
      if (err instanceof Error && err.message.includes("MISSING_API_KEY")) {
        errorMessage = "Configuration Error: GEMINI_API_KEY not found. Please check your Secrets.";
      } else if (err instanceof Error) {
        errorMessage = `Error: ${err.message}`;
      }
      setPipeline({ step: PipelineStep.ERROR, message: errorMessage });
      console.error(err);
    }
  };

  const isProcessing = pipeline.step !== PipelineStep.IDLE && pipeline.step !== PipelineStep.COMPLETED && pipeline.step !== PipelineStep.ERROR;

  return (
    <div className="flex h-screen w-full bg-slate-200 p-2 md:p-4 lg:p-8 overflow-hidden font-sans">
      <div className="flex h-full w-full bg-slate-50 text-slate-900 rounded-3xl border-8 border-slate-200 overflow-hidden shadow-2xl relative">
        
        {/* Sidebar */}
        <aside className="w-80 flex-shrink-0 bg-white border-r border-slate-200 flex flex-col p-6 overflow-y-auto scrollbar-hide">
          <div className="flex items-center gap-3 mb-12">
            <div className="w-11 h-11 bg-slate-900 flex items-center justify-center rounded-full shadow-lg transform -rotate-6">
              <BrainCircuit className="text-white w-6 h-6" />
            </div>
            <div>
              <h1 className="font-serif font-black italic text-2xl leading-none -tracking-tight text-slate-900">AutoNotes</h1>
              <p className="text-[10px] text-slate-500 font-medium tracking-wide">Personal Study Secretary</p>
            </div>
          </div>

          <div className="space-y-6 flex-grow">
            <section>
              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2">Lecture Source</label>
              <div 
                className={cn(
                  "border-2 border-dashed border-slate-200 rounded-xl p-6 flex flex-col items-center justify-center text-center cursor-pointer hover:bg-slate-50 transition-all",
                  audioFile && "bg-slate-900 text-white border-slate-900"
                )}
                onClick={() => fileInputRef.current?.click()}
              >
                <input 
                  type="file" 
                  className="hidden" 
                  ref={fileInputRef} 
                  onChange={handleFileChange}
                  accept="audio/*"
                />
                {audioFile ? (
                  <>
                    <FileAudio className="w-6 h-6 mb-2" />
                    <p className="text-xs font-bold truncate max-w-[150px]">{audioFile.name}</p>
                    <button 
                      onClick={(e) => { e.stopPropagation(); setAudioFile(null); }}
                      className="mt-2 text-[10px] font-bold text-slate-400 hover:text-white uppercase transition-colors"
                    >
                      Remove
                    </button>
                  </>
                ) : (
                  <>
                    <Upload className="w-6 h-6 text-slate-400 mb-2" />
                    <p className="text-sm font-medium">Upload Audio</p>
                    <p className="text-[10px] text-slate-400">MP3, WAV, MA4</p>
                  </>
                )}
              </div>
            </section>

            <section>
              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2">Text Override</label>
              <textarea 
                className="w-full h-32 bg-slate-50 border border-slate-200 rounded-lg p-3 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900 resize-none font-sans" 
                placeholder="Paste transcript here..."
                value={inputText}
                onChange={(e) => {
                    setInputText(e.target.value);
                    if(e.target.value) setActiveTab('text');
                }}
              />
            </section>

            <button 
              onClick={startProcessing}
              disabled={isProcessing || (!audioFile && !inputText)}
              className="w-full bg-slate-900 text-white font-bold py-4 rounded-xl shadow-lg hover:shadow-xl transition-all active:scale-95 flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {isProcessing ? (
                <span className="flex items-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin" />
                   PROCESSING...
                </span>
              ) : (
                <>
                  <span>BUILD SYLLABUS</span>
                  <Plus className="w-4 h-4" />
                </>
              )}
            </button>
          </div>

          <div className="mt-8 p-4 bg-slate-50 rounded-xl border border-slate-200">
            <div className="flex justify-between items-center mb-2">
              <span className="text-[10px] font-bold text-slate-500">SYSTEM STATUS</span>
              <div className="flex gap-1">
                <span className={cn("w-1.5 h-1.5 rounded-full", isProcessing ? "bg-blue-500 animate-pulse" : "bg-emerald-500")} />
                <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full" />
              </div>
            </div>
            <p className="text-[10px] font-mono text-slate-500 leading-tight">
              {pipeline.message || "Engine Idle - Ready for Input"}
              <br />
              Latency: {isProcessing ? "Active" : "0ms"}
            </p>
          </div>
        </aside>

        {/* Main Content Area */}
        <main className="flex-grow flex flex-col overflow-hidden bg-slate-50">
          <header className="h-20 bg-white border-b border-slate-200 px-8 flex items-center justify-between flex-shrink-0">
            <PipelineIndicator currentStep={pipeline.step} />
            
            <div className="flex gap-3">
              <button 
                onClick={() => studyGuide && exportToPDF(studyGuide)}
                disabled={!studyGuide}
                className="flex items-center gap-2 px-4 py-2 border border-slate-200 rounded-lg text-xs font-bold hover:bg-slate-50 disabled:opacity-30 disabled:hover:bg-transparent transition-all"
              >
                <Download className="w-3 h-3" /> PDF
              </button>
              <button 
                onClick={() => studyGuide && exportToTXT(studyGuide)}
                disabled={!studyGuide}
                className="flex items-center gap-2 px-4 py-2 border border-slate-200 rounded-lg text-xs font-bold hover:bg-slate-50 disabled:opacity-30 disabled:hover:bg-transparent transition-all"
              >
                <FileText className="w-3 h-3" /> TXT
              </button>
            </div>
          </header>

          <div className="flex-grow p-8 overflow-y-auto scrollbar-hide">
            <AnimatePresence mode="wait">
              {!studyGuide ? (
                <motion.div 
                  key="empty"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.98 }}
                  className="h-full flex flex-col items-center justify-center text-center p-12"
                >
                  <div className="w-16 h-16 bg-slate-100 rounded-2xl flex items-center justify-center mb-6 rotate-3">
                    <Cpu className="w-8 h-8 text-slate-300" />
                  </div>
                  <h2 className="text-xl font-bold text-slate-400 mb-2 uppercase tracking-tight">Project Architect Pending</h2>
                  <p className="text-slate-400 text-xs max-w-xs font-medium">Input audio or text to initiate cognitive decomposition and study guide generation.</p>
                </motion.div>
              ) : (
                <motion.div 
                  key="guide"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="grid grid-cols-12 gap-8"
                >
                  {/* Left Results: Notes */}
                  <div className="col-span-12 lg:col-span-8 flex flex-col bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                    <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                      <h2 className="font-bold tracking-tight text-sm uppercase text-slate-900">Structured Study Notes</h2>
                      <span className="text-[10px] bg-white border border-slate-200 px-2 py-1 rounded font-bold text-slate-500 uppercase truncate max-w-[200px]">
                        Subject: {studyGuide.title}
                      </span>
                    </div>
                    
                    <div className="p-8 space-y-12">
                      <section className="space-y-4">
                        <div className="flex items-center gap-3">
                          <div className="h-1 w-8 bg-slate-900 rounded-full" />
                          <h3 className="font-mono text-[10px] font-bold text-slate-400 uppercase tracking-widest">Executive Summary</h3>
                        </div>
                        <div className="text-sm text-slate-600 leading-relaxed font-medium whitespace-pre-wrap">
                          <ReactMarkdown
                            components={{
                              p: ({ children }) => <p className="mb-4 last:mb-0">{children}</p>,
                              ul: ({ children }) => <ul className="list-disc ml-4 mb-4 space-y-1">{children}</ul>,
                              li: ({ children }) => <li>{children}</li>,
                            }}
                          >
                            {studyGuide.summary}
                          </ReactMarkdown>
                        </div>
                      </section>

                      {studyGuide.structuredNotes.map((note, i) => (
                        <div key={i} className="space-y-4 pt-10 border-t border-slate-100">
                          <h3 className="text-xl font-bold text-slate-800 flex items-baseline gap-3">
                            <span className="text-slate-200 font-serif italic text-2xl">{i + 1}.</span>
                            {note.title}
                          </h3>
                          <p className="text-sm text-slate-600 leading-relaxed">{note.content}</p>
                          {note.subtopics && note.subtopics.length > 0 && (
                            <ul className="grid grid-cols-1 md:grid-cols-2 gap-4 ml-4">
                              {note.subtopics.map((sub, j) => (
                                <li key={j} className="flex gap-3">
                                  <div className="w-1.5 h-1.5 bg-slate-900 rounded-full mt-1.5 flex-shrink-0" />
                                  <div>
                                    <p className="text-[11px] font-bold uppercase tracking-wider text-slate-900">{sub.title}</p>
                                    <p className="text-xs text-slate-400 leading-relaxed">{sub.content}</p>
                                  </div>
                                </li>
                              ))}
                            </ul>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Right Results: Takeaways & Cards */}
                  <div className="col-span-12 lg:col-span-4 flex flex-col gap-8">
                    {/* Key Takeaways */}
                    <div className="bg-slate-900 text-white rounded-2xl p-6 shadow-xl">
                      <h2 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-6 flex items-center gap-2">
                         <span className="w-2 h-2 bg-emerald-400 rounded-full" />
                         Key Takeaways
                      </h2>
                      <ul className="space-y-4">
                        {studyGuide.keyTakeaways.map((item, i) => (
                          <li key={i} className="flex gap-3 text-sm group">
                            <span className="text-emerald-400 font-mono text-[10px] mt-1 opacity-40 group-hover:opacity-100 transition-opacity">0{i+1}</span>
                            <span className="text-slate-300 font-medium leading-snug">{item}</span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    {/* Active Recall */}
                    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 flex flex-col">
                      <h2 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-6">Active Recall Flashcards</h2>
                      <div className="space-y-4">
                        {studyGuide.flashcards.map((card, i) => (
                          <div key={i} className="group cursor-pointer">
                            <div className="bg-slate-50 p-5 rounded-xl border border-slate-100 transition-all hover:bg-slate-100 group-active:scale-[0.98]">
                              <p className="text-[10px] font-bold text-slate-400 mb-2 uppercase tracking-wide">CARD #0{i+1}</p>
                              <p className="text-sm font-bold text-slate-800 mb-3 leading-tight">{card.question}</p>
                              <div className="h-px bg-slate-200 mb-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                              <p className="text-xs text-slate-500 italic opacity-0 group-hover:opacity-100 transition-all transform translate-y-1 group-hover:translate-y-0">
                                {card.answer}
                              </p>
                              <div className="mt-2 flex items-center gap-1 text-[9px] font-bold text-slate-300 uppercase group-hover:hidden">
                                <Plus className="w-2 h-2" /> Hover to reveal
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </main>
      </div>
    </div>
  );
}

