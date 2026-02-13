// App.tsx
import React, { useEffect, useRef, useState, useCallback } from "react";
import {
  Difficulty,
  SaveFile,
  RecipeQuest,
  CharacterStats,
  Ingredient,
  QuestStep,
} from "./types";

import { DEMO_SAVE_FILE, DEMO_INVENTORY } from "./constants";
import { splitInstructionIntoSteps } from "./services/geminiService"; // Updated import
import { geminiTextToSpeech, decodeAudioData } from "./services/geminiTtsService"; // NEW import for TTS service

import CharacterHeader from "./components/CharacterHeader";
import Login from "./components/Login";
import KitchenHub from "./components/KitchenHub";
import QuestBoard from "./components/QuestBoard";
import QuestInterface from "./components/QuestInterface";
import FridgeScanner from "./components/FridgeScanner";

type View = "LOGIN" | "HUB" | "SCAN" | "BOARD" | "QUEST";

// Interface for localStorage saved data for a specific user
interface SavedData {
  activeSave: SaveFile; // SaveFile is always present when data is saved for a user
  currentView: View;
  activeQuest: RecipeQuest | null;
  inventory: Ingredient[];
  isDemoMode: boolean; // Should be false if loaded from a user save
}

// Local Storage Keys
const LAST_ACTIVE_USER_KEY = 'kitchenQuestLastActiveUser';
const USER_SAVE_PREFIX = 'kitchenQuestUser-';

// Helper to get user-specific local storage key
const getLocalStorageKey = (username: string) => `${USER_SAVE_PREFIX}${username.toLowerCase()}`;

const App: React.FC = () => {
  const [activeSave, setActiveSave] = useState<SaveFile | null>(null);
  const [currentView, setCurrentView] = useState<View>("LOGIN");
  const [activeQuest, setActiveQuest] = useState<RecipeQuest | null>(null);
  const [inventory, setInventory] = useState<Ingredient[]>([]);
  const [isDemoMode, setIsDemoMode] = useState(false);
  const [isLoadingQuest, setIsLoadingQuest] = useState(false);

  const audioContextRef = useRef<AudioContext | null>(null);
  const currentAudioSourceRef = useRef<AudioBufferSourceNode | null>(null);
  const saveTimeoutRef = useRef<number | null>(null);
  const didRestoreRef = useRef(false);

  // Initialize AudioContext
  useEffect(() => {
    if (!audioContextRef.current) {
      audioContextRef.current = new window.AudioContext();
    }

    return () => {
      try {
        if (currentAudioSourceRef.current) {
          currentAudioSourceRef.current.stop();
          currentAudioSourceRef.current.disconnect();
          currentAudioSourceRef.current = null;
        }
      } catch {
        // ignore
      }

      if (audioContextRef.current) {
        audioContextRef.current.close();
        audioContextRef.current = null;
      }
    };
  }, []);

  /**
   * Part B: CDM response trigger (Unified Narrator)
   * - Logs ALL narration to console
   * - Conditionally calls Gemini TTS when `speakNow` is true AND NOT in demo mode.
   * - Never logs "undefined"
   */
  const handleCdmNarration = useCallback(async ({
    narration,
    speakNow = false,
  }: {
    narration?: string;
    speakNow?: boolean;
  }): Promise<void> => {
    const cleaned = narration?.trim();
    if (!cleaned) return Promise.resolve();

    console.log(`[CDM Response - Narration]: ${cleaned}`);

    if (isDemoMode) return Promise.resolve();
    if (!speakNow) return Promise.resolve();

    if (!audioContextRef.current) {
      console.error("AudioContext not initialized.");
      return Promise.reject(new Error("AudioContext not initialized."));
    }

    return new Promise<void>(async (resolve, reject) => {
      try {
        if (audioContextRef.current!.state === "suspended") {
          await audioContextRef.current!.resume();
        }

        if (currentAudioSourceRef.current) {
          currentAudioSourceRef.current.stop();
          currentAudioSourceRef.current.disconnect();
          currentAudioSourceRef.current = null;
        }

        const audioBufferArray = await geminiTextToSpeech(cleaned);
        if (!audioBufferArray) {
          console.warn("Gemini TTS returned no audio (instruction).");
          return resolve();
        }
        
        const decodedAudio = await decodeAudioData(
          new Uint8Array(audioBufferArray),
          audioContextRef.current!,
          24000,
          1
        );

        const source = audioContextRef.current!.createBufferSource();
        source.buffer = decodedAudio;
        source.connect(audioContextRef.current!.destination);
        
        source.onended = () => {
          currentAudioSourceRef.current = null;
          resolve();
        };

        source.start(0);
        currentAudioSourceRef.current = source;
      } catch (error) {
        console.error("Error playing instruction narration with Gemini TTS:", error);
        reject(error);
      }
    });
  }, [isDemoMode]);

  // Handle logging out and clearing session data
  const handleLogout = async () => {
    if (activeSave && !isDemoMode) {
      localStorage.removeItem(getLocalStorageKey(activeSave.name)); // Clear THIS user's save
    }
    localStorage.removeItem(LAST_ACTIVE_USER_KEY); // Clear last active user
    
    setActiveSave(null);
    setCurrentView("LOGIN");
    setActiveQuest(null);
    setInventory([]);
    setIsDemoMode(false);

    await handleCdmNarration({ narration: "Logging out, Chef! See you soon!", speakNow: true });
  };

  // Clear current user's save data (used by debug button)
  const clearCurrentUserSaveAndLogout = async () => {
    if (activeSave && !isDemoMode) {
      localStorage.removeItem(getLocalStorageKey(activeSave.name));
      await handleCdmNarration({ narration: "Your save data has been wiped, Chef! Starting fresh!", speakNow: true });
    } else {
      await handleCdmNarration({ narration: "No active user save to clear, Chef!", speakNow: true });
    }
    await handleLogout(); // Log out after clearing
  };

  // Part A: Restore Effect (runs once on component mount)
  useEffect(() => {
    if (didRestoreRef.current) return;
    didRestoreRef.current = true;

    const restoreSave = async () => {
      const lastActiveUsername = localStorage.getItem(LAST_ACTIVE_USER_KEY);

      if (lastActiveUsername) {
        const userSaveKey = getLocalStorageKey(lastActiveUsername);
        const savedDataString = localStorage.getItem(userSaveKey);

        if (savedDataString) {
          try {
            const savedData: SavedData = JSON.parse(savedDataString);
            
            // Check if loaded data is valid for restoration
            if (savedData.activeSave) {
              setActiveSave(savedData.activeSave);
              setInventory(savedData.inventory);
              // Ensure demo mode is explicitly false if loading a user save
              setIsDemoMode(false); 
              setCurrentView(savedData.currentView || "HUB");
              setActiveQuest(savedData.activeQuest);
              console.log(`Save restored for user: ${savedData.activeSave.name}`);

              await handleCdmNarration({
                narration: savedData.activeQuest
                  ? `Welcome back, ${savedData.activeSave.name}! Resuming your quest!`
                  : `Welcome back, ${savedData.activeSave.name}! Your kitchen awaits!`,
                speakNow: true,
              });
              return; // Exit if restore successful
            }
          } catch (error) {
            console.error("Failed to parse saved data for", lastActiveUsername, ":", error);
            // Fall through to clear last active user and go to login
          }
        }
        // If savedDataString was null or parsing failed
        localStorage.removeItem(LAST_ACTIVE_USER_KEY); // Clear invalid last active user
        console.log("Last active user save not found or corrupted. Directing to LOGIN.");
        await handleCdmNarration({ narration: "Previous save corrupted, Chef! Starting fresh!", speakNow: true });
      }

      // If no last active user or previous restoration failed, go to LOGIN
      setCurrentView("LOGIN");
      console.log("No last active user found. Starting at LOGIN.");
    };

    restoreSave();
  }, [handleCdmNarration]);

  // Part A: Auto-save Effect (runs on dependency changes, with debounce)
  useEffect(() => {
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    // Only auto-save if a user is actively logged in and not in demo mode
    if (activeSave && !isDemoMode) {
      saveTimeoutRef.current = window.setTimeout(() => {
        const dataToSave: SavedData = {
          activeSave,
          currentView,
          activeQuest,
          inventory,
          isDemoMode: false, // Explicitly false for user saves
        };
        try {
          const userSaveKey = getLocalStorageKey(activeSave.name);
          localStorage.setItem(userSaveKey, JSON.stringify(dataToSave));
          console.log(`Game state saved for ${activeSave.name} to localStorage.`);
        } catch (error) {
          console.error("Failed to save data to localStorage:", error);
        }
      }, 500); // Debounce time
    }

    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, [activeSave, currentView, activeQuest, inventory, isDemoMode]); // Dependencies for auto-save

  // --- Game State & Navigation Logic ---

  const handleLogin = async (inputName: string) => {
    const username = inputName.trim();
    if (!username) {
      await handleCdmNarration({ narration: "Please enter a Chef Name, Hero!", speakNow: true });
      return;
    }
    const lowerUsername = username.toLowerCase();
    const userSaveKey = getLocalStorageKey(lowerUsername);

    let loadedSaveFile: SaveFile;
    let loadedInventory: Ingredient[];
    let loadedCurrentView: View = "HUB"; // Default for new user
    let loadedActiveQuest: RecipeQuest | null = null;
    let loadedIsDemoMode: boolean = false; // Always false for proper user login

    const existingSaveString = localStorage.getItem(userSaveKey);

    if (existingSaveString) {
      try {
        const loadedData: SavedData = JSON.parse(existingSaveString);
        loadedSaveFile = loadedData.activeSave;
        loadedInventory = loadedData.inventory;
        loadedCurrentView = loadedData.currentView;
        loadedActiveQuest = loadedData.activeQuest;
        // ensure demo mode is false for a loaded user save
        loadedIsDemoMode = false; 

        await handleCdmNarration({
          narration: `Welcome back, ${loadedSaveFile.name}! Resuming your quest!`,
          speakNow: true,
        });
      } catch (error) {
        console.error("Corrupted save data for user:", lowerUsername, error);
        // Fallback to creating a new save on corruption
        loadedSaveFile = {
          id: lowerUsername, // id is username (lowercase)
          name: username, // Display name (original casing)
          difficulty: Difficulty.NOVICE,
          stats: { knifeSkills: 1, heatControl: 1, goldSaved: 0, level: 1, xp: 0 },
        };
        loadedInventory = [];
        await handleCdmNarration({
          narration: `Welcome, ${username}, your previous save was corrupted. Starting fresh!`,
          speakNow: true,
        });
      }
    } else {
      // New user
      loadedSaveFile = {
        id: lowerUsername, // id is username (lowercase)
        name: username, // Display name (original casing)
        difficulty: Difficulty.NOVICE,
        stats: { knifeSkills: 1, heatControl: 1, goldSaved: 0, level: 1, xp: 0 },
      };
      loadedInventory = [];
      await handleCdmNarration({
        narration: `Welcome, ${username}, to Kitchen Quest! Prepare to cook!`,
        speakNow: true,
      });
    }

    setActiveSave(loadedSaveFile);
    setInventory(loadedInventory);
    setIsDemoMode(loadedIsDemoMode);
    setCurrentView(loadedCurrentView);
    setActiveQuest(loadedActiveQuest);

    localStorage.setItem(LAST_ACTIVE_USER_KEY, lowerUsername);
  };

  const handleEnterDemoMode = async () => {
    setIsDemoMode(true);
    // DEMO_SAVE_FILE's ID needs to be consistent with how SaveFile.id is used now
    const demoSaveFileWithId: SaveFile = {
      ...DEMO_SAVE_FILE,
      id: DEMO_SAVE_FILE.name.toLowerCase(), 
      name: DEMO_SAVE_FILE.name,
    };
    setActiveSave(demoSaveFileWithId);
    
    const demoInventoryWithIds = DEMO_INVENTORY.map(item => ({
      ...item,
      id: item.id || `demo-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`
    }));
    setInventory(demoInventoryWithIds);
    setCurrentView("HUB");
    setActiveQuest(null); // No active quest in demo mode initially

    // Do NOT set LAST_ACTIVE_USER_KEY for demo mode

    await handleCdmNarration({
      narration:
        "Entering Demo Mode, Chef! No APIs needed here, but the adventure is just as real!",
      speakNow: true,
    });
  };

  // Helper to generate a unique ID for ingredients
  const generateUniqueId = () => `ing-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;

  const handleInventoryUpdated = async (newInv: Ingredient[], cdmSpeech: string) => {
    const inventoryWithIds = newInv.map(item => ({
      ...item,
      id: item.id || generateUniqueId()
    }));
    setInventory(inventoryWithIds);
    setCurrentView("HUB");

    await handleCdmNarration({ narration: cdmSpeech, speakNow: true });
  };

  const handleAddIngredient = async (newIngredient: Ingredient) => {
    setInventory((prev) => [
      ...prev,
      { ...newIngredient, id: newIngredient.id || generateUniqueId() }
    ]);

    await handleCdmNarration({
      narration: `New ingredient ${newIngredient.name} added to your stash, Chef!`,
      speakNow: true,
    });
  };

  const handleRemoveIngredientById = async (ingredientId: string) => {
    setInventory((prev) => prev.filter(item => item.id !== ingredientId));
    await handleCdmNarration({ narration: "Ingredient removed from your inventory, Chef!", speakNow: true });
  };

  const handleQuestSelected = async (selectedQuest: RecipeQuest) => {
    setIsLoadingQuest(true);

    await handleCdmNarration({
      narration: "Processing quest details, Chef! Preparing your micro-steps!",
      speakNow: true,
    });

    let combinedMicroSteps: QuestStep[] = [];
    let currentId = 1;

    try {
      for (const highLevelStep of selectedQuest.steps) {
        const microSteps = await splitInstructionIntoSteps(
          highLevelStep.instruction,
          isDemoMode
        );

        const reindexed = microSteps.map((step) => ({
          ...step,
          id: currentId++,
          completed: false,
        }));

        combinedMicroSteps = [...combinedMicroSteps, ...reindexed];
      }

      const processedQuest: RecipeQuest = {
        ...selectedQuest,
        steps: combinedMicroSteps,
      };

      setActiveQuest(processedQuest);
      setCurrentView("QUEST");

      await handleCdmNarration({
        narration:
          processedQuest.cdm_intro_narration ||
          `Commencing Quest: ${processedQuest.quest_name}!`,
        speakNow: true,
      });
    } catch (error) {
      console.error("Failed to process quest steps:", error);

      await handleCdmNarration({
        narration: "Quest processing failed, Chef! Try another quest!",
        speakNow: true,
      });

      setCurrentView("BOARD");
    } finally {
      setIsLoadingQuest(false);
    }
  };

  const handleQuestComplete = async (xp: number, gold: string) => {
    if (!activeSave || !activeQuest) return;

    const numericGold = parseFloat(gold.replace(/[^0-9.]/g, "")) || 0;

    const newStats: CharacterStats = {
      ...activeSave.stats,
      xp: activeSave.stats.xp + xp,
      goldSaved: activeSave.stats.goldSaved + numericGold,
      level: Math.floor((activeSave.stats.xp + xp) / 1000) + 1,
    };
    
    // Remove consumed ingredients from inventory
    const ingredientsUsedInQuest = activeQuest.ingredients.map(ing => ing.name.toLowerCase());
    let updatedInventory = [...inventory];
    
    ingredientsUsedInQuest.forEach(usedName => {
        const indexToRemove = updatedInventory.findIndex(invItem => invItem.name.toLowerCase() === usedName);
        if (indexToRemove !== -1) {
            updatedInventory.splice(indexToRemove, 1);
        }
    });

    setInventory(updatedInventory);
    setActiveSave({ ...activeSave, stats: newStats });
    setCurrentView("HUB");
    setActiveQuest(null);

    await handleCdmNarration({
      narration: `Quest completed, Chef! You earned ${xp} XP and ${gold} gold! Consumed ingredients have been removed from your inventory!`,
      speakNow: true,
    });
  };

  return (
    <div className="min-h-screen bg-[#0c0c0c] text-[#f0f0f0] flex flex-col items-center p-4">
      {activeSave && (
        <CharacterHeader
          stats={activeSave.stats}
          name={activeSave.name}
          onLogout={handleLogout} // Pass the new handleLogout function
        />
      )}

      {isDemoMode && (
        <div className="fixed top-4 right-4 bg-yellow-900 border border-yellow-500 text-yellow-200 text-[8px] font-pixel px-2 py-1 z-50 opacity-70">
          DEMO MODE ACTIVE
        </div>
      )}

      {/* Debug: Clear User Save Button (replaces global clear save) */}
      {currentView !== "LOGIN" && !isDemoMode && ( // Only show if logged in and not in demo
        <button
          onClick={clearCurrentUserSaveAndLogout}
          className="fixed bottom-4 left-4 z-50 bg-red-800 hover:bg-red-700 text-white font-pixel text-[8px] px-3 py-1 rounded opacity-50 hover:opacity-100 transition-opacity"
        >
          CLEAR MY SAVE
        </button>
      )}

      <div className="w-full max-w-2xl mt-4 flex-grow flex flex-col relative">
        {currentView === "LOGIN" && (
          <Login
            onLogin={handleLogin}
            onEnterDemoMode={handleEnterDemoMode}
            onSpeakCdm={handleCdmNarration}
          />
        )}

        {currentView === "HUB" && activeSave && (
          <KitchenHub
            activeSave={activeSave}
            inventory={inventory}
            onScan={async () => {
              setCurrentView("SCAN");
              await handleCdmNarration({ narration: "Heading to the fridge scanner, Chef! Time to assess your supplies.", speakNow: true });
            }}
            onOpenBoard={async () => {
              setCurrentView("BOARD");
              await handleCdmNarration({ narration: "To the quest board, Chef! Discover your next culinary adventure.", speakNow: true });
            }}
            onAddIngredient={handleAddIngredient}
            onRemoveIngredient={handleRemoveIngredientById}
            onClearSave={clearCurrentUserSaveAndLogout} // Also points to the new clear save
            isDemoMode={isDemoMode}
            onSpeakCdm={handleCdmNarration}
          />
        )}

        {currentView === "SCAN" && activeSave && (
          <FridgeScanner
            inventory={inventory}
            onInventoryUpdated={handleInventoryUpdated}
            onBack={async () => {
              setCurrentView("HUB");
              await handleCdmNarration({ narration: "Returning to the kitchen hub, Chef.", speakNow: true });
            }}
            isDemoMode={isDemoMode}
            onSpeakCdm={handleCdmNarration}
          />
        )}

        {currentView === "BOARD" && activeSave && (
          <QuestBoard
            inventory={inventory}
            onQuestSelected={handleQuestSelected}
            onBackToHub={async () => {
              setCurrentView("HUB");
              await handleCdmNarration({ narration: "Returning to the kitchen hub, Chef.", speakNow: true });
            }}
            isLoadingQuest={isLoadingQuest}
            isDemoMode={isDemoMode}
            onSpeakCdm={handleCdmNarration}
          />
        )}

        {currentView === "QUEST" && activeSave && activeQuest && (
          <QuestInterface
            quest={activeQuest}
            onQuestComplete={handleQuestComplete}
            onAbandonQuest={async () => {
              setActiveQuest(null);
              setCurrentView("HUB");
              await handleCdmNarration({ narration: "Abandoning the quest, Chef. Perhaps another time!", speakNow: true });
            }}
            isDemoMode={isDemoMode}
            onSpeakCdm={handleCdmNarration}
          />
        )}

        {isLoadingQuest && (
          <div className="fixed inset-0 bg-black/90 z-50 flex flex-col items-center justify-center p-8 backdrop-blur-sm">
            <div className="w-20 h-20 border-4 border-blue-500 border-t-transparent animate-spin rounded-full mb-10"></div>
            <h3 className="font-pixel text-xl text-blue-400 mb-4 tracking-widest">
              PREPARING QUEST STEPS...
            </h3>
            <p className="text-gray-400 font-sans text-lg italic text-center max-w-md animate-pulse">
              "Breaking down complex instructions into beginner-friendly micro-levels!"
            </p>
          </div>
        )}
      </div>

      <footer className="mt-8 opacity-50 text-center">
        <p className="font-pixel text-[10px]">© 2025 KITCHEN QUEST CDM</p>
      </footer>
    </div>
  );
};

export default App;