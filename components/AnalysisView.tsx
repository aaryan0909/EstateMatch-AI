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
  const [showDraft, setShowDraft] = useState(false);
  
  const [messages, setMessages] = useState<ChatMessage[]>([
    { role: 'model', text: 'I have read the listing. What details would you like to verify?' }
  ]);
  const [inputMsg, setInputMsg] = useState('');
  const [isSending, setIsSending] = useState(false);
  const chatBottomRef = useRef<HTMLDivElement>(null);

  // Initialize chat session
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

  // Modern pastel scoring badge
  const getScoreBadge = (score: number) => {
    if (score >= 80) return 'bg-teal-100 text-teal-800 border-teal-200';
    if (score >= 60) return 'bg-amber-100 text-amber-800 border-amber-200';
    return 'bg-rose-100 text-rose-800 border-rose-200';
  };

  return (
    <div className="animate-fade-in space-y-8">
      {/* Header Card */}
      <div className="bg-white rounded-3xl shadow-lg border border-stone-100 overflow-hidden">
        <div className="p-8 flex flex-col md:flex-row gap-8 justify-between items-start">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-4">
               <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider
                 ${result.marketAnalysis.valueVerdict.toLowerCase().includes('over') ? 'bg-rose-100 text-rose-700' : 'bg-teal-100 text-teal-700'}`}>
                {result.marketAnalysis.valueVerdict}
              </span>
            </div>
            <h1 className="text-4xl font-bold text-stone-800 mb-2 tracking-tight">{result.summary.title}</h1>
            <p className="text-2xl text-stone-500 font-light mb-6">{result.summary.price} <span className="text-stone-300 mx-2">|</span> {result.summary.layout}</p>
            <p className="text-stone-600 leading-relaxed text-lg max-w-3xl">{result.summary.quickSummary}</p>
          </div>
          
          <div className={`flex flex-col items-center justify-center p-8 rounded-3xl border-2 ${getScoreBadge(result.matchScore.total)} min-w-[200px]`}>
            <span className="text-6xl font-black tracking-tighter">{result.matchScore.total}</span>
            <span className="text-xl font-bold mt-2 opacity-90">Grade: {result.matchScore.grade}</span>
            <div className="flex gap-4 mt-6 text-xs font-bold uppercase tracking-wide opacity-75">
               <div className="flex flex-col items-center">
                 <span className="text-lg">{result.matchScore.categoryScores.financial}</span>
                 <span>Value</span>
               </div>
               <div className="w-px bg-current h-8 opacity-20"></div>
               <div className="flex flex-col items-center">
                 <span className="text-lg">{result.matchScore.categoryScores.condition}</span>
                 <span>Cond.</span>
               </div>
               <div className="w-px bg-current h-8 opacity-20"></div>
               <div className="flex flex-col items-center">
                 <span className="text-lg">{result.matchScore.categoryScores.lifestyle}</span>
                 <span>Life</span>
               </div>
            </div>
          </div>
        </div>
        
        {/* Navigation Tabs */}
        <div className="flex border-t border-stone-100 bg-stone-50/50">
          <button 
            onClick={() => setActiveTab('analysis')}
            className={`flex-1 py-4 text-sm font-bold uppercase tracking-wide transition-all ${activeTab === 'analysis' ? 'bg-white text-violet-600 shadow-sm' : 'text-stone-400 hover:text-stone-600'}`}
          >
            Full Analysis
          </button>
          <button 
            onClick={() => setActiveTab('chat')}
            className={`flex-1 py-4 text-sm font-bold uppercase tracking-wide transition-all ${activeTab === 'chat' ? 'bg-white text-violet-600 shadow-sm' : 'text-stone-400 hover:text-stone-600'}`}
          >
            Ask the Listing
          </button>
        </div>
      </div>

      {activeTab === 'analysis' ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column */}
          <div className="lg:col-span-2 space-y-8">
            
            {/* Pros & Cons */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-emerald-50/50 p-6 rounded-3xl border border-emerald-100">
                <h4 className="font-bold text-emerald-900 mb-4 flex items-center text-lg">
                  <span className="bg-emerald-100 p-1.5 rounded-lg mr-2">👍</span> 
                  The Good
                </h4>
                <ul className="space-y-4">
                  {result.details.pros.map((pro, i) => (
                    <li key={i} className="text-sm">
                      <span className="text-emerald-900 font-semibold block mb-1">{pro.claim}</span>
                      {pro.sourceQuote && (
                        <span className="text-emerald-700/80 text-xs italic block pl-3 border-l-2 border-emerald-200">
                          "{pro.sourceQuote}"
                        </span>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
              
              <div className="bg-amber-50/50 p-6 rounded-3xl border border-amber-100">
                <h4 className="font-bold text-amber-900 mb-4 flex items-center text-lg">
                  <span className="bg-amber-100 p-1.5 rounded-lg mr-2">👎</span>
                  The Bad
                </h4>
                <ul className="space-y-4">
                  {result.details.cons.map((con, i) => (
                    <li key={i} className="text-sm">
                      <span className="text-amber-900 font-semibold block mb-1">{con.claim}</span>
                      {con.sourceQuote && (
                        <span className="text-amber-700/80 text-xs italic block pl-3 border-l-2 border-amber-200">
                          "{con.sourceQuote}"
                        </span>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            {/* Red Flags */}
            {result.details.redFlags.length > 0 && (
              <div className="bg-rose-50 rounded-3xl border border-rose-100 p-8">
                 <h3 className="text-xl font-bold text-rose-900 mb-6 flex items-center">
                   <svg className="w-6 h-6 mr-2 text-rose-500" fill="currentColor" viewBox="0 0 20 20"><path d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd"/></svg>
                   Deal Breakers & Risks
                 </h3>
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                   {result.details.redFlags.map((flag, i) => (
                     <div key={i} className="bg-white p-4 rounded-xl shadow-sm border border-rose-100">
                       <div className="font-bold text-rose-800 mb-1">{flag.claim}</div>
                       {flag.sourceQuote && (
                         <div className="text-rose-600/80 text-xs italic">"{flag.sourceQuote}"</div>
                       )}
                     </div>
                   ))}
                 </div>
              </div>
            )}
             
             {/* Score Explanation */}
             <div className="bg-white rounded-3xl shadow-sm border border-stone-100 p-8">
              <h3 className="text-lg font-bold text-stone-800 mb-4">Why this score?</h3>
              <p className="text-stone-600 leading-relaxed whitespace-pre-line">{result.matchScore.breakdown}</p>
            </div>
          </div>

          {/* Right Column */}
          <div className="space-y-6">
            
            {/* Contact Draft */}
            <div className="bg-violet-50 rounded-3xl border border-violet-100 p-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="font-bold text-violet-900 uppercase tracking-wide text-sm">Action Items</h3>
                <button 
                  onClick={() => setShowDraft(!showDraft)}
                  className="text-xs bg-violet-200 text-violet-800 px-3 py-1 rounded-full hover:bg-violet-300 font-bold transition-colors"
                >
                  {showDraft ? 'Hide Draft' : 'Draft Email'}
                </button>
              </div>
              
              {!showDraft ? (
                <div className="text-sm text-violet-800/80">
                  Ready to move forward? Generate an inquiry email that specifically asks about the red flags found.
                </div>
              ) : (
                <div className="bg-white rounded-xl p-4 border border-violet-100 shadow-sm">
                  <div className="mb-3">
                    <div className="text-xs text-stone-400 font-bold uppercase mb-1">Subject</div>
                    <div className="text-stone-800 font-medium text-sm border-b border-stone-100 pb-2">{result.contactDraft.subject}</div>
                  </div>
                  <div>
                    <div className="text-xs text-stone-400 font-bold uppercase mb-1">Body</div>
                    <div className="text-stone-600 text-sm whitespace-pre-line leading-relaxed">{result.contactDraft.body}</div>
                  </div>
                  <button 
                    onClick={() => navigator.clipboard.writeText(`${result.contactDraft.subject}\n\n${result.contactDraft.body}`)}
                    className="mt-4 w-full py-2 bg-violet-600 text-white rounded-lg text-xs font-bold hover:bg-violet-700 transition-colors"
                  >
                    Copy to Clipboard
                  </button>
                </div>
              )}
            </div>

            {/* Hidden Gems */}
            <div className="bg-sky-50 rounded-3xl border border-sky-100 p-6">
               <h3 className="font-bold text-sky-900 uppercase tracking-wide text-sm mb-4">Hidden Gems</h3>
               <ul className="space-y-3">
                  {result.details.hiddenGems.map((gem, i) => (
                    <li key={i} className="text-sm text-sky-900 flex items-start bg-white/60 p-3 rounded-xl border border-sky-100">
                      <span className="mr-2 text-sky-500">✨</span>
                      {gem}
                    </li>
                  ))}
               </ul>
            </div>

            <button 
              onClick={onReset} 
              className="w-full py-4 px-6 bg-stone-800 hover:bg-stone-700 text-white rounded-2xl font-bold transition-all shadow-lg hover:shadow-xl translate-y-0 hover:-translate-y-1"
            >
              Analyze Another
            </button>
          </div>
        </div>
      ) : (
        /* CHAT INTERFACE */
        <div className="bg-white rounded-3xl shadow-lg border border-stone-100 flex flex-col h-[600px]">
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            {messages.map((msg, i) => (
              <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[80%] rounded-2xl px-6 py-4 text-sm leading-relaxed shadow-sm ${
                  msg.role === 'user' 
                    ? 'bg-violet-600 text-white rounded-br-none' 
                    : 'bg-stone-100 text-stone-800 rounded-bl-none'
                }`}>
                  {msg.text}
                </div>
              </div>
            ))}
            {isSending && (
               <div className="flex justify-start">
                 <div className="bg-stone-50 text-stone-400 rounded-2xl px-4 py-2 text-xs font-medium animate-pulse">
                   AI is thinking...
                 </div>
               </div>
            )}
            <div ref={chatBottomRef} />
          </div>
          <div className="p-6 border-t border-stone-100 bg-stone-50/50 rounded-b-3xl">
             <div className="flex gap-3">
               <input
                 type="text"
                 className="flex-1 border-2 border-stone-200 rounded-xl px-4 py-3 focus:border-violet-400 focus:bg-white focus:outline-none transition-colors"
                 placeholder="Ask about heating, schools, parking..."
                 value={inputMsg}
                 onChange={(e) => setInputMsg(e.target.value)}
                 onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
               />
               <button 
                onClick={handleSendMessage}
                disabled={isSending || !inputMsg.trim()}
                className="bg-violet-600 text-white px-6 py-3 rounded-xl font-bold hover:bg-violet-700 disabled:opacity-50 disabled:hover:bg-violet-600 transition-colors"
               >
                 Send
               </button>
             </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AnalysisView;
