// constants.ts
import { Difficulty, SaveFile, Ingredient, RecipeQuest, EvaluationResult, QuestStep } from './types';

export const DEMO_SAVE_FILE: SaveFile = {
  id: 'demochef', // FIX: Changed id to lowercase of name
  name: 'DemoChef',
  difficulty: Difficulty.NOVICE,
  stats: {
    knifeSkills: 5,
    heatControl: 4,
    goldSaved: 125.75,
    level: 7,
    xp: 750
  },
};

export const DEMO_INVENTORY: Ingredient[] = [
  // FIX: Added 'id' to each ingredient to match the 'Ingredient' interface
  { id: 'ing-spinach-001', name: 'Wilted Spinach', quantity: '1 bag', status: 'Expiring', burnHazard: true },
  { id: 'ing-mushrooms-001', name: 'Mushrooms', quantity: '5 oz', status: 'Expiring', burnHazard: true },
  { id: 'ing-chicken-001', name: 'Chicken Breast', quantity: '2 pcs', status: 'Expiring', burnHazard: true },
  { id: 'ing-eggs-001', name: 'Eggs', quantity: '6', status: 'Fresh' },
  { id: 'ing-milk-001', name: 'Milk', quantity: '1/2 gallon', status: 'Fresh' },
  { id: 'ing-flour-001', name: 'Flour', quantity: '2 lbs', status: 'Pantry' },
  { id: 'ing-oliveoil-001', name: 'Olive Oil', quantity: '1 bottle', status: 'Pantry' },
  { id: 'ing-garlic-001', name: 'Garlic', quantity: '1 head', status: 'Fresh' },
  { id: 'ing-onion-001', name: 'Onion', quantity: '2', status: 'Fresh' },
  { id: 'ing-rice-001', name: 'Rice', quantity: '1 box', status: 'Pantry' },
];

// Fallback steps for the instruction splitter in demo mode or API failure
export const FALLBACK_SPLIT_STEPS: QuestStep[] = [
  {
    id: 1,
    level_name: "LEVEL 1: THE PEPPER CHOP",
    name: "Dice Peppers",
    instruction: "Take the expiring peppers. Carefully cut them into very small, square-shaped pieces. [HEAT: N/A]",
    miniGameType: "CHOP",
    completed: false,
    reference_visual: "Small, even, square pieces of red and green bell peppers on a cutting board.",
    reference_image_prompt: "Diced red and green bell peppers, small and uniform cubes, on a dark wooden cutting board, photorealistic, no hands, no tools, food only.",
  },
  {
    id: 2,
    level_name: "LEVEL 2: PAN HEAT-UP",
    name: "Heat the Pan",
    instruction: "Place a pan on the stove. Turn on the stove to a medium-high heat setting. Let the pan warm up for a few minutes. [HEAT: 🔥🔥 (Steady)]",
    miniGameType: "WAIT",
    completed: false,
    reference_visual: "A flat-bottomed pan on a stove burner, no visible food, surface shimmering slightly with heat.",
    reference_image_prompt: "Empty stainless steel frying pan on a gas stove burner, burner glowing red, slight heat shimmer above pan, dark kitchen background, photorealistic, no hands, no tools, food only.",
  },
  {
    id: 3,
    level_name: "LEVEL 3: OIL UP!",
    name: "Add Cooking Oil",
    instruction: "Carefully pour a small amount of cooking oil into the hot pan. Just enough to lightly coat the bottom. [HEAT: 🔥🔥 (Steady)]",
    miniGameType: "PREP",
    completed: false,
    reference_visual: "A thin, even layer of glistening oil coating the bottom of a hot pan.",
    reference_image_prompt: "Close-up of olive oil shimmering lightly in a hot black frying pan, thin layer covering the bottom, dark kitchen background, photorealistic, no hands, no tools, food only.",
  },
  {
    id: 4,
    level_name: "LEVEL 4: MEAT DROP",
    name: "Add Ground Meat",
    instruction: "Gently place the ground meat into the hot pan. [HEAT: 🔥🔥🔥 (Searing!)]",
    miniGameType: "PREP",
    completed: false,
    reference_visual: "Raw ground meat in small chunks spread out in a single layer in the hot pan.",
    reference_image_prompt: "Raw ground beef, broken into small pieces, spread evenly across a hot cast iron skillet, photorealistic, dark kitchen background, no hands, no tools, food only.",
  },
  {
    id: 5,
    level_name: "LEVEL 5: THE SEAR",
    name: "Cook Ground Meat",
    instruction: "Cook the ground meat for 7 minutes, using a spoon or spatula to break it apart into small pieces as it cooks. Stir it often until it's browned. [ACTION: SET_TIMER | TIME: 7m | LABEL: \"BROWN THE MEAT\"]. [HEAT: 🔥🔥🔥 (Searing!)]",
    miniGameType: "SIZZLE",
    completed: false,
    reference_visual: "All the ground meat should be cooked through and turned brown, with no pink parts left.",
    reference_image_prompt: "Cooked ground beef, evenly browned with some crispy edges, no pink visible, in a black frying pan, dark kitchen background, photorealistic, no hands, no tools, food only.",
  },
];


export const DEMO_QUESTS: RecipeQuest[] = [
  {
    id: 'quest-001',
    quest_name: 'The Wilted Spinach Rescue',
    difficulty: 'Medium',
    loot_preview: 'A vibrant frittata, golden-brown and studded with green spinach and earthy mushrooms, ready to be devoured.',
    ingredients: [
      // FIX: Added 'id' to each ingredient to match the 'Ingredient' interface
      { id: 'ing-quest1-spinach-001', name: 'Wilted Spinach', quantity: '1 bag', status: 'Expiring' },
      { id: 'ing-quest1-mushrooms-001', name: 'Mushrooms', quantity: '5 oz', status: 'Expiring' },
      { id: 'ing-quest1-eggs-001', name: 'Eggs', quantity: '6', status: 'Fresh' },
      { id: 'ing-quest1-onion-001', name: 'Onion', quantity: '1/2', status: 'Fresh' },
      { id: 'ing-quest1-oliveoil-001', name: 'Olive Oil', quantity: '1 tbsp', status: 'Pantry' },
    ],
    steps: [
      {
        id: 1,
        name: 'Prepare and Sauté Vegetables',
        instruction: 'Finely dice the onion and slice the mushrooms. Then, heat olive oil in a pan, add onions and sauté for 3 minutes until translucent. Add mushrooms, sauté for another 2 minutes. Finally, add the spinach and cook until it is completely wilted and reduced in volume.',
        completed: false,
      },
      {
        id: 2,
        name: 'Assemble and Bake the Frittata',
        instruction: 'Whisk eggs thoroughly in a bowl until yolks and whites are fully combined. Pour the whisked eggs evenly over the sautéed vegetables in an oven-safe pan. Transfer the pan to a preheated oven and bake at 375°F (190°C) for 15-20 minutes until the frittata is set, puffed, and golden brown on top.',
        completed: false,
      },
    ],
    xp_reward: 450,
    gold_saved: '$13.00',
    boss_defeated: '1x Bag of Wilted Spinach (Expired in 24hrs)',
    cdm_intro_narration: 'A new quest appears, Chef! The wilted spinach calls for rescue!',
  },
  {
    id: 'quest-002',
    quest_name: 'Chicken & Rice of Resilience',
    difficulty: 'Easy',
    loot_preview: 'Succulent chicken pieces nestled on a bed of fluffy, perfectly cooked rice, infused with subtle aromatic herbs.',
    ingredients: [
      // FIX: Added 'id' to each ingredient to match the 'Ingredient' interface
      { id: 'ing-quest2-chicken-001', name: 'Chicken Breast', quantity: '2 pcs', status: 'Expiring' },
      { id: 'ing-quest2-rice-001', name: 'Rice', quantity: '1 cup', status: 'Pantry' },
      { id: 'ing-quest2-garlic-001', name: 'Garlic', quantity: '2 cloves', status: 'Fresh' },
      { id: 'ing-quest2-water-001', name: 'Water', quantity: '2 cups', status: 'Pantry' },
    ],
    steps: [
      {
        id: 1,
        name: 'Cook Chicken and Rice Together',
        instruction: 'Dice chicken breast into 1-inch cubes. Sear chicken cubes in a hot pan until golden brown on all sides for 5 minutes. Then, add the uncooked rice, minced garlic, and water to the same pan. Bring the mixture to a rolling boil, then immediately reduce the heat to low, cover the pan tightly with a lid, and let it simmer for 18 minutes until the rice is fluffy and all the water has been absorbed.',
        completed: false,
      },
    ],
    xp_reward: 300,
    gold_saved: '$10.00',
    boss_defeated: '2x Chicken Breast (Expiring in 36hrs)',
    cdm_intro_narration: 'The chicken needs your culinary courage, Chef! Embark on the Chicken & Rice of Resilience!',
  },
];

export const DEMO_EVALUATION_RESULT_SUCCESS: EvaluationResult = {
  rank: 'S',
  feedback: 'Your technique is flawless, Chef! A true master of the culinary arts!',
  xpBonus: 50,
  cdmSpeech: 'Magnificent, Chef! An S-rank performance!',
};

export const DEMO_EVALUATION_RESULT_FAIL_SAFETY: EvaluationResult = {
  rank: 'D',
  feedback: 'Careful, Chef! Safety first! Your knife is too close to the edge. Adjust your stance.',
  xpBonus: 0,
  safety_alert: 'Knife left on edge!',
  cdmSpeech: 'Whoa there, Chef! Safety first! Watch that blade!',
};

export const DEMO_EVALUATION_RESULT_BAD_COOKING: EvaluationResult = {
  rank: 'C',
  feedback: 'Mama isn\'t mad, Chef! But your cooking is a bit off. Perhaps too much heat, or not enough stirring! Review the reference image for optimal results.',
  xpBonus: 10,
  cdmSpeech: 'A valiant effort, Chef! But your technique needs refining. The culinary gods demand perfection!',
};