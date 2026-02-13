// components/CharacterHeader.tsx
import React from 'react';
import { CharacterStats } from '../types';

interface CharacterHeaderProps {
  stats: CharacterStats;
  name: string;
  onLogout: () => void; // Changed prop name and type to indicate logout functionality
}

const CharacterHeader: React.FC<CharacterHeaderProps> = ({ stats, name, onLogout }) => {
  return (
    <div className="w-full max-w-2xl bg-[#1a1a1a] p-4 pixel-border flex flex-col md:flex-row justify-between items-center gap-4">
      <div className="flex items-center gap-4">
        <div className="w-12 h-12 bg-blue-600 border-2 border-white flex items-center justify-center font-pixel text-xl">
          {name[0].toUpperCase()}
        </div>
        <div>
          <h2 className="font-pixel text-sm text-yellow-400">{name}</h2>
          <p className="text-xs uppercase tracking-widest text-gray-400">LVL {stats.level} Chef</p>
        </div>
      </div>

      <div className="flex gap-6 text-xs font-pixel">
        <div className="flex flex-col items-center">
          <span className="text-red-400">🔪 KNIFE</span>
          <span>{stats.knifeSkills}</span>
        </div>
        <div className="flex flex-col items-center">
          <span className="text-orange-400">🔥 HEAT</span>
          <span>{stats.heatControl}</span>
        </div>
        <div className="flex flex-col items-center">
          <span className="text-yellow-400">💰 GOLD</span>
          <span className="text-green-400">${stats.goldSaved.toFixed(2)}</span>
        </div>
      </div>
      
      <div className="w-full md:w-32 bg-gray-800 h-3 border border-gray-600 relative overflow-hidden">
        <div 
          className="bg-blue-500 h-full transition-all duration-500" 
          style={{ width: `${(stats.xp % 1000) / 10}%` }}
        />
        <span className="absolute inset-0 flex items-center justify-center text-[8px] font-pixel text-white">
          XP {stats.xp % 1000}/1000
        </span>
      </div>
      <button onClick={onLogout} className="font-pixel text-[8px] text-gray-500 hover:text-white transition-colors">
        [SAVE & EXIT]
      </button>
    </div>
  );
};

export default CharacterHeader;