import React from 'react';
import { UserPreferences, ListingType } from '../types';

interface Props {
  preferences: UserPreferences;
  setPreferences: React.Dispatch<React.SetStateAction<UserPreferences>>;
}

const PreferencesPanel: React.FC<Props> = ({ preferences, setPreferences }) => {
  const handleChange = (field: keyof UserPreferences, value: any) => {
    setPreferences((prev) => ({ ...prev, [field]: value }));
  };

  const handlePriorityChange = (field: keyof UserPreferences['priorities'], value: number) => {
    setPreferences((prev) => ({
      ...prev,
      priorities: { ...prev.priorities, [field]: value },
    }));
  };

  const toggleType = (type: ListingType) => {
    const newBudget = type === 'RENT' ? 2500 : 750000;
    setPreferences((prev) => ({ ...prev, listingType: type, budgetMax: newBudget }));
  };

  return (
    <div className="bg-white p-8 rounded-[2rem] shadow-xl shadow-stone-200/50 border border-white sticky top-24">
      <div className="flex flex-col gap-6">
        {/* Header & Toggle */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl font-extrabold text-stone-800">Preferences</h2>
            <p className="text-sm text-stone-400 font-medium">Customize your ideal match</p>
          </div>
          
          <div className="bg-stone-100 p-1.5 rounded-2xl flex w-full sm:w-auto">
            <button
              onClick={() => toggleType('BUY')}
              className={`flex-1 sm:flex-none px-6 py-2.5 rounded-xl text-sm font-bold transition-all duration-300 ${
                preferences.listingType === 'BUY'
                  ? 'bg-white text-violet-600 shadow-md transform scale-100'
                  : 'text-stone-500 hover:text-stone-700'
              }`}
            >
              Buy
            </button>
            <button
              onClick={() => toggleType('RENT')}
              className={`flex-1 sm:flex-none px-6 py-2.5 rounded-xl text-sm font-bold transition-all duration-300 ${
                preferences.listingType === 'RENT'
                  ? 'bg-white text-violet-600 shadow-md transform scale-100'
                  : 'text-stone-500 hover:text-stone-700'
              }`}
            >
              Rent
            </button>
          </div>
        </div>

        <hr className="border-stone-100" />

        {/* Budget & Layout */}
        <div className="space-y-6">
          <div className="bg-stone-50 p-5 rounded-2xl border border-stone-100">
            <label className="block text-xs font-bold text-stone-400 uppercase tracking-wider mb-2">
              {preferences.listingType === 'BUY' ? 'Max Budget' : 'Max Rent'}
            </label>
            <div className="relative flex items-center">
              <span className="absolute left-4 text-stone-400 font-bold text-lg">$</span>
              <input
                type="number"
                value={preferences.budgetMax}
                onChange={(e) => handleChange('budgetMax', parseInt(e.target.value) || 0)}
                className="w-full pl-8 pr-4 py-2 bg-transparent text-3xl font-black text-stone-800 focus:outline-none placeholder-stone-300"
              />
              <span className="text-sm font-bold text-stone-400">CAD</span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="bg-stone-50 p-4 rounded-2xl border border-stone-100">
              <label className="block text-xs font-bold text-stone-400 uppercase mb-1">Min Beds</label>
              <div className="flex items-center justify-between">
                <button 
                  onClick={() => handleChange('minBedrooms', Math.max(0, preferences.minBedrooms - 1))}
                  className="w-8 h-8 rounded-full bg-white text-stone-400 hover:text-violet-600 shadow-sm flex items-center justify-center font-bold"
                >-</button>
                <span className="text-xl font-black text-stone-800">{preferences.minBedrooms}</span>
                <button 
                   onClick={() => handleChange('minBedrooms', preferences.minBedrooms + 1)}
                   className="w-8 h-8 rounded-full bg-white text-stone-400 hover:text-violet-600 shadow-sm flex items-center justify-center font-bold"
                >+</button>
              </div>
            </div>
            <div className="bg-stone-50 p-4 rounded-2xl border border-stone-100">
              <label className="block text-xs font-bold text-stone-400 uppercase mb-1">Min Baths</label>
              <div className="flex items-center justify-between">
                <button 
                  onClick={() => handleChange('minBathrooms', Math.max(0, preferences.minBathrooms - 0.5))}
                  className="w-8 h-8 rounded-full bg-white text-stone-400 hover:text-violet-600 shadow-sm flex items-center justify-center font-bold"
                >-</button>
                <span className="text-xl font-black text-stone-800">{preferences.minBathrooms}</span>
                <button 
                   onClick={() => handleChange('minBathrooms', preferences.minBathrooms + 0.5)}
                   className="w-8 h-8 rounded-full bg-white text-stone-400 hover:text-violet-600 shadow-sm flex items-center justify-center font-bold"
                >+</button>
              </div>
            </div>
          </div>

          <div>
            <label className="block text-sm font-bold text-stone-700 mb-2 ml-1">Location Target</label>
            <input
              type="text"
              placeholder="e.g. Kitsilano, Vancouver"
              value={preferences.location}
              onChange={(e) => handleChange('location', e.target.value)}
              className="w-full px-5 py-3 bg-stone-50 border-2 border-stone-100 rounded-xl text-stone-800 font-medium placeholder-stone-400 focus:border-violet-300 focus:bg-white focus:outline-none transition-all"
            />
          </div>
        </div>

        {/* Priorities Sliders */}
        <div className="space-y-6 pt-4">
          <h3 className="text-lg font-bold text-stone-800">What matters most?</h3>
          
          {[
            { key: 'commute', label: 'Commute & Transit', icon: '🚇' },
            { key: 'condition', label: 'Move-in Condition', icon: '✨' },
            { key: 'investment', label: 'Value & Investment', icon: '📈' },
            { key: 'amenities', label: 'Lifestyle & Amenities', icon: '☕' },
          ].map((item) => (
            <div key={item.key} className="group">
              <div className="flex justify-between text-sm mb-2">
                <span className="font-bold text-stone-600 flex items-center gap-2">
                  <span className="text-lg">{item.icon}</span> {item.label}
                </span>
                <span className="font-bold text-violet-600 bg-violet-50 px-2 py-0.5 rounded-md">
                  {preferences.priorities[item.key as keyof typeof preferences.priorities]}/10
                </span>
              </div>
              <input
                type="range"
                min="1"
                max="10"
                value={preferences.priorities[item.key as keyof typeof preferences.priorities]}
                onChange={(e) => handlePriorityChange(item.key as any, parseInt(e.target.value))}
                className="w-full h-2 bg-stone-100 rounded-full appearance-none cursor-pointer accent-violet-500 hover:accent-violet-600 transition-colors"
              />
              <div className="flex justify-between text-[10px] uppercase font-bold text-stone-300 mt-1">
                <span>Not Important</span>
                <span>Critical</span>
              </div>
            </div>
          ))}
        </div>

        {/* Custom Criteria */}
        <div className="pt-4">
          <label className="block text-sm font-bold text-stone-700 mb-2 ml-1">Must-Haves & Deal Breakers</label>
          <textarea
            rows={3}
            placeholder="E.g. South facing balcony, allow large dogs, no oil tank..."
            value={preferences.customCriteria}
            onChange={(e) => handleChange('customCriteria', e.target.value)}
            className="w-full px-5 py-3 bg-stone-50 border-2 border-stone-100 rounded-xl text-stone-800 font-medium placeholder-stone-400 focus:border-violet-300 focus:bg-white focus:outline-none transition-all resize-none"
          />
        </div>
      </div>
    </div>
  );
};

export default PreferencesPanel;