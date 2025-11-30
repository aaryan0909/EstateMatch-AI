import React, { useState } from 'react';
import { UserPreferences, AnalysisResult, AppState } from './types';
import PreferencesPanel from './components/PreferencesPanel';
import AnalysisView from './components/AnalysisView';
import { analyzeListing } from './services/geminiService';

const App: React.FC = () => {
  const [appState, setAppState] = useState<AppState>(AppState.IDLE);
  const [listingContent, setListingContent] = useState<string>('');
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const [preferences, setPreferences] = useState<UserPreferences>({
    budgetMax: 750000,
    minBedrooms: 2,
    minBathrooms: 1,
    location: '',
    priorities: {
      commute: 5,
      condition: 5,
      investment: 5,
      amenities: 5,
    },
    customCriteria: '',
  });

  const handleAnalyze = async () => {
    if (!listingContent.trim()) {
      setErrorMsg("Please paste some listing text or HTML content.");
      return;
    }
    
    // Safety check for API Key - strictly handled by metadata/env, but good UI feedback
    if (!process.env.API_KEY) {
       setErrorMsg("API_KEY not found in environment. Please check setup.");
       return;
    }

    setAppState(AppState.ANALYZING);
    setErrorMsg(null);

    try {
      const result = await analyzeListing(listingContent, preferences);
      setAnalysisResult(result);
      setAppState(AppState.RESULTS);
    } catch (err) {
      console.error(err);
      setErrorMsg("Failed to analyze listing. The AI model might be busy or the content was too ambiguous. Try pasting just the description and key facts.");
      setAppState(AppState.ERROR);
    }
  };

  const resetApp = () => {
    setAppState(AppState.IDLE);
    setListingContent('');
    setAnalysisResult(null);
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 pb-20">
      {/* Navbar */}
      <nav className="bg-white border-b border-slate-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <svg className="h-8 w-8 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
              </svg>
              <span className="ml-2 text-xl font-bold tracking-tight">EstateMatch AI</span>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-xs font-medium px-2 py-1 bg-indigo-50 text-indigo-700 rounded-md border border-indigo-100">Canadian Edition</span>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        
        {appState === AppState.IDLE || appState === AppState.ERROR || appState === AppState.ANALYZING ? (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            
            {/* Left Col: Preferences */}
            <div className="lg:col-span-4 order-2 lg:order-1">
              <PreferencesPanel preferences={preferences} setPreferences={setPreferences} />
            </div>

            {/* Right Col: Input */}
            <div className="lg:col-span-8 order-1 lg:order-2 space-y-6">
              <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                <h1 className="text-2xl font-bold mb-2">Find your perfect home.</h1>
                <p className="text-slate-500 mb-6">
                  Paste the content from any Canadian real estate listing (Realtor.ca, Centris, Zolo, Redfin.ca) below. 
                  Our AI will extract the data, detect red flags (like Kitec plumbing or special assessments), and score it against your unique needs.
                </p>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Listing Content (Paste Text or HTML)
                    </label>
                    <textarea
                      disabled={appState === AppState.ANALYZING}
                      value={listingContent}
                      onChange={(e) => setListingContent(e.target.value)}
                      placeholder="Paste the full description, price history, and details here..."
                      className="w-full h-64 p-4 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none font-mono text-sm bg-slate-50"
                    />
                    <p className="text-xs text-slate-400 mt-2 text-right">
                      Tip: Ctrl+A (Select All) on a listing page, Ctrl+C (Copy), then Paste here.
                    </p>
                  </div>

                  {errorMsg && (
                    <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                      <strong>Error:</strong> {errorMsg}
                    </div>
                  )}

                  <button
                    onClick={handleAnalyze}
                    disabled={appState === AppState.ANALYZING || !listingContent}
                    className={`w-full py-4 px-6 rounded-xl font-bold text-lg text-white shadow-md transition-all 
                      ${appState === AppState.ANALYZING 
                        ? 'bg-indigo-400 cursor-wait' 
                        : 'bg-indigo-600 hover:bg-indigo-700 hover:shadow-lg hover:-translate-y-0.5'
                      }`}
                  >
                    {appState === AppState.ANALYZING ? (
                      <span className="flex items-center justify-center">
                        <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Analyzing Listing...
                      </span>
                    ) : (
                      'Analyze Listing'
                    )}
                  </button>
                </div>
              </div>
              
              <div className="bg-blue-50 border border-blue-100 rounded-xl p-6">
                <h3 className="font-semibold text-blue-900 mb-2">Why copy-paste?</h3>
                <p className="text-sm text-blue-800">
                  Most real estate sites (Zillow, Redfin) block automated scrapers. 
                  By pasting the content yourself, you bypass security blocks and get 
                  instant analysis without setting up complex proxies.
                </p>
              </div>
            </div>
          </div>
        ) : (
          analysisResult && <AnalysisView result={analysisResult} onReset={resetApp} />
        )}
      </main>
    </div>
  );
};

export default App;