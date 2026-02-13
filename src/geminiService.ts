
// geminiService.ts
import { GoogleGenAI, Type } from "@google/genai";
import { RecipeQuest, Ingredient, EvaluationResult } from "./types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || '' });

// Removed ElevenLabs specific system instruction
const CDM_SYSTEM_INSTRUCTION = `You are the "Culinary Dungeon Master" (CDM), an eccentric, high-energy indie-game narrator (similar to "Cooking Mama"). You guide the player through real-life kitchen quests using visuals and smart-utility triggers.
Tone Rules: Speak with emotion. Use a "Victory Fanfare" tone for successes and a "Disappointed Shopkeeper" tone for skips.
Onomatopoeia: Vocalize kitchen sounds (e.g., "Sizzle sizzle!", "Chop-chop-chop!").
Narration should be 1-2 sentences max. Address the player as "Chef".

When generating quest steps, include smart utility triggers:
- **Timer Command:** Use '[ACTION: SET_TIMER | TIME: Xm | LABEL: "Y"]' immediately after an instruction requiring a duration.
- **Heat Level:** Use '[HEAT: 🔥 (Simmer)]', '[HEAT: 🔥🔥 (Steady)]', or '[HEAT: 🔥🔥🔥 (Searing!)]' where applicable.
`;

export const scanFridgeLoot = async (imageBase64: string): Promise<{ inventory: Ingredient[], cdmSpeech: string }> => {
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
  
  // Directly return the cdmSpeech
  const cdmSpeech = parsedResponse.cdmSpeech.trim();

  console.log(`[scanFridgeLoot] Parsed - Narration: "${cdmSpeech}"`);
  return { inventory: parsedResponse.inventory, cdmSpeech: cdmSpeech };
};

export const generateQuestBoard = async (inventory: Ingredient[], budgetGoal: string): Promise<RecipeQuest[]> => {
  const model = 'gemini-3-pro-preview';
  const prompt = `Generate 3 distinct RPG cooking quests based on this inventory: ${JSON.stringify(inventory)}. Budget Goal: ${budgetGoal}. 
    For each recipe:
    1. A cool quest name.
    2. 'loot_preview' (A vivid description of the final dish).
    3. Ingredients needed.
    4. 3-5 'steps' with RPG 'level_name' and 'reference_visual' descriptions.
    5. Each 'instruction' must include '[HEAT: 🔥 (Simmer)]', '[HEAT: 🔥🔥 (Steady)]', or '[HEAT: 🔥🔥🔥 (Searing!)]' where appropriate, and '[ACTION: SET_TIMER | TIME: Xm | LABEL: "Y"]' if a specific duration is needed.
    6. XP reward and gold saved vs takeout ($15).
    7. Provide a suitable 'cdm_intro_narration' (e.g., "A new quest awaits, Chef!"). Default to "A new quest awaits, Chef!" if none perfectly fit.`;

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
            steps: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  id: { type: Type.NUMBER },
                  level_name: { type: Type.STRING },
                  name: { type: Type.STRING },
                  instruction: { type: Type.STRING },
                  miniGameType: { type: Type.STRING },
                  reference_visual: { type: Type.STRING }
                }
              }
            },
            xp_reward: { type: Type.NUMBER },
            gold_saved: { type: Type.STRING },
            boss_defeated: { type: Type.STRING },
            // Removed cdm_intro_narration and sfx_on_start from schema
          },
          required: ["id", "quest_name", "difficulty", "loot_preview", "ingredients", "steps", "xp_reward", "gold_saved", "boss_defeated"] 
        }
      }
    }
  });

  const quests = JSON.parse(response.text || '[]');
  console.log(`[generateQuestBoard] Raw quests from Gemini:`, quests);

  return quests.map((quest: RecipeQuest) => ({
    ...quest,
    // Removed direct usage/defaulting of audio narration properties
  }));
};

export const generateRecipeImage = async (prompt: string): Promise<string | null> => {
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
};

export const evaluateTechnique = async (imageBase64: string, stepName: string): Promise<EvaluationResult> => {
  const model = 'gemini-3-flash-preview';
  const prompt = `Evaluate this cooking step: ${stepName}. Look for safety hazards like knives on edges or fire. Give Rank S-F and XP bonus. Provide a CDM spoken feedback.`;
  
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
          safety_alert: { type: Type.STRING, description: "Only include if hazard detected" },
          cdmSpeech: { type: Type.STRING, description: "CDM's narration message for the user" }
        },
        required: ["rank", "feedback", "xpBonus", "cdmSpeech"]
      }
    }
  });

  const parsedResult = JSON.parse(response.text || '{}');
  
  // Directly return the cdmSpeech
  const cdmSpeech = parsedResult.cdmSpeech.trim();

  console.log(`[evaluateTechnique] Parsed - Narration: "${cdmSpeech}"`);
  return { 
    rank: parsedResult.rank, 
    feedback: parsedResult.feedback, 
    xpBonus: parsedResult.xpBonus, 
    safety_alert: parsedResult.safety_alert, 
    cdmSpeech: cdmSpeech, 
  };
};