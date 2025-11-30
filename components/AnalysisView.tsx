import React from 'react';
import { AnalysisResult } from '../types';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';

interface Props {
  result: AnalysisResult;
  onReset: () => void;
}

const AnalysisView: React.FC<Props> = ({ result, onReset }) => {
  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600 bg-green-50 border-green-200';
    if (score >= 60) return 'text-yellow-600 bg-yellow-50 border-yellow-200';
    return 'text-red-600 bg-red-50 border-red-200';
  };

  const scoreData = [
    { name: 'Match Score', score: result.matchScore.total },
  ];

  return (
    <div className="animate-fade-in space-y-6">
      {/* Header Card */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="p-6 md:p-8 flex flex-col md:flex-row gap-6 justify-between items-start">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-600">
                {result.marketAnalysis.valueVerdict.toUpperCase()}
              </span>
            </div>
            <h1 className="text-3xl font-bold text-slate-900 mb-2">{result.summary.title}</h1>
            <p className="text-xl text-slate-600 mb-4">{result.summary.price} • {result.summary.layout}</p>
            <p className="text-slate-600 leading-relaxed">{result.summary.quickSummary}</p>
          </div>
          
          <div className={`flex flex-col items-center justify-center p-6 rounded-2xl border-2 ${getScoreColor(result.matchScore.total)} min-w-[160px]`}>
            <span className="text-5xl font-extrabold">{result.matchScore.total}</span>
            <span className="text-lg font-bold mt-1">Grade: {result.matchScore.grade}</span>
            <span className="text-xs uppercase tracking-wider font-semibold opacity-75 mt-2">Match Score</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Stats & Breakdown */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Key Findings */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
            <h3 className="text-lg font-bold text-slate-900 mb-4">Key Findings</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-green-50 p-4 rounded-lg border border-green-100">
                <h4 className="font-semibold text-green-800 mb-2 flex items-center">
                   <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path></svg>
                   Pros
                </h4>
                <ul className="space-y-2">
                  {result.details.pros.map((pro, i) => (
                    <li key={i} className="text-sm text-slate-700">• {pro}</li>
                  ))}
                </ul>
              </div>
              
              <div className="bg-orange-50 p-4 rounded-lg border border-orange-100">
                <h4 className="font-semibold text-orange-800 mb-2 flex items-center">
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path></svg>
                  Cons
                </h4>
                <ul className="space-y-2">
                  {result.details.cons.map((con, i) => (
                    <li key={i} className="text-sm text-slate-700">• {con}</li>
                  ))}
                </ul>
              </div>
            </div>
          </div>

          {/* Red Flags Section */}
          {result.details.redFlags.length > 0 && (
            <div className="bg-red-50 rounded-xl shadow-sm border border-red-200 p-6">
               <h3 className="text-lg font-bold text-red-900 mb-3 flex items-center">
                 <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path></svg>
                 Red Flags Detected
               </h3>
               <ul className="grid grid-cols-1 md:grid-cols-2 gap-3">
                 {result.details.redFlags.map((flag, i) => (
                   <li key={i} className="flex items-start text-sm text-red-800">
                     <span className="mr-2 mt-1 block w-1.5 h-1.5 bg-red-600 rounded-full"></span>
                     {flag}
                   </li>
                 ))}
               </ul>
            </div>
          )}
           {/* Logic Explanation */}
           <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
            <h3 className="text-lg font-bold text-slate-900 mb-3">Why this score?</h3>
            <p className="text-slate-600 text-sm leading-relaxed whitespace-pre-line">{result.matchScore.breakdown}</p>
          </div>
        </div>

        {/* Right Column: Market & Gems */}
        <div className="space-y-6">
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
            <h3 className="text-sm uppercase tracking-wider font-semibold text-slate-500 mb-4">Market Context</h3>
            <div className="mb-6">
               <div className="text-sm text-slate-500 mb-1">Value Verdict</div>
               <div className="text-lg font-semibold text-slate-900">{result.marketAnalysis.valueVerdict}</div>
            </div>
            <div>
               <div className="text-sm text-slate-500 mb-1">Investment Potential</div>
               <div className="text-sm text-slate-700">{result.marketAnalysis.investmentPotential}</div>
            </div>
          </div>

          <div className="bg-indigo-50 rounded-xl shadow-sm border border-indigo-100 p-6">
             <h3 className="text-sm uppercase tracking-wider font-semibold text-indigo-800 mb-4 flex items-center">
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 3.214L13 21l-2.286-6.857L5 12l5.714-3.214L13 3z"></path></svg>
                Hidden Gems
             </h3>
             <ul className="space-y-3">
                {result.details.hiddenGems.map((gem, i) => (
                  <li key={i} className="text-sm text-indigo-900 bg-white/50 p-2 rounded border border-indigo-100">
                    {gem}
                  </li>
                ))}
             </ul>
          </div>

          <button 
            onClick={onReset}
            className="w-full py-3 px-4 bg-slate-800 hover:bg-slate-700 text-white rounded-lg font-medium transition-colors shadow-sm"
          >
            Analyze Another Listing
          </button>
        </div>
      </div>
    </div>
  );
};

export default AnalysisView;
