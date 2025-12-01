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
    // Reset reasonable defaults when switching modes
    const newBudget = type === 'RENT' ? 2500 : 750000;
    setPreferences((prev) => ({ ...prev, listingType: type, budgetMax: newBudget }));
  };

  return (
    <div className="bg-white p-8 rounded-3xl shadow-lg border border-stone-100">
      <div className="flex items-center justify-between mb-8">
        <h2 className="text-2xl font-bold text-stone-800 tracking-tight">
          Match Criteria
        </h2>
        {/* Buy/Rent Toggle */}
        <div className="flex bg-stone-100 p-1 rounded-xl">
          <button
            onClick={() => toggleType('BUY')}
            className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all duration-300 ${
              preferences.listingType === 'BUY'
                ? 'bg-white text-stone-900 shadow-sm'
                : 'text-stone-500 hover:text-stone-700'
            }`}
          >
            Buy
          </button>
          <button
            onClick={() => toggleType('RENT')}
            className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all duration-300 ${
              preferences.listingType === 'RENT'
                ? 'bg-white text-stone-900 shadow-sm'
                : 'text-stone-500 hover:text-stone-700'
            }`}
          >
            Rent
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Basic Filters */}
        <div className="space-y-6">
          <div>
            <label className="block text-sm font-bold text-stone-600 mb-2 uppercase tracking-wide">
              {preferences.listingType === 'BUY' ? 'Max Purchase Price' : 'Max Monthly Rent'} (CAD)
            </label>
            <div className="relative group">
              <span className="absolute left-4 top-3 text-stone-400 font-medium">$</span>
              <input
                type="number"
                value={preferences.budgetMax}
                onChange={(e) => handleChange('budgetMax', parseInt(e.target.value) || 0)}
                className="w-full pl-8 pr-4 py-3 bg-stone-50 border-2 border-stone-100 rounded-xl text-stone-900 font-semibold focus:border-violet-300 focus:bg-white focus:outline-none transition-colors"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-bold text-stone-600 mb-2 uppercase tracking-wide">Min Beds</label>
              <input
                type="number"
                value={preferences.minBedrooms}
                onChange={(e) => handleChange('minBedrooms', parseInt(e.target.value) || 0)}
                className="w-full px-4 py-3 bg-stone-50 border-2 border-stone-100 rounded-xl text-stone-900 font-semibold focus:border-violet-300 focus:bg-white focus:outline-none transition-colors"
              />
            </div>
            <div>
              <label className="block text-sm font-bold text-stone-600 mb-2 uppercase tracking-wide">Min Baths</label>
              <input
                type="number"
                value={preferences.minBathrooms}
                onChange={(e) => handleChange('minBathrooms', parseFloat(e.target.value) || 0)}
                className="w-full px-4 py-3 bg-stone-50 border-2 border-stone-100 rounded-xl text-stone-900 font-semibold focus:border-violet-300 focus:bg-white focus:outline-none transition-colors"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-bold text-stone-600 mb-2 uppercase tracking-wide">Target Location</label>
            <input
              type="text"
              placeholder="e.g. Kitsilano, Vancouver"
              value={preferences.location}
              onChange={(e) => handleChange('location', e.target.value)}
              className="w-full px-4 py-3 bg-stone-50 border-2 border-stone-100 rounded-xl text-stone-900 font-medium placeholder-stone-400 focus:border-violet-300 focus:bg-white focus:outline-none transition-colors"
            />
          </div>
        </div>

        {/* Priorities */}
        <div className="space-y-6">
            <h3 className="text-sm font-bold text-stone-600 uppercase tracking-wide">What matters most? (1-10)</h3>
            
            {[
              { key: 'commute', label: 'Short Commute / Transit' },
              { key: 'condition', label: 'Move-in Ready (Condition)' },
              { key: 'investment', label: 'Value / Investment' },
              { key: 'amenities', label: 'Luxury & Amenities' },
            ].map((item) => (
              <div key={item.key}>
                <div className="flex justify-between text-sm text-stone-600 mb-2">
                  <span className="font-medium">{item.label}</span>
                  <span className="font-bold text-violet-600">{preferences.priorities[item.key as keyof typeof preferences.priorities]}</span>
                </div>
                <input
                  type="range"
                  min="1"
                  max="10"
                  value={preferences.priorities[item.key as keyof typeof preferences.priorities]}
                  onChange={(e) => handlePriorityChange(item.key as any, parseInt(e.target.value))}
                  className="w-full h-2 bg-stone-200 rounded-full appearance-none cursor-pointer accent-violet-500 hover:accent-violet-600 transition-colors"
                />
              </div>
            ))}
        </div>
      </div>

      <div className="mt-8">
        <label className="block text-sm font-bold text-stone-600 mb-2 uppercase tracking-wide">Must-Haves & Deal Breakers</label>
        <textarea
          rows={3}
          placeholder="e.g. Must have in-suite laundry, south-facing windows, and allow a Golden Retriever."
          value={preferences.customCriteria}
          onChange={(e) => handleChange('customCriteria', e.target.value)}
          className="w-full px-4 py-3 bg-stone-50 border-2 border-stone-100 rounded-xl text-stone-900 font-medium placeholder-stone-400 focus:border-violet-300 focus:bg-white focus:outline-none transition-colors"
        />
      </div>
    </div>
  );
};

export default PreferencesPanel;
