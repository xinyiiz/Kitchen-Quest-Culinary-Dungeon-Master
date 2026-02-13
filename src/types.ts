// types.ts
export enum Difficulty {
  NOVICE = 'Novice',
  CHEF = 'Chef',
  MASTER = 'Master'
}

export enum QuestType {
  SCAVENGER = 'Scavenger Hunt',
  TIMED = 'Timed Trial',
  BOSS = 'Boss Battle'
}

export interface CharacterStats {
  knifeSkills: number;
  heatControl: number;
  goldSaved: number;
  level: number;
  xp: number;
}

export interface SaveFile {
  id: string; // The primary identifier, which is the lowercase username.
  name: string; // The display name of the chef.
  difficulty: Difficulty;
  stats: CharacterStats;
}

export interface Ingredient {
  id: string; // Changed to required
  name: string;
  quantity: string;
  status: 'Fresh' | 'Expiring' | 'Pantry';
  burnHazard?: boolean;
}

export interface TimerAction {
  time: number; // in minutes
  label: string;
}

// HeatLevel now expected to be a string, consistent with new parsing logic
export type HeatLevel = string; 

export interface QuestStep {
  id: number; // id is now required
  level_name?: string; // Made optional as generateQuestBoard might not initially provide it
  name: string;
  instruction: string;
  miniGameType?: 'CHOP' | 'SIZZLE' | 'PREP' | 'WAIT'; // Made optional as generateQuestBoard might not initially provide it
  completed: boolean;
  reference_visual?: string; // Made optional as generateQuestBoard might not initially provide it
  reference_image_prompt?: string; // Made optional as generateQuestBoard might not initially provide it
  reference_image_url?: string; // NEW: URL for generated image (runtime)
}

export interface RecipeQuest {
  id: string;
  quest_name: string;
  difficulty: string;
  loot_preview: string; // Visual description of final dish
  ingredients: Ingredient[];
  steps: QuestStep[];
  xp_reward: number;
  gold_saved: string;
  boss_defeated: string;
  cdm_intro_narration?: string; // Made optional to align with generation logic
}

export interface EvaluationResult {
  rank: string;
  feedback: string;
  xpBonus: number;
  safety_alert?: string;
  cdmSpeech?: string;
}

// NEW: Interfaces for Food Safety AI assistant
export interface FoodSafetyRisk {
  type: "knife" | "raw_meat" | "oil_splatter" | "undercooking" | "cross_contamination" | "burn" | "allergen" | "other";
  description: string;
}

export interface FoodSafetyResult {
  is_safe: boolean;
  risk_level: "none" | "low" | "medium" | "high";
  detected_risks: FoodSafetyRisk[];
  safety_advice: string;
  requires_confirmation: boolean;
  confirmation_message: string;
}