import React, { useState, useRef, useEffect } from 'react';
import { AnalysisResult, ChatMessage } from '../types';
import { createListingChat } from '../services/geminiService';
import { Chat } from '@google/genai';

interface Props {
  result: AnalysisResult;
  listingContent: string;
  onReset: () => void;
}

const AnalysisView: React.FC<Props> = ({ result, listingContent, onReset }) => {
  const [activeTab, setActiveTab] = useState<'analysis' | 'chat'>('analysis');
  const [chatSession, setChatSession] = useState<Chat | null>(null);
  
  const [messages, setMessages] = useState<ChatMessage[]>([
    { role: 'model', text: 'I\'ve memorized the listing details. What do you need to know?' }
  ]);
  const [inputMsg, setInputMsg] = useState('');
  const [isSending, setIsSending] = useState(false);
  const chatBottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!chatSession) {
      setChatSession(createListingChat(listingContent));
    }
  }, [listingContent]);

  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, activeTab]);

  const handleSendMessage = async () => {
    if (!inputMsg.trim() || !chatSession) return;
    
    const userText = inputMsg;
    setInputMsg('');
    setMessages(prev => [...prev, { role: 'user', text: userText }]);
    setIsSending(true);

    try {
      const response = await chatSession.sendMessage({ message: userText });
      const text = response.text || "I couldn't generate a response.";
      setMessages(prev => [...prev, { role: 'model', text }]);
    } catch (e) {
      setMessages(prev => [...prev, { role: 'model', text: "Error: Could not reach the AI." }]);
    } finally {
      setIsSending(false);
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-emerald-500 border-emerald-500';
    if (score >= 60) return 'text-amber-500 border-amber-500';
    return 'text-rose-500 border-rose-500';
  };

  return (
    <div className="animate-fade-in space-y-6">
      {/* Navigation Pill */}
      <div className="flex justify-center mb-8">
        <div className="bg-white p-1.5 rounded-full shadow-sm border border-stone-100 inline-flex">
          <button 
            onClick={() => setActiveTab('analysis')}
            className={`px-8 py-2.5 rounded-full text-sm font-bold transition-all ${
              activeTab === 'analysis' ? 'bg-stone-900 text-white shadow-md' : 'text-stone-500 hover:text-stone-900'
            }`}
          >
            Report & Analysis
          </button>
          <button 
            onClick={() => setActiveTab('chat')}
            className={`px-8 py-2.5 rounded-full text-sm font-bold transition-all ${
              activeTab === 'chat' ? 'bg-violet-600 text-white shadow-md' : 'text-stone-500 hover:text-stone-900'
            }`}
          >
            Chat with Listing
          </button>
        </div>
      </div>

      {activeTab === 'analysis' ? (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          
          {/* Main Score Card - Spans full width on mobile, 8 cols on desktop */}
          <div className="lg:col-span-8 bg-white rounded-[2rem] p-8 shadow-xl shadow-stone-200/40 border border-white relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-violet-50 to-teal-50 rounded-full blur-3xl -mr-16 -mt-16 opacity-50 group-hover:opacity-100 transition-opacity"></div>
            
            <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-8">
              <div>
                <div className="flex items-center gap-3 mb-3">
                  <span className={`px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider ${
                    result.marketAnalysis.valueVerdict.toLowerCase().includes('over') 
                    ? 'bg-rose-100 text-rose-700' 
                    : 'bg-emerald-100 text-emerald-700'
                  }`}>
                    {result.marketAnalysis.valueVerdict}
                  </span>
                  <span className="text-stone-400 text-sm font-bold">{result.summary.location}</span>
                </div>
                <h1 className="text-3xl md:text-4xl font-black text-stone-800 mb-2 leading-tight max-w-xl">
                  {result.summary.title}
                </h1>
                <p className="text-xl text-stone-500 font-medium mb-4">
                  {result.summary.price} <span className="text-stone-300 mx-2">•</span> {result.summary.layout}
                </p>
                <p className="text-stone-600 leading-relaxed max-w-lg">
                  {result.summary.quickSummary}
                </p>
              </div>

              {/* Circular Score Visualization */}
              <div className="flex-shrink-0 flex flex-col items-center">
                <div className={`w-40 h-40 rounded-full border-[6px] flex flex-col items-center justify-center bg-white shadow-lg relative ${getScoreColor(result.matchScore.total)}`}>
                  <span className="text-5xl font-black tracking-tighter text-stone-800">
                    {result.matchScore.total}
                  </span>
                  <span className="text-xs font-bold text-stone-400 uppercase tracking-widest mt-1">Match</span>
                  
                  {/* Decorative dots */}
                  <div className="absolute top-2 right-6 w-2 h-2 rounded-full bg-current opacity-20"></div>
                  <div className="absolute bottom-4 left-6 w-3 h-3 rounded-full bg-current opacity-20"></div>
                </div>
                <div className="flex gap-4 mt-6">
                  <div className="text-center">
                    <div className="text-lg font-bold text-stone-800">{result.matchScore.categoryScores.financial}</div>
                    <div className="text-[10px] uppercase font-bold text-stone-400">Value</div>
                  </div>
                  <div className="w-px bg-stone-200 h-8"></div>
                  <div className="text-center">
                    <div className="text-lg font-bold text-stone-800">{result.matchScore.categoryScores.condition}</div>
                    <div className="text-[10px] uppercase font-bold text-stone-400">Cond.</div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Action Card - Spans 4 cols */}
          <div className="lg:col-span-4 bg-violet-600 rounded-[2rem] p-8 shadow-xl shadow-violet-200 text-white flex flex-col justify-between relative overflow-hidden">
            <div className="absolute -right-10 -bottom-10 w-40 h-40 bg-white opacity-10 rounded-full blur-2xl"></div>
            <div>
              <h3 className="text-lg font-bold opacity-90 mb-1">Investment Potential</h3>
              <p className="text-2xl font-black mb-6">{result.marketAnalysis.investmentPotential}</p>
              
              <div className="bg-white/10 rounded-xl p-4 backdrop-blur-sm border border-white/10 mb-6">
                <p className="text-sm font-medium leading-relaxed opacity-90">
                  {result.marketAnalysis.comparableNotes}
                </p>
              </div>
            </div>
            
            <button 
              onClick={onReset}
              className="w-full py-4 bg-white text-violet-700 rounded-xl font-bold hover:bg-violet-50 transition-colors shadow-lg"
            >
              Start New Analysis
            </button>
          </div>

          {/* Bento Grid for Details */}
          <div className="lg:col-span-4 bg-emerald-50 rounded-[2rem] p-6 border border-emerald-100">
            <h3 className="font-bold text-emerald-800 mb-4 flex items-center gap-2">
              <span className="bg-white p-1.5 rounded-lg shadow-sm text-lg">👍</span> The Good
            </h3>
            <div className="space-y-3">
              {result.details.pros.slice(0, 4).map((item, i) => (
                <div key={i} className="bg-white/60 p-3 rounded-xl">
                  <div className="font-bold text-emerald-900 text-sm">{item.claim}</div>
                  {item.sourceQuote && (
                    <div className="text-emerald-700/60 text-xs mt-1 italic line-clamp-1">"{item.sourceQuote}"</div>
                  )}
                </div>
              ))}
            </div>
          </div>

          <div className="lg:col-span-4 bg-amber-50 rounded-[2rem] p-6 border border-amber-100">
            <h3 className="font-bold text-amber-800 mb-4 flex items-center gap-2">
              <span className="bg-white p-1.5 rounded-lg shadow-sm text-lg">👎</span> The Bad
            </h3>
            <div className="space-y-3">
              {result.details.cons.slice(0, 4).map((item, i) => (
                <div key={i} className="bg-white/60 p-3 rounded-xl">
                  <div className="font-bold text-amber-900 text-sm">{item.claim}</div>
                  {item.sourceQuote && (
                    <div className="text-amber-700/60 text-xs mt-1 italic line-clamp-1">"{item.sourceQuote}"</div>
                  )}
                </div>
              ))}
            </div>
          </div>

          <div className="lg:col-span-4 bg-rose-50 rounded-[2rem] p-6 border border-rose-100">
             <h3 className="font-bold text-rose-800 mb-4 flex items-center gap-2">
              <span className="bg-white p-1.5 rounded-lg shadow-sm text-lg">🚩</span> Red Flags
            </h3>
             {result.details.redFlags.length > 0 ? (
                <div className="space-y-3">
                  {result.details.redFlags.map((item, i) => (
                    <div key={i} className="bg-white p-3 rounded-xl border border-rose-100 shadow-sm">
                      <div className="font-bold text-rose-900 text-sm">{item.claim}</div>
                      {item.sourceQuote && (
                        <div className="text-rose-700/60 text-xs mt-1 italic">"{item.sourceQuote}"</div>
                      )}
                    </div>
                  ))}
                </div>
             ) : (
               <div className="h-32 flex items-center justify-center text-rose-300 font-bold text-sm bg-white/50 rounded-xl border border-dashed border-rose-200">
                 No major red flags found!
               </div>
             )}
          </div>

          {/* Email Composer */}
          <div className="lg:col-span-8 bg-stone-900 rounded-[2rem] p-8 text-white relative overflow-hidden">
             <div className="relative z-10">
               <div className="flex justify-between items-center mb-6">
                 <div>
                   <h3 className="text-xl font-bold">Inquiry Assistant</h3>
                   <p className="text-stone-400 text-sm">Generated email specifically addressing risks.</p>
                 </div>
                 <div className="flex gap-2">
                    <span className="w-3 h-3 rounded-full bg-red-500"></span>
                    <span className="w-3 h-3 rounded-full bg-yellow-500"></span>
                    <span className="w-3 h-3 rounded-full bg-green-500"></span>
                 </div>
               </div>

               <div className="bg-stone-800 rounded-xl p-6 font-mono text-sm border border-stone-700 shadow-inner">
                 <div className="mb-4 border-b border-stone-700 pb-4">
                   <span className="text-stone-500 mr-4">Subject:</span>
                   <span className="text-stone-200">{result.contactDraft.subject}</span>
                 </div>
                 <div className="text-stone-300 leading-relaxed whitespace-pre-line">
                   {result.contactDraft.body}
                 </div>
               </div>
               
               <div className="mt-4 flex justify-end">
                 <button 
                  onClick={() => navigator.clipboard.writeText(`${result.contactDraft.subject}\n\n${result.contactDraft.body}`)}
                  className="px-6 py-2 bg-white text-stone-900 rounded-lg text-sm font-bold hover:bg-stone-200 transition-colors flex items-center gap-2"
                 >
                   <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" /></svg>
                   Copy to Clipboard
                 </button>
               </div>
             </div>
          </div>

          {/* Hidden Gems / Extra Info */}
          <div className="lg:col-span-4 bg-sky-50 rounded-[2rem] p-8 border border-sky-100 flex flex-col justify-center">
             <h3 className="font-bold text-sky-800 mb-4 flex items-center gap-2">
               <span className="text-xl">✨</span> Hidden Gems
             </h3>
             <ul className="space-y-4">
                {result.details.hiddenGems.map((gem, i) => (
                  <li key={i} className="text-sm font-medium text-sky-900 leading-snug">
                    {gem}
                  </li>
                ))}
             </ul>
          </div>

        </div>
      ) : (
        /* CHAT VIEW */
        <div className="max-w-3xl mx-auto bg-white rounded-[2rem] shadow-xl border border-stone-100 overflow-hidden flex flex-col h-[600px]">
          <div className="bg-stone-50 p-4 border-b border-stone-100 flex items-center justify-between">
             <div className="flex items-center gap-3">
               <div className="w-10 h-10 rounded-full bg-violet-100 flex items-center justify-center text-violet-600 font-bold">AI</div>
               <div>
                 <div className="font-bold text-stone-800">Listing Assistant</div>
                 <div className="text-xs text-stone-400 font-bold uppercase">Online</div>
               </div>
             </div>
          </div>

          <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-stone-50/30">
            {messages.map((msg, i) => (
              <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                {msg.role === 'model' && (
                  <div className="w-8 h-8 rounded-full bg-violet-600 flex-shrink-0 mr-2 flex items-center justify-center text-white text-xs font-bold">AI</div>
                )}
                <div className={`max-w-[80%] rounded-2xl px-5 py-3 text-sm leading-relaxed shadow-sm ${
                  msg.role === 'user' 
                    ? 'bg-stone-900 text-white rounded-br-none' 
                    : 'bg-white text-stone-700 rounded-bl-none border border-stone-100'
                }`}>
                  {msg.text}
                </div>
              </div>
            ))}
            {isSending && (
               <div className="flex justify-start ml-10">
                 <div className="bg-stone-200/50 text-stone-400 rounded-full px-4 py-1 text-xs font-bold animate-pulse">
                   Thinking...
                 </div>
               </div>
            )}
            <div ref={chatBottomRef} />
          </div>

          <div className="p-4 bg-white border-t border-stone-100">
             <div className="flex gap-3 bg-stone-50 p-2 rounded-2xl border border-stone-100 focus-within:ring-2 focus-within:ring-violet-200 transition-all">
               <input
                 type="text"
                 className="flex-1 bg-transparent px-4 focus:outline-none text-stone-800 font-medium"
                 placeholder="Type your question here..."
                 value={inputMsg}
                 onChange={(e) => setInputMsg(e.target.value)}
                 onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
               />
               <button 
                onClick={handleSendMessage}
                disabled={isSending || !inputMsg.trim()}
                className="bg-violet-600 text-white w-10 h-10 rounded-xl flex items-center justify-center hover:bg-violet-700 disabled:opacity-50 transition-colors shadow-sm"
               >
                 <svg className="w-5 h-5 translate-x-0.5 -translate-y-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" /></svg>
               </button>
             </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AnalysisView;