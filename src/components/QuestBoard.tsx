// components/QuestBoard.tsx
import React, { useState, useEffect } from 'react';
import { RecipeQuest, Ingredient } from '../types';
import { generateQuestBoard, generateRecipeImage } from '../services/geminiService'; // Corrected import path for services

interface QuestItemProps {
  quest: RecipeQuest;
  onSelect: (quest: RecipeQuest) => void;
  onSpeakCdm: (audioData: { narration?: string, speakNow?: boolean }) => Promise<void>;
}

const QuestItem: React.FC<QuestItemProps> = ({ quest, onSelect, onSpeakCdm }) => {
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [imageLoading, setImageLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    const fetchImage = async () => {
      try {
        const url = await generateRecipeImage(quest.quest_name);
        if (isMounted) setImageUrl(url);
      } catch (e) {
        console.error("Failed to generate recipe image:", e);
      } finally {
        if (isMounted) setImageLoading(false);
      }
    };
    fetchImage();
    return () => { isMounted = false; };
  }, [quest]);

  const handleClick = async () => { // Made async
    // Play quest-specific intro narration and SFX
    // Fix: Access cdm_intro_narration directly from quest, now that it's defined on RecipeQuest.
    // FIX: Use onSpeakCdm and set speakNow to true
    await onSpeakCdm({ // Await this
      narration: quest.cdm_intro_narration,
      speakNow: true,
    });
    onSelect(quest);
  };

  return (
    <button 
      onClick={handleClick}
      className="text-left bg-[#1a1a1a] border border-gray-800 rounded-lg hover:border-blue-500 hover:bg-[#222] transition-all p-0 group relative overflow-hidden flex flex-col shadow-lg"
    >
      <div className="p-6 pb-2">
        <div className="flex justify-between items-start mb-4">
          <div className="flex-grow pr-4">
            <h3 className="text-2xl font-sans font-bold text-white group-hover:text-yellow-400 transition-colors leading-tight">
              {quest.quest_name}
            </h3>
            <p className="text-[12px] text-gray-400 font-pixel mt-2 tracking-widest uppercase">
              Difficulty: {quest.difficulty}
            </p>
          </div>
          <div className="text-right flex-shrink-0">
            <span className="text-green-400 font-pixel text-xs bg-green-950/30 px-2 py-1 border border-green-900">
              +{quest.xp_reward} XP
            </span>
          </div>
        </div>
      </div>

      <div className="px-6 pb-4 flex gap-6 items-center">
        <div className="w-28 h-28 bg-black rounded-lg flex-shrink-0 relative overflow-hidden flex items-center justify-center border border-gray-700">
          {imageLoading ? (
            <div className="animate-pulse text-[10px] font-pixel text-gray-600 text-center p-2 uppercase">Rendering...</div>
          ) : imageUrl ? (
            <img src={imageUrl} alt={quest.quest_name} className="w-full h-full object-cover" />
          ) : (
            <div className="text-3xl">🍲</div>
          )}
        </div>
        <div className="flex-grow">
          <div className="bg-black/50 p-4 border-l-4 border-blue-500 rounded-r-md">
            <h4 className="text-[12px] font-sans font-bold text-blue-400 mb-1 uppercase tracking-wider">Loot Preview</h4>
            <p className="text-lg font-sans text-gray-100 leading-snug">
              {quest.loot_preview}
            </p>
          </div>
        </div>
      </div>

      <div className="px-6 pb-6 mt-auto">
        <div className="flex justify-between items-center border-t border-gray-800 pt-4">
          <div className="flex flex-col">
            <span className="text-[10px] font-pixel text-gray-500 uppercase mb-1">Boss Encounter</span>
            <span className="text-sm font-sans text-red-400 font-bold">{quest.boss_defeated}</span>
          </div>
          <div className="text-right flex flex-col items-end">
            <span className="text-[10px] font-pixel text-gray-500 uppercase mb-1">Potential Savings</span>
            <span className="text-lg font-sans text-yellow-500 font-bold">{quest.gold_saved}</span>
          </div>
        </div>
      </div>
    </button>
  );
};

interface QuestBoardProps {
  inventory: Ingredient[];
  onQuestSelected: (quest: RecipeQuest) => void; // Renamed prop
  onBackToHub: () => void; // Renamed prop
  isLoadingQuest: boolean; // Added new prop
  onSpeakCdm: (audioData: { narration?: string, speakNow?: boolean }) => Promise<void>;
  isDemoMode: boolean; // New prop for demo mode
}

const QuestBoard: React.FC<QuestBoardProps> = ({ 
  inventory, 
  onQuestSelected, // Destructure renamed prop
  onBackToHub, // Destructure renamed prop
  isLoadingQuest, // Destructure new prop
  onSpeakCdm, 
  isDemoMode 
}) => {
  const [quests, setQuests] = useState<RecipeQuest[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchQuests = async () => {
      if (isLoadingQuest) return; // Prevent fetching if another quest is already loading
      try {
        const result = await generateQuestBoard(inventory, "$50 Weekly Saving", isDemoMode); // Pass isDemoMode
        setQuests(result);
        // FIX: Use onSpeakCdm and set speakNow to true
        await onSpeakCdm({ // Await this
          narration: "New quests have appeared on the board, Chef!",
          speakNow: true,
        });
      } catch (e) {
        console.error(e);
        // FIX: Use onSpeakCdm and set speakNow to true
        await onSpeakCdm({ // Await this
          narration: "Failed to load quests, Chef. The kitchen spirits are restless!",
          speakNow: true,
        });
      } finally {
        setLoading(false);
      }
    };
    fetchQuests();
  }, [inventory, onSpeakCdm, isDemoMode, isLoadingQuest]); // Add isLoadingQuest to dependency array

  if (loading || isLoadingQuest) { // Check isLoadingQuest also
    return (
      <div className="flex flex-col items-center justify-center py-24">
        <div className="animate-bounce text-6xl mb-8">📜</div>
        <p className="font-pixel text-yellow-400 text-sm animate-pulse tracking-widest">CONSULTING THE ANCIENT COOKBOOKS...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <h2 className="font-pixel text-center text-xs text-blue-400 uppercase tracking-[0.2em] mb-4">Choose Your Trial</h2>
      
      <div className="grid gap-6">
        {quests.map((q) => (
          // FIX: Pass onSpeakCdm to QuestItem, use onQuestSelected
          <QuestItem key={q.id} quest={q} onSelect={onQuestSelected} onSpeakCdm={onSpeakCdm} />
        ))}
      </div>

      <button 
        onClick={() => {
          onBackToHub(); // Changed to onBackToHub
          // Narration for onBack is now handled in App.tsx
        }}
        className="font-pixel text-[10px] text-gray-500 hover:text-white transition-colors mt-8 py-4 uppercase tracking-widest"
      >
        [ RETURN TO HUB ]
      </button>
    </div>
  );
};

export default QuestBoard;