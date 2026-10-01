import React, { useCallback, useEffect, useRef, useState } from 'react';
import { UserPreferences, AnalysisResult, AppState, ChatMessage } from './types';
import PreferencesPanel from './components/PreferencesPanel';
import AnalysisView from './components/AnalysisView';
import {
  ApiRequestError,
  AnalysisMode,
  analyzeListingRemote,
  chatRemote,
  fetchLiveAiConfig,
} from './services/analysisClient';
import { answerListingQuestion, buildLocalAnalysis } from './services/analyzerCore';
import { SAMPLE_LISTINGS, SampleListing } from './services/sampleListings';

const App: React.FC = () => {
  const [appState, setAppState] = useState<AppState>(AppState.IDLE);
  const [listingContent, setListingContent] = useState<string>('');
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [modeNotice, setModeNotice] = useState<string | null>(null);
  const [serverLiveAi, setServerLiveAi] = useState<boolean>(false);
  const [resultMode, setResultMode] = useState<AnalysisMode>('local');
  const resultListingRef = useRef<string>('');

  const [preferences, setPreferences] = useState<UserPreferences>({
    listingType: 'BUY',
    budgetMax: 750000,
    minBedrooms: 2,
    minBathrooms: 1,
    location: '',
    priorities: { commute: 5, condition: 5, investment: 5, amenities: 5 },
    customCriteria: '',
  });

  useEffect(() => {
    let cancelled = false;
    fetchLiveAiConfig().then((liveAi) => {
      if (!cancelled) setServerLiveAi(liveAi);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const runLocalAnalysis = useCallback((content: string, prefs: UserPreferences, notice?: string) => {
    setAnalysisResult(buildLocalAnalysis(content, prefs));
    setResultMode('local');
    resultListingRef.current = content;
    setModeNotice(
      notice ??
        'Instant local analysis. Deterministic rules extracted the facts, checked the quotes, and calculated the score in code. No listing text was sent to an AI service.',
    );
    setAppState(AppState.RESULTS);
  }, []);

  useEffect(() => {
    if (appState === AppState.RESULTS && resultMode === 'local' && resultListingRef.current) {
      setAnalysisResult(buildLocalAnalysis(resultListingRef.current, preferences));
    }
  }, [preferences, appState, resultMode]);

  const handleAnalyze = async () => {
    if (!listingContent.trim()) {
      setErrorMsg('Please paste some listing text or HTML content.');
      return;
    }
    setErrorMsg(null);
    setModeNotice(null);

    if (!serverLiveAi) {
      runLocalAnalysis(listingContent, preferences);
      return;
    }

    setAppState(AppState.ANALYZING);
    try {
      const result = await analyzeListingRemote(listingContent, preferences);
      setAnalysisResult(result);
      setResultMode('live');
      resultListingRef.current = listingContent;
      setModeNotice(
        'Live AI analysis. Gemini proposed the claims and narrative, then EstateMatch validated every quote against the listing and recalculated the score in code.',
      );
      setAppState(AppState.RESULTS);
    } catch (error) {
      if (error instanceof ApiRequestError && error.code === 'LIVE_AI_NOT_CONFIGURED') {
        setServerLiveAi(false);
        runLocalAnalysis(listingContent, preferences);
        return;
      }
      console.error(error);
      runLocalAnalysis(
        listingContent,
        preferences,
        'Live AI could not be reached, so this is an instant local analysis instead. The facts, quotes, and score were calculated in code.',
      );
    }
  };

  const handleChatMessage = async (message: string, history: ChatMessage[]): Promise<string> => {
    const content = resultListingRef.current || listingContent;
    if (resultMode === 'live' && serverLiveAi) {
      try {
        return await chatRemote(content, history, message);
      } catch (error) {
        if (error instanceof ApiRequestError && error.code === 'LIVE_AI_NOT_CONFIGURED') {
          setServerLiveAi(false);
        } else {
          console.error(error);
        }
      }
    }
    return answerListingQuestion(content, message);
  };

  const loadSample = (sample: SampleListing) => {
    setListingContent(sample.content);
    setErrorMsg(null);
    setPreferences((prev) => {
      if (prev.listingType === sample.listingType) return prev;
      return {
        ...prev,
        listingType: sample.listingType,
        budgetMax: sample.listingType === 'RENT' ? 2500 : 750000,
      };
    });
  };

  const resetApp = () => {
    setAppState(AppState.IDLE);
    setListingContent('');
    setAnalysisResult(null);
    setErrorMsg(null);
    setModeNotice(null);
    resultListingRef.current = '';
  };

  return (
    <div className="min-h-screen bg-stone-50 text-stone-900 font-sans pb-20">
      <nav className="bg-white/80 backdrop-blur-md border-b border-stone-100 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-20">
            <div className="flex items-center">
              <div className="bg-violet-100 p-2 rounded-xl mr-3">
                <svg className="h-6 w-6 text-violet-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                </svg>
              </div>
              <span className="text-xl font-black tracking-tight text-stone-800">EstateMatch AI</span>
            </div>
            <div className="flex items-center space-x-4">
              <span className={`text-xs font-bold uppercase tracking-wider px-3 py-1.5 rounded-lg border ${serverLiveAi ? 'bg-violet-50 text-violet-700 border-violet-100' : 'bg-teal-50 text-teal-700 border-teal-100'}`}>
                {serverLiveAi ? 'Live AI available' : 'Instant local mode'}
              </span>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <p className="text-xl text-stone-600 leading-relaxed mb-10">
          Paste a real-estate listing, get its red flags, hidden costs, and a match score against what you actually want.
        </p>

        {appState === AppState.IDLE || appState === AppState.ERROR || appState === AppState.ANALYZING ? (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
            <div className="lg:col-span-5 order-2 lg:order-1">
              <PreferencesPanel preferences={preferences} setPreferences={setPreferences} />
            </div>

            <div className="lg:col-span-7 order-1 lg:order-2 space-y-8">
              <div className="bg-white p-8 rounded-3xl shadow-lg border border-stone-100">
                <h1 className="text-4xl font-black text-stone-800 mb-4 tracking-tight">
                  Your smart assistant for <br />
                  <span className="text-violet-600">Canadian Real Estate.</span>
                </h1>
                <p className="text-stone-500 text-lg mb-8 leading-relaxed">
                  Paste listing text or HTML below. We analyze strata fees, hidden risks, and fit against your preferences. Scores and quotes are checked in code, not taken on faith from a model.
                </p>

                <div className="space-y-6">
                  <div className="relative">
                    <textarea
                      disabled={appState === AppState.ANALYZING}
                      value={listingContent}
                      onChange={(e) => setListingContent(e.target.value)}
                      placeholder="Paste listing details here (e.g. copied from Realtor.ca, Zolo, Craigslist)..."
                      className="w-full h-72 p-6 bg-stone-50 border-2 border-stone-100 rounded-3xl focus:border-violet-300 focus:bg-white focus:outline-none transition-all resize-none text-stone-700 placeholder-stone-400"
                    />
                    <div className="absolute bottom-4 right-4 text-xs font-bold text-stone-400 uppercase tracking-wide bg-stone-100 px-2 py-1 rounded-md">
                      Text or HTML
                    </div>
                  </div>

                  {errorMsg && (
                    <div className="p-4 bg-rose-50 border border-rose-100 rounded-2xl text-rose-800 text-sm font-medium flex items-center">
                      <svg className="w-5 h-5 mr-2 text-rose-500" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" /></svg>
                      {errorMsg}
                    </div>
                  )}

                  <div>
                    <div className="text-sm font-bold text-stone-700 mb-2">No listing handy? Try a fictional sample:</div>
                    <div className="flex flex-wrap gap-2">
                      {SAMPLE_LISTINGS.map((sample) => (
                        <button
                          key={sample.id}
                          type="button"
                          onClick={() => loadSample(sample)}
                          disabled={appState === AppState.ANALYZING}
                          className="px-4 py-2 rounded-xl bg-violet-50 border border-violet-100 text-sm font-bold text-violet-700 hover:bg-violet-100 transition-colors"
                          title={sample.description}
                        >
                          {sample.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={handleAnalyze}
                    disabled={appState === AppState.ANALYZING || !listingContent}
                    className={`w-full py-5 px-6 rounded-2xl font-bold text-lg text-white shadow-lg transition-all ${appState === AppState.ANALYZING ? 'bg-violet-300 cursor-wait' : 'bg-violet-600 hover:bg-violet-700 hover:shadow-xl hover:-translate-y-1'}`}
                  >
                    {appState === AppState.ANALYZING ? 'Analyzing...' : serverLiveAi ? 'Analyze with Live AI' : 'Analyze Listing'}
                  </button>
                  <p className="text-xs text-stone-400 leading-relaxed">
                    {serverLiveAi
                      ? 'Live mode sends the pasted text to the server-side Gemini endpoint. Quotes are validated and the final score is recalculated in code.'
                      : 'Local mode runs entirely in your browser. It is rules-based, so unusual wording can be missed, but no API key or listing upload is required.'}
                  </p>
                </div>
              </div>
            </div>
          </div>
        ) : (
          analysisResult && (
            <div>
              {modeNotice && (
                <div className={`mb-6 p-4 border rounded-2xl text-sm font-bold text-center ${resultMode === 'live' ? 'bg-violet-50 border-violet-200 text-violet-900' : 'bg-teal-50 border-teal-200 text-teal-900'}`}>
                  {modeNotice}
                </div>
              )}

              <details className="mb-6 bg-white border border-stone-200 rounded-3xl p-4">
                <summary className="cursor-pointer font-bold text-stone-700">
                  Adjust preferences{resultMode === 'local' ? ' (local score updates instantly)' : ''}
                </summary>
                <div className="mt-4">
                  <PreferencesPanel preferences={preferences} setPreferences={setPreferences} />
                </div>
                {resultMode === 'live' && (
                  <button
                    type="button"
                    onClick={handleAnalyze}
                    className="mt-4 px-5 py-3 rounded-xl bg-violet-600 text-white font-bold hover:bg-violet-700"
                  >
                    Re-run live analysis with these preferences
                  </button>
                )}
              </details>

              <AnalysisView
                result={analysisResult}
                listingContent={resultListingRef.current || listingContent}
                onReset={resetApp}
                onSendMessage={handleChatMessage}
                mode={resultMode}
              />
            </div>
          )
        )}
      </main>
    </div>
  );
};

export default App;
