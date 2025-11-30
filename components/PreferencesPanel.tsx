import React from 'react';
import { UserPreferences } from '../types';

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

  return (
    <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
      <h2 className="text-xl font-bold text-slate-800 mb-4 flex items-center">
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 text-indigo-600" viewBox="0 0 20 20" fill="currentColor">
          <path fillRule="evenodd" d="M11.49 3.17c-.38-1.56-2.6-1.56-2.98 0a1.532 1.532 0 01-2.286.948c-1.372-.836-2.942.734-2.106 2.106.54.886.061 2.042-.947 2.287-1.561.379-1.561 2.6 0 2.978a1.532 1.532 0 01.947 2.287c-.836 1.372.734 2.942 2.106 2.106a1.532 1.532 0 012.287.947c.379 1.561 2.6 1.561 2.978 0a1.533 1.533 0 012.287-.947c1.372.836 2.942-.734 2.106-2.106a1.533 1.533 0 01.947-2.287c1.561-.379 1.561-2.6 0-2.978a1.532 1.532 0 01-.947-2.287c.836-1.372-.734-2.942-2.106-2.106a1.532 1.532 0 01-2.287-.947zM10 13a3 3 0 100-6 3 3 0 000 6z" clipRule="evenodd" />
        </svg>
        Match Criteria
      </h2>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Basic Filters */}
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Max Budget (CAD)</label>
            <div className="relative">
              <span className="absolute left-3 top-2 text-slate-400">$</span>
              <input
                type="number"
                value={preferences.budgetMax}
                onChange={(e) => handleChange('budgetMax', parseInt(e.target.value) || 0)}
                className="w-full pl-7 pr-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Min Beds</label>
              <input
                type="number"
                value={preferences.minBedrooms}
                onChange={(e) => handleChange('minBedrooms', parseInt(e.target.value) || 0)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Min Baths</label>
              <input
                type="number"
                value={preferences.minBathrooms}
                onChange={(e) => handleChange('minBathrooms', parseFloat(e.target.value) || 0)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Target Location</label>
            <input
              type="text"
              placeholder="e.g. Kitsilano, Vancouver or M5V 2H1"
              value={preferences.location}
              onChange={(e) => handleChange('location', e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
            />
          </div>
        </div>

        {/* Priorities */}
        <div className="space-y-4">
            <h3 className="text-sm font-semibold text-slate-900">Priorities (1-10)</h3>
            
            {[
              { key: 'commute', label: 'Short Commute / Transit' },
              { key: 'condition', label: 'Move-in Ready (Condition)' },
              { key: 'investment', label: 'Investment Potential' },
              { key: 'amenities', label: 'Luxury & Amenities' },
            ].map((item) => (
              <div key={item.key}>
                <div className="flex justify-between text-xs text-slate-500 mb-1">
                  <span>{item.label}</span>
                  <span className="font-medium text-indigo-600">{preferences.priorities[item.key as keyof typeof preferences.priorities]}</span>
                </div>
                <input
                  type="range"
                  min="1"
                  max="10"
                  value={preferences.priorities[item.key as keyof typeof preferences.priorities]}
                  onChange={(e) => handlePriorityChange(item.key as any, parseInt(e.target.value))}
                  className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                />
              </div>
            ))}
        </div>
      </div>

      <div className="mt-6">
        <label className="block text-sm font-medium text-slate-700 mb-1">Natural Language Requirements</label>
        <textarea
          rows={3}
          placeholder="e.g. Must have a large backyard for my dog, good natural light is non-negotiable, prefer pre-war architecture."
          value={preferences.customCriteria}
          onChange={(e) => handleChange('customCriteria', e.target.value)}
          className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none text-sm"
        />
      </div>
    </div>
  );
};

export default PreferencesPanel;