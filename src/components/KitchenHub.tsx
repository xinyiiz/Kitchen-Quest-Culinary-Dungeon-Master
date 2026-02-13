// components/KitchenHub.tsx
import React, { useState } from 'react';
import { Ingredient, SaveFile } from '../types';
// Removed SplitInstructionModal import

interface KitchenHubProps {
  activeSave: SaveFile; // New prop for active save file
  inventory: Ingredient[];
  onScan: () => void; // Renamed prop
  onOpenBoard: () => void; // Renamed prop
  onAddIngredient: (ingredient: Ingredient) => void; // New prop for manual input
  onRemoveIngredient: (ingredientId: string) => void; // NEW: Prop for removing ingredients
  onClearSave: () => void; // New prop for clearing save
  onSpeakCdm: (audioData: { narration?: string, speakNow?: boolean }) => Promise<void>;
  isDemoMode: boolean;
}

const KitchenHub: React.FC<KitchenHubProps> = ({ 
  activeSave, // Destructure new prop
  inventory, 
  onScan, // Destructure renamed prop
  onOpenBoard, // Destructure renamed prop
  onAddIngredient, 
  onRemoveIngredient, // Destructure new prop
  onClearSave, // Destructure new prop
  onSpeakCdm, 
  isDemoMode,
}) => {
  const [newIngredientName, setNewIngredientName] = useState(''); // State for new ingredient input
  
  const expiringCount = inventory.filter(i => i.status === 'Expiring').length;

  const handleGoScanClick = () => {
    // Narration for onGoScan is now handled in App.tsx
    onScan(); // Changed to onScan
  };

  const handleGoQuestsClick = () => {
    // Narration for onGoQuests is now handled in App.tsx
    onOpenBoard(); // Changed to onOpenBoard
  };

  const handleAddNewIngredient = async () => { // Made async
    if (newIngredientName.trim()) {
      const newIngredient: Ingredient = {
        name: newIngredientName.trim(),
        quantity: '1', // Default quantity
        status: 'Pantry', // Default status for manually added ingredients
        id: `manual-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`, // Unique ID
      };
      onAddIngredient(newIngredient);
      setNewIngredientName(''); // Clear input field
      // FIX: Use onSpeakCdm and set speakNow to true
      await onSpeakCdm({ // Await this
        narration: `New ingredient ${newIngredient.name} added to your stash, Chef!`,
        speakNow: true,
      });
    } else {
      // FIX: Use onSpeakCdm and set speakNow to true
      await onSpeakCdm({ // Await this
        narration: "Don't forget to name your ingredient, Chef!",
        speakNow: true,
      });
    }
  };

  return (
    <div className="flex flex-col gap-6 py-4">
      <div className="bg-[#1a1a1a] p-6 pixel-border">
        <h2 className="font-pixel text-sm text-yellow-400 mb-4 uppercase">The Kitchen Hub</h2>
        <p className="text-gray-300 mb-6 italic">"Welcome to your sanctuary, Chef. The fog of war hides many ingredients."</p>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <button 
            onClick={handleGoScanClick}
            className="flex flex-col items-center bg-[#2d3436] p-6 pixel-border hover:bg-[#3d4548] transition-all group"
          >
            <span className="text-4xl mb-2 group-hover:scale-110 transition-transform">🔍</span>
            <h3 className="font-pixel text-xs text-blue-400 mb-1 uppercase">Update Inventory</h3>
            <p className="text-[12px] text-gray-400 text-center">"Scan the Loot! Refresh your cooling chamber logs."</p>
          </button>

          <button 
            onClick={handleGoQuestsClick}
            disabled={inventory.length === 0}
            className={`flex flex-col items-center p-6 pixel-border transition-all group ${inventory.length === 0 ? 'bg-gray-800 opacity-50 cursor-not-allowed' : 'bg-[#2d3436] hover:bg-[#3d4548]'}`}
          >
            <span className="text-4xl mb-2 group-hover:scale-110 transition-transform">⚔️</span>
            <h3 className="font-pixel text-xs text-green-400 mb-1 uppercase">Embark on Quest</h3>
            <p className="text-[12px] text-gray-400 text-center">"Check the Bounty! List recipes based on inventory."</p>
          </button>
        </div>
        
      </div>

      <div className="bg-[#1a1a1a] p-4 pixel-border">
        <div className="flex justify-between items-center mb-4">
          <h3 className="font-pixel text-[10px] text-blue-400 uppercase">Inventory Cache</h3>
          <span className="text-[10px] font-pixel text-red-500">{expiringCount} BOSSES DETECTED</span>
        </div>
        
        {inventory.length === 0 ? (
          <p className="text-center text-gray-600 font-pixel text-[10px] py-4">INVENTORY EMPTY. PLEASE SCAN LARDER.</p>
        ) : (
          <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto pixel-scroll p-2">
            {inventory.map((item) => ( // Removed idx as item.id is now reliable
              <div 
                key={item.id} // Use item.id as key
                className={`relative group p-2 border-2 text-[10px] font-pixel flex items-center gap-1 ${item.status === 'Expiring' ? 'border-red-500 bg-red-950 text-red-200 animate-pulse' : 'border-gray-800 bg-black text-gray-400'}`}
              >
                <span>{item.name}</span>
                <button 
                  onClick={() => onRemoveIngredient(item.id)} 
                  className="ml-1 text-red-400 text-xs px-1 hover:bg-red-900 rounded-full opacity-0 group-hover:opacity-100 transition-opacity leading-none"
                  aria-label={`Remove ${item.name}`}
                >
                  ✖
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Manual Ingredient Entry Section */}
      <div className="bg-[#1a1a1a] p-4 pixel-border">
        <h3 className="font-pixel text-[10px] text-yellow-400 mb-4 uppercase">Manual Ingredient Entry</h3>
        <p className="text-gray-300 text-[12px] mb-4 italic">"Found a rare item? Log it here, Chef!"</p>
        <div className="flex flex-col sm:flex-row gap-4">
          <input
            type="text"
            value={newIngredientName}
            onChange={(e) => setNewIngredientName(e.target.value)}
            onKeyPress={(e) => { // Allow pressing Enter to add
              if (e.key === 'Enter') {
                handleAddNewIngredient();
              }
            }}
            placeholder="Ingredient Name (e.g., 'Fresh Herbs')"
            className="flex-grow bg-black border-2 border-gray-700 p-3 font-pixel text-yellow-400 focus:border-blue-500 outline-none"
          />
          <button
            onClick={handleAddNewIngredient}
            className="w-full sm:w-auto bg-green-600 hover:bg-green-500 p-4 pixel-border font-pixel text-sm flex items-center justify-center gap-2 transition-all active:translate-y-1"
          >
            <span className="text-xl">✨</span> ADD INGREDIENT
          </button>
        </div>
      </div>
      {/* Clear Save Button for debugging */}
      {!isDemoMode && (
        <button
          onClick={onClearSave}
          className="font-pixel text-[10px] text-red-500 hover:text-red-400 transition-colors mt-4 py-2 uppercase tracking-widest text-center"
        >
          [ CLEAR LOCAL SAVE DATA ]
        </button>
      )}
    </div>
  );
};

export default KitchenHub;