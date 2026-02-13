// services/geminiService.ts
import { GoogleGenAI, Type } from "@google/genai";
import { RecipeQuest, Ingredient, EvaluationResult, QuestStep, FoodSafetyResult, FoodSafetyRisk } from "../types"; // Import QuestStep and new types
import {
  DEMO_INVENTORY,
  DEMO_QUESTS,
  DEMO_EVALUATION_RESULT_SUCCESS,
  DEMO_EVALUATION_RESULT_FAIL_SAFETY,
  DEMO_EVALUATION_RESULT_BAD_COOKING,
  FALLBACK_SPLIT_STEPS // Import fallback
} from '../constants'; // Import demo data

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || '' }); // Ensure API_KEY is always defined

const CDM_SYSTEM_INSTRUCTION = `You are the "Culinary Dungeon Master" (CDM), an eccentric, high-energy indie-game narrator (similar to "Cooking Mama"). You guide the player through real-life kitchen quests using visuals and smart-utility triggers.
Tone Rules: Speak with emotion. Use a "Victory Fanfare" tone for successes and a "Disappointed Shopkeeper" tone for skips.
Onomatopoeia: Vocalize kitchen sounds (e.g., "Sizzle sizzle!", "Chop-chop-chop!").
Narration should be 1-2 sentences max. Address the player as "Chef".

When generating quest steps, include smart utility triggers:
- **Timer Command:** Use '[ACTION: SET_TIMER | TIME: Xm | LABEL: "Y"]' immediately after an instruction requiring a duration.
- **Heat Level:** Use '[HEAT: 🔥 (Simmer)]', '[HEAT: 🔥🔥 (Steady)]', or '[HEAT: 🔥🔥🔥 (Searing!)]' where applicable.
`;

// NEW: System Instruction for the Food Safety AI Assistant
const FOOD_SAFETY_SYSTEM_INSTRUCTION = `You are a Food Safety AI assistant integrated into a cooking application.

Your role is to analyze ONE cooking instruction and determine whether it contains potential safety risks.

You MUST return STRICT JSON only.
Do NOT include explanations outside JSON.
Do NOT include markdown formatting.
Do NOT include additional commentary.

-----------------------------------
TASK:

1. Detect if the step contains any potential safety risks related to:
   - Raw meat handling (especially chicken, pork, seafood)
   - Cross-contamination (raw + cooked food contact)
   - Undercooking risk
   - Knife usage
   - Hot oil / splatter
   - Burns / fire hazards
   - Food poisoning risks
   - Allergen exposure

2. If risk exists:
   - Clearly describe the risk
   - Provide a short safer alternative or precaution
   - Ask the user to confirm before proceeding

3. If no risk:
   - Mark it as safe

-----------------------------------
RESPONSE FORMAT (STRICT JSON):

{
  "is_safe": true | false,
  "risk_level": "none" | "low" | "medium" | "high",
  "detected_risks": [
    {
      "type": "knife | raw_meat | oil_splatter | undercooking | cross_contamination | burn | allergen | other",
      "description": "short explanation of the risk"
    }
  ],
  "safety_advice": "short actionable safety tip or safer alternative",
  "requires_confirmation": true | false,
  "confirmation_message": "If risk exists, ask user clearly: Continue? If safe, return empty string."
}

Rules:
- If no risks are detected:
  is_safe = true
  risk_level = "none"
  detected_risks = []
  safety_advice = ""
  requires_confirmation = false
  confirmation_message = ""

- If risk_level is medium or high:
  requires_confirmation must be true

Keep responses concise and practical.
Never hallucinate extreme danger.
Be realistic and helpful.
`;

// Generic retry function with exponential backoff
export async function retry<T>(
  apiCall: () => Promise<T>,
  maxRetries: number = 3,
  initialDelayMs: number = 1000
): Promise<T> {
  let retries = 0;
  while (retries < maxRetries) {
    try {
      return await apiCall();
    } catch (error: any) {
      // Check for specific 503 error code or message
      const isUnavailableError =
        error.code === 503 ||
        (error.message && error.message.includes("This model is currently experiencing high demand."));

      if (isUnavailableError && retries < maxRetries - 1) {
        retries++;
        const delay = initialDelayMs * Math.pow(2, retries - 1); // Exponential backoff
        console.warn(`API call failed (503 UNAVAILABLE), retrying in ${delay}ms... (Attempt ${retries}/${maxRetries})`);
        await new Promise(resolve => setTimeout(resolve, delay));
      } else {
        // Re-throw if it's not a 503 or max retries reached, or another type of error
        console.error(`API call failed after ${retries} retries:`, error);
        throw error;
      }
    }
  }
  // This line should ideally not be reached if an error is always thrown on final failure
  throw new Error("API call failed after maximum retries.");
}


// NEW: Function to check a cooking step for food safety risks
export const checkFoodSafety = async (cookingStep: string): Promise<FoodSafetyResult> => {
  // Use 'gemini-3-flash-preview' for basic text tasks
  const model = 'gemini-3-flash-preview';

  return retry(async () => {
    try {
      const response = await ai.models.generateContent({
        model,
        contents: `INPUT COOKING STEP:\n"${cookingStep}"`,
        config: {
          systemInstruction: FOOD_SAFETY_SYSTEM_INSTRUCTION,
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              is_safe: { type: Type.BOOLEAN },
              risk_level: { type: Type.STRING, enum: ["none", "low", "medium", "high"] },
              detected_risks: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    type: { type: Type.STRING, enum: ["knife", "raw_meat", "oil_splatter", "undercooking", "cross_contamination", "burn", "allergen", "other"] },
                    description: { type: Type.STRING }
                  },
                  required: ["type", "description"]
                }
              },
              safety_advice: { type: Type.STRING },
              requires_confirmation: { type: Type.BOOLEAN },
              confirmation_message: { type: Type.STRING }
            },
            required: ["is_safe", "risk_level", "detected_risks", "safety_advice", "requires_confirmation", "confirmation_message"]
          }
        }
      });

      const parsedResult: FoodSafetyResult = JSON.parse(response.text || '{}');

      // Validate the parsed result against the expected schema, provide defaults if missing
      const validatedResult: FoodSafetyResult = {
        is_safe: typeof parsedResult.is_safe === 'boolean' ? parsedResult.is_safe : false,
        risk_level: parsedResult.risk_level || 'none',
        detected_risks: Array.isArray(parsedResult.detected_risks) ? parsedResult.detected_risks : [],
        safety_advice: parsedResult.safety_advice || '',
        requires_confirmation: typeof parsedResult.requires_confirmation === 'boolean' ? parsedResult.requires_confirmation : false,
        confirmation_message: parsedResult.confirmation_message || '',
      };

      console.log(`[checkFoodSafety] Result for "${cookingStep.substring(0, 50)}...":`, validatedResult);
      return validatedResult;

    } catch (error) {
      console.error(`Error checking food safety for step "${cookingStep.substring(0, 50)}...":`, error);
      // Return a default "safe" result on API error to avoid blocking, but log the error
      return {
        is_safe: true,
        risk_level: 'none',
        detected_risks: [],
        safety_advice: 'Could not perform safety check. Proceed with caution.',
        requires_confirmation: false,
        confirmation_message: '',
      };
    }
  });
};


export const scanFridgeLoot = async (imageBase64: string, isDemoMode: boolean): Promise<{ inventory: Ingredient[], cdmSpeech: string }> => {
  if (isDemoMode) {
    console.log("[DEMO MODE] Returning hardcoded inventory.");
    return {
      inventory: DEMO_INVENTORY,
      cdmSpeech: "Welcome to demo mode, Chef! Your demo fridge has been scanned!",
    };
  }

  // Fix: Wrap Gemini API call in retry
  return retry(async () => {
    // Fix: Use 'gemini-3-flash-preview' for basic text/image tasks
    const model = 'gemini-3-flash-preview';
    const prompt = `Identify every item in this fridge/pantry. Highlight 3 items closest to expiring as 'Expiring'. Map visual pixels to a JSON list. Provide a spoken line of narration for this action.`;
    
    const response = await ai.models.generateContent({
      model,
      contents: {
        parts: [
          { inlineData: { data: imageBase64, mimeType: 'image/jpeg' } },
          { text: prompt }
        ]
      },
      config: {
        systemInstruction: CDM_SYSTEM_INSTRUCTION,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            inventory: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  name: { type: Type.STRING },
                  quantity: { type: Type.STRING },
                  status: { type: Type.STRING, description: "Fresh, Expiring, or Pantry" },
                  burnHazard: { type: Type.BOOLEAN }
                },
                required: ["name", "quantity", "status"]
              }
            },
            cdmSpeech: { type: Type.STRING, description: "CDM's narration message for the user" }
          },
          required: ["inventory", "cdmSpeech"]
        }
      }
    });

    const parsedResponse = JSON.parse(response.text || '{"inventory": [], "cdmSpeech": "No items found, Chef!"}');
    
    const cdmSpeech = parsedResponse.cdmSpeech.trim();

    console.log(`[scanFridgeLoot] Parsed - Narration: "${cdmSpeech}"`);
    return { inventory: parsedResponse.inventory, cdmSpeech: cdmSpeech };
  });
};

export const generateQuestBoard = async (inventory: Ingredient[], budgetGoal: string, isDemoMode: boolean): Promise<RecipeQuest[]> => {
  if (isDemoMode) {
    console.log("[DEMO MODE] Returning hardcoded quests.");
    return DEMO_QUESTS;
  }

  // Fix: Wrap Gemini API call in retry
  return retry(async () => {
    // Fix: Use 'gemini-3-flash-preview' for basic text tasks
    const model = 'gemini-3-flash-preview'; 
    const prompt = `Generate 3 distinct RPG cooking quests based on this inventory: ${JSON.stringify(inventory)}. Budget Goal: ${budgetGoal}. 
      For each recipe:
      1. A cool quest name.
      2. 'loot_preview' (A vivid description of the final dish).
      3. Ingredients needed.
      4. 3-5 high-level 'steps'. Each step must have a 'name' and a single, potentially complex 'instruction' combining multiple actions. Do NOT include any [HEAT] or [ACTION: SET_TIMER] tags in these high-level instructions.
      5. XP reward and gold saved vs takeout ($15).
      6. Provide a suitable 'cdm_intro_narration' (e.g., "A new quest awaits, Chef!"). Default to "A new quest awaits, Chef!" if none perfectly fit.
      Do NOT include individual micro-step fields like 'level_name', 'miniGameType', 'reference_visual', or 'reference_image_prompt' for these high-level steps; these will be generated later by a sub-processor. Each step should also have a 'completed: false' field.`;

    const response = await ai.models.generateContent({
      model,
      contents: prompt,
      config: {
        systemInstruction: CDM_SYSTEM_INSTRUCTION,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              id: { type: Type.STRING },
              quest_name: { type: Type.STRING },
              difficulty: { type: Type.STRING },
              loot_preview: { type: Type.STRING },
              ingredients: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { name: {type: Type.STRING}, quantity: {type: Type.STRING}, status: {type: Type.STRING}}}},
              steps: { // This structure needs to be simpler for the initial generation
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    id: { type: Type.NUMBER },
                    name: { type: Type.STRING },
                    instruction: { type: Type.STRING }, // This will be the long, combined instruction
                    completed: { type: Type.BOOLEAN }, // Added completed field
                  },
                  required: ["id", "name", "instruction", "completed"] // Simplified required fields
                }
              },
              xp_reward: { type: Type.NUMBER },
              gold_saved: { type: Type.STRING },
              boss_defeated: { type: Type.STRING },
              // Fix: Added cdm_intro_narration to the schema
              cdm_intro_narration: { type: Type.STRING, description: "CDM's intro narration for the quest" },
            },
            required: ["id", "quest_name", "difficulty", "loot_preview", "ingredients", "steps", "xp_reward", "gold_saved", "boss_defeated", "cdm_intro_narration"] 
          }
        }
      }
    });

    const quests = JSON.parse(response.text || '[]');
    console.log(`[generateQuestBoard] Raw quests from Gemini:`, quests);

    return quests.map((quest: RecipeQuest) => ({
      ...quest,
    }));
  });
};

export const generateRecipeImage = async (prompt: string): Promise<string | null> => {
  // Fix: Wrap Gemini API call in retry
  return retry(async () => {
    // Fix: Use 'gemini-2.5-flash-image' for image generation
    const model = 'gemini-2.5-flash-image';
    const response = await ai.models.generateContent({
      model,
      contents: {
        parts: [
          { text: `An appetizing, professional food photography shot of ${prompt}. Studio lighting, cinematic, high resolution.` }
        ]
      },
      config: {
        imageConfig: {
          aspectRatio: "1:1"
        }
      }
    });

    for (const part of response.candidates?.[0]?.content?.parts || []) {
      if (part.inlineData) {
        return `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
      }
    }
    return null;
  });
};

// Function to generate a step-specific reference image
export const generateStepReferenceImage = async (
  stepName: string,
  instruction: string,
  techniqueGuide: string, // This will be the `step.reference_visual` text
  imagePrompt?: string // Optional image prompt
): Promise<string | null> => {
  // Prioritize the explicit imagePrompt if provided, otherwise use techniqueGuide
  const primaryImagePrompt = imagePrompt || (techniqueGuide ? techniqueGuide.replace(/^Image:\s*/i, '') : ''); // FIX: Added null check for techniqueGuide

  // Only proceed if there's a valid prompt to generate an image from
  if (!primaryImagePrompt?.trim()) { // Added null check for primaryImagePrompt
    console.warn("No valid image prompt provided for step reference image generation.");
    return null;
  }

  // Fix: Wrap Gemini API call in retry
  return retry(async () => {
    // Fix: Use 'gemini-2.5-flash-image' for image generation
    const model = 'gemini-2.5-flash-image'; 

    const fullPrompt = `You are an image generation model creating a visual reference for a cooking game.
This image is NOT a tutorial, NOT a process image, and NOT an action scene.
Purpose:
Show what the food should look like when the step is completed correctly.
This image will be used as a visual reference for players to compare against their own result.
IMPORTANT RULES:
- Show ONLY the finished food result
- No people
- No hands
- No tools in motion
- No flames, smoke, or steam
- No text, symbols, captions, or UI
- No cartoon or illustration style
Scene & Style:
- Photorealistic food photography
- Dark, cinematic kitchen background
- Soft overhead lighting
- High clarity and sharp focus
- Square composition
- Centered subject
- Consistent visual style across all steps in the quest
Step context:
Step name: "${stepName}"
Instruction:
"${instruction}"
Technique guide:
"${techniqueGuide}"
Visual requirements:
- The food must clearly match the instruction outcome
- Size, texture, doneness, and preparation must be immediately obvious
- The result should look correct, safe, and appetizing
- Neutral plating or surface (dark cutting board, dark pan, or dark countertop)
Specific visual description (follow this exactly):
${primaryImagePrompt}
Negative constraints:
- No action or cooking process
- No before/after comparison
- No exaggerated effects
- No stylized art, anime, or illustration
Rendering style:
Ultra-realistic, high-detail food reference image, game-ready, instructional clarity`;

    try {
      const response = await ai.models.generateContent({
        model,
        contents: [{ text: fullPrompt }],
        config: {
          imageConfig: {
            aspectRatio: "1:1",
          },
        },
      });

      for (const part of response.candidates?.[0]?.content?.parts || []) {
        if (part.inlineData) {
          return `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
        }
      }
    } catch (error) {
      console.error("Failed to generate step reference image:", error);
    }
    return null;
  });
};

// Function to split a single instruction into multiple beginner-friendly steps
export const splitInstructionIntoSteps = async (
  longInstruction: string,
  isDemoMode: boolean
): Promise<QuestStep[]> => {
  if (isDemoMode) {
    console.log("[DEMO MODE] Returning hardcoded split steps.");
    return FALLBACK_SPLIT_STEPS.map((step, index) => ({ // Ensure demo steps also have IDs
      ...step,
      id: index + 1,
      completed: false,
    }));
  }

  // Fix: Wrap Gemini API call in retry
  return retry(async () => {
    // Fix: Use 'gemini-3-flash-preview' for basic text tasks
    const model = 'gemini-3-flash-preview'; 
    const prompt = `You are a beginner-friendly cooking instructor inside a game-like app.
Your job is to take ONE cooking instruction that may be long, combined, or advanced,
and break it into a sequence of SMALL, CLEAR, beginner-safe steps.

The user is a COMPLETE beginner:
- Assume they do not know cooking terms
- Assume they do not know when to add oil, heat a pan, or season food
- Assume they need one physical action per step

RULES:
1. One main action per step only
2. Steps must be ordered logically and safely
3. Use simple, direct language (no jargon unless explained)
4. Each step should be short and actionable
5. Do NOT combine actions in the same step
6. Add missing beginner steps if needed (oil, heat, seasoning, waiting)
7. Do NOT mention advanced techniques
8. Avoid decorative language – be instructional

STEP STRUCTURE (STRICT):
Each step must follow this structure exactly:
{
  "level_name": "SHORT TITLE IN ALL CAPS (e.g., LEVEL 1: THE SLICING RITUAL)",
  "name": "Concise Step Name (e.g., Dice Onions)",
  "instruction": "Clear, beginner-friendly instruction, must include a heat tag and optional timer tag as specified below",
  "miniGameType": "CHOP | SIZZLE | PREP | WAIT",
  "reference_visual": "What it should look like when done correctly (text description)",
  "reference_image_prompt": "A concise, visual description for generating a photorealistic image of what the *finished food result* for this step should look like (no hands, no tools, dark background, photorealistic, food only)"
}

MINI GAME TYPE RULES:
- CHOP → cutting, slicing, dicing
- PREP → adding oil, seasoning, arranging ingredients
- SIZZLE → cooking with heat
- WAIT → waiting for color change or doneness (e.g., heating a pan, letting something rest)

IMPORTANT:
- Do NOT include multiple actions in one instruction
- EACH 'instruction' MUST include one '[HEAT: 🔥 (Simmer)]', '[HEAT: 🔥🔥 (Steady)]', '[HEAT: 🔥🔥🔥 (Searing!)]' or '[HEAT: N/A]' tag, where appropriate.
- EACH 'instruction' MUST include a '[ACTION: SET_TIMER | TIME: Xm | LABEL: \"Y\"]' tag if a specific duration is needed for that step.
- The 'instruction' field is where the CDM will provide its narration, so it should sound like a complete sentence or two.
- 'reference_visual' should be a textual description only.
- 'reference_image_prompt' should be for image generation.

Here is the instruction to split:
"${longInstruction}"`;

    try {
      const response = await ai.models.generateContent({
        model,
        contents: prompt,
        config: {
          systemInstruction: CDM_SYSTEM_INSTRUCTION,
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                level_name: { type: Type.STRING },
                name: { type: Type.STRING },
                instruction: { type: Type.STRING },
                miniGameType: { type: Type.STRING, enum: ['CHOP', 'SIZZLE', 'PREP', 'WAIT'] },
                reference_visual: { type: Type.STRING },
                reference_image_prompt: { type: Type.STRING }
              },
              required: ["level_name", "name", "instruction", "miniGameType", "reference_visual", "reference_image_prompt"]
            }
          }
        }
      });

      const parsedSteps = JSON.parse(response.text || '[]');
      console.log(`[splitInstructionIntoSteps] Raw steps from Gemini:`, parsedSteps);
      // Assign IDs here as they are not returned by the model
      return parsedSteps.map((step: Omit<QuestStep, 'id' | 'completed'>, index: number) => ({
        ...step,
        id: index + 1, // Assign sequential IDs
        completed: false,
      }));
    } catch (error) {
      console.error("API failed to split instruction:", error);
      // Ensure fallback steps also have correct IDs and completed status
      return FALLBACK_SPLIT_STEPS.map((step, index) => ({
        ...step,
        id: index + 1,
        completed: false,
      }));
    }
  });
};


export const evaluateTechnique = async (imageBase64: string, stepName: string, questId: string, isDemoMode: boolean, instruction: string): Promise<EvaluationResult> => {
  if (isDemoMode) {
    console.log(`[DEMO MODE] Evaluating for Quest: ${questId}, Step: ${stepName}`);

    // DEMO Food Safety check (hardcoded simulation)
    if (instruction.toLowerCase().includes("raw chicken") && !instruction.toLowerCase().includes("cook thoroughly")) {
      return {
        rank: 'D',
        feedback: 'DEMO SAFETY WARNING: Raw chicken must be cooked thoroughly to avoid food poisoning!',
        xpBonus: 0,
        safety_alert: 'Raw Meat Handling',
        cdmSpeech: 'WHOA, CHEF! SAFETY FIRST! Raw chicken needs thorough cooking! Don\'t risk it!',
      };
    }
    
    // Existing Demo evaluation
    if (questId === 'quest-001') { // The Wilted Spinach Rescue
      if (stepName === 'Prepare Vegetables') { // Updated to match simplified step names
        return DEMO_EVALUATION_RESULT_FAIL_SAFETY; // D rank for safety
      } else if (stepName === 'Sauté Onions and Mushrooms') { // Example micro-step name
        return DEMO_EVALUATION_RESULT_BAD_COOKING; 
      } else if (stepName === 'Wilt Spinach') { // Example micro-step name
        return DEMO_EVALUATION_RESULT_SUCCESS; 
      }
    } else if (questId === 'quest-002') { // Chicken & Rice of Resilience
      if (stepName === 'Dice Chicken') { // Example micro-step name
        return DEMO_EVALUATION_RESULT_SUCCESS; 
      } else if (stepName === 'Sear Chicken Cubes') { // Example micro-step name
        return DEMO_EVALUATION_RESULT_BAD_COOKING; 
      } else if (stepName === 'Simmer Rice') { // Example micro-step name
        return DEMO_EVALUATION_RESULT_SUCCESS; 
      }
    }
    // Fallback in demo mode if no specific match, though all paths should be covered above
    console.warn(`[DEMO MODE] No specific evaluation for Quest: ${questId}, Step: ${stepName}. Returning default success.`);
    return DEMO_EVALUATION_RESULT_SUCCESS;
  }

  // --- REAL API MODE ---

  // Step 1: Perform Food Safety Check on the instruction first
  const safetyCheckResult = await checkFoodSafety(instruction);

  if (!safetyCheckResult.is_safe) {
    const riskDescriptions = safetyCheckResult.detected_risks.map(r => r.description).join('; ');
    const safetyAlertMessage = `Safety Hazard: ${riskDescriptions}`;
    
    // Prioritize safety feedback if not safe
    return {
      rank: safetyCheckResult.risk_level === 'high' ? 'F' : 'D', // Assign lowest ranks for safety issues
      feedback: safetyCheckResult.safety_advice,
      xpBonus: 0, // No XP for unsafe actions
      safety_alert: safetyAlertMessage,
      cdmSpeech: safetyCheckResult.confirmation_message || `WARNING, CHEF! ${riskDescriptions} Please review the safety advice!`,
    };
  }

  // Step 2: If instruction is safe, proceed with visual (image) evaluation
  return retry(async () => {
    // Fix: Use 'gemini-3-flash-preview' for basic text/image tasks
    const model = 'gemini-3-flash-preview';
    const prompt = `Evaluate this cooking step: "${stepName}". Look for safety hazards in the image like knives on edges or fire. Give Rank S-F and XP bonus. Provide a CDM spoken feedback.`;
    
    let result: EvaluationResult;
    try {
        const response = await ai.models.generateContent({
          model,
          contents: {
            parts: [
              { inlineData: { data: imageBase64, mimeType: 'image/jpeg' } },
              { text: prompt }
            ]
          },
          config: {
            systemInstruction: CDM_SYSTEM_INSTRUCTION,
            responseMimeType: "application/json",
            responseSchema: {
              type: Type.OBJECT,
              properties: {
                rank: { type: Type.STRING },
                feedback: { type: Type.STRING },
                xpBonus: { type: Type.NUMBER },
                safety_alert: { type: Type.STRING, description: "Only include if visual hazard detected" },
                cdmSpeech: { type: Type.STRING, description: "CDM's narration message for the user" }
              },
              required: ["rank", "feedback", "xpBonus", "cdmSpeech"]
            }
          }
        });

        const parsedResult = JSON.parse(response.text || '{}');
        
        const cdmSpeech = parsedResult.cdmSpeech ? parsedResult.cdmSpeech.trim() : "Evaluation complete, Chef!";

        result = { 
          rank: parsedResult.rank || 'F', // Default rank if not provided
          feedback: parsedResult.feedback || "The evaluation system is offline, Chef! Try again!", // Default feedback
          xpBonus: parsedResult.xpBonus || 0, // Default XP
          safety_alert: parsedResult.safety_alert, // Visual safety alert
          cdmSpeech: cdmSpeech, 
        };
    } catch (error) {
        console.error("API evaluation failed:", error);
        result = {
          rank: 'F',
          feedback: 'API evaluation failed, Chef! The culinary spirits are not responding!',
          xpBonus: 0,
          cdmSpeech: 'API evaluation failed, Chef!',
        };
    }
    
    console.log(`[evaluateTechnique] Final Result:`, result);
    return result;
  });
};