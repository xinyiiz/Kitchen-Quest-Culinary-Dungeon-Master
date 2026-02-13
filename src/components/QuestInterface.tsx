// components/QuestInterface.tsx
import React, { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { RecipeQuest, EvaluationResult, TimerAction } from "../types";
import { evaluateTechnique, generateStepReferenceImage } from "../services/geminiService";

interface QuestInterfaceProps {
  quest: RecipeQuest;
  onQuestComplete: (xp: number, gold: string) => void; // Renamed prop
  onAbandonQuest: () => void; // Renamed prop
  onSpeakCdm: (audioData: { narration?: string, speakNow?: boolean }) => Promise<void>;
  isDemoMode: boolean;
}

type ParsedInstruction = {
  cleanInstruction: string;
  timerAction?: TimerAction;
  heat?: { flames: string; label: string }; // Updated heat type to allow "N/A" for flames
};

const parseInstruction = (rawInstruction: string): ParsedInstruction => {
  let text = rawInstruction ?? "";
  let timerAction: TimerAction | undefined;
  let heat: ParsedInstruction["heat"];

  // --- TIMER: [ACTION: SET_TIMER | TIME: 3m | LABEL: "SIZZLING ONIONS"] ---
  // More robust regex to handle various whitespaces
  const timerRegex =
    /\[ACTION:\s*SET_TIMER\s*\|\s*TIME:\s*(\d+)\s*m\s*\|\s*LABEL:\s*"([^"]+)"\s*\]/i;
  
  const timerMatch = text.match(timerRegex);
  if (timerMatch) {
    timerAction = {
      time: parseInt(timerMatch[1], 10),
      label: timerMatch[2].trim(),
    };
    text = text.replace(timerRegex, ""); // Replace with empty string to fully remove
  }

  // --- HEAT: supports 🔥🔥🔥, 🔥 🔥 🔥, and N/A ---
  // Matches:
  // [HEAT: 🔥🔥🔥 (Searing!)]
  // [HEAT: 🔥 🔥 (Steady)]
  // [HEAT:🔥(Low)]
  // [HEAT: N/A]
  // Regex to capture flames (including spaces) or 'N/A', and optional label
  const heatRegex =
    /\[HEAT:\s*((?:🔥\s*){1,3}|N\/A)\s*(?:\(([^)]+)\))?\s*\]/i;

  const heatMatch = text.match(heatRegex);
  if (heatMatch) {
    const rawFlamesOrNA = (heatMatch[1] ?? "").trim();
    const labelMaybe = (heatMatch[2] ?? "").trim();

    if (/^N\/A$/i.test(rawFlamesOrNA)) {
      heat = { flames: "N/A", label: "" }; // If N/A, label should be empty
    } else {
      const normalizedFlames = rawFlamesOrNA.replace(/\s+/g, ""); // Normalize "🔥 🔥 🔥" -> "🔥🔥🔥"
      heat = { flames: normalizedFlames, label: labelMaybe || "" }; // Use empty string if no label
    }
    text = text.replace(heatRegex, ""); // Replace with empty string to fully remove
  }

  // --- Cleanup leftover punctuation/spacing/quotes ---
  const cleanInstruction = text
    .replace(/\s+/g, " ") // Replace multiple spaces with a single space
    .replace(/\s*([.,!?;])\s*/g, "$1 ") // Remove spaces around punctuation, add one after
    .replace(/\s*([.,!?;])$/, "$1") // Handle punctuation at the end of string
    .replace(/^[\s"'“”]+/, "") // Remove leading quotes/spaces
    .replace(/[\s"'“”]+$/, "") // Remove trailing quotes/spaces
    .replace(/^[\.,]\s*/, "") // Remove leading period/comma
    .trim(); // Final trim

  return { cleanInstruction, timerAction, heat };
};

const QuestInterface: React.FC<QuestInterfaceProps> = ({
  quest,
  onQuestComplete, // Destructure renamed prop
  onAbandonQuest, // Destructure renamed prop
  onSpeakCdm,
  isDemoMode,
}) => {
  const [currentIdx, setCurrentIdx] = useState(0);
  const [evalResult, setEvalResult] = useState<EvaluationResult | null>(null);
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [totalXpBonus, setTotalXpBonus] = useState(0);

  // Reference image state
  const [referenceImageUrl, setReferenceImageUrl] = useState<string | null>(null);
  const [isReferenceImageLoading, setIsReferenceImageLoading] = useState(true);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Timer state
  const [timerRemaining, setTimerRemaining] = useState(0);
  const [isTimerRunning, setIsTimerRunning] = useState(false);
  const timerIntervalRef = useRef<number | null>(null);

  const step = quest.steps[currentIdx];

  // ✅ IMPORTANT: memoize parsing so timerAction/heat do NOT become new objects every render
  const parsed = useMemo(() => parseInstruction(step.instruction), [step.instruction]);
  const { cleanInstruction, timerAction, heat } = parsed;

  const triggerCdm = useCallback(onSpeakCdm, [onSpeakCdm]);

  // Narration + clear eval when step changes
  useEffect(() => {
    // Only trigger narration if cleanInstruction exists and is not empty
    if (cleanInstruction) {
      // FIX: Explicitly set speakNow: true for instruction narration.
      const speakInstruction = async () => {
        await triggerCdm({ narration: `Alright, Chef! ${cleanInstruction}`, speakNow: true }); // Await this
      };
      speakInstruction();
    }
    setEvalResult(null);
  }, [currentIdx, cleanInstruction, step.name, triggerCdm]);

  // ✅ NEW: Effect to generate and load the reference image for the current step
  useEffect(() => {
    let isMounted = true;
    const fetchReferenceImage = async () => {
      setIsReferenceImageLoading(true);
      setReferenceImageUrl(null); // Clear previous image

      if (isDemoMode) {
        // Demo mode: use a placeholder image
        if (isMounted) {
          setReferenceImageUrl("https://via.placeholder.com/200x200?text=DEMO+REF+IMAGE");
          setIsReferenceImageLoading(false);
        }
      } else if (step.reference_image_prompt || step.reference_visual) {
        try {
          const url = await generateStepReferenceImage(
            step.name,
            cleanInstruction,
            step.reference_visual || '', // Provide default empty string if undefined
            step.reference_image_prompt // Pass the new prompt
          );
          if (isMounted) setReferenceImageUrl(url);
        } catch (e) {
          console.error("Failed to generate step reference image:", e);
          if (isMounted) setReferenceImageUrl(null);
        } finally {
          if (isMounted) setIsReferenceImageLoading(false);
        }
      } else {
        // No prompt or visual for image generation
        if (isMounted) setIsReferenceImageLoading(false);
      }
    };
    fetchReferenceImage();
    return () => { isMounted = false; };
  }, [step.id, step.name, cleanInstruction, step.reference_visual, step.reference_image_prompt, isDemoMode]); // Re-run when step changes

  // ✅ Timer init/reset: ONLY when the step (or its timerAction) changes
  useEffect(() => {
    // Stop any actively running interval
    if (timerIntervalRef.current !== null) {
      clearInterval(timerIntervalRef.current);
      timerIntervalRef.current = null;
    }

    const initialTime = timerAction ? timerAction.time * 60 : 0;
    setTimerRemaining(initialTime);
    setIsTimerRunning(false); // Ensure timer is stopped on step change

    return () => {
      // Cleanup: Clear interval if component unmounts or effect re-runs
      if (timerIntervalRef.current !== null) {
        clearInterval(timerIntervalRef.current);
        timerIntervalRef.current = null;
      }
    };
    // Dependencies: only `timerAction` (derived from instruction) and `quest.id` for a complete reset
  }, [timerAction?.time, timerAction?.label, quest.id, currentIdx]); // Add currentIdx to ensure reset on sequential step changes

  // ✅ Timer run loop: depends ONLY on isTimerRunning, to prevent re-creation
  useEffect(() => {
    if (isTimerRunning && timerRemaining > 0) {
      // Ensure only one interval is active
      if (timerIntervalRef.current === null) {
        timerIntervalRef.current = window.setInterval(() => {
          setTimerRemaining((prev) => {
            if (prev <= 1) { // When it hits 0 or less
              if (timerIntervalRef.current !== null) {
                clearInterval(timerIntervalRef.current);
                timerIntervalRef.current = null;
              }
              setIsTimerRunning(false); // Stop running
              // Timer completion feedback - speakNow is false (default)
              const timerCompleteSpeech = async () => {
                await triggerCdm({ narration: "Time's up, Chef! What's next?", speakNow: false }); // Await this
              };
              timerCompleteSpeech();
              return 0; // Set to 0
            }
            return prev - 1;
          });
        }, 1000);
      }
    } else if (!isTimerRunning && timerIntervalRef.current !== null) {
      // If timer is stopped externally (e.g., by PAUSE button or completion)
      clearInterval(timerIntervalRef.current);
      timerIntervalRef.current = null;
    }

    return () => {
      if (timerIntervalRef.current !== null) {
        clearInterval(timerIntervalRef.current);
        timerIntervalRef.current = null;
      }
    };
  }, [isTimerRunning, timerRemaining, triggerCdm]); // Added timerRemaining to trigger re-evaluation of condition when it becomes 0


  const handleStepComplete = async (skipped = false) => {
    if (skipped) {
      // Skip feedback - speakNow is false (default)
      await triggerCdm({ // Await this
        narration: "Skipping this trial, Chef. Onward to the next challenge!",
        speakNow: false,
      });
    }

    // Stop timer when leaving a step
    setIsTimerRunning(false);

    if (currentIdx < quest.steps.length - 1) {
      setCurrentIdx((i) => i + 1);
    } else {
      onQuestComplete(quest.xp_reward + totalXpBonus, quest.gold_saved); // Changed to onQuestComplete
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsEvaluating(true);
    // Evaluation start feedback - speakNow is true (CDM speaks this)
    await triggerCdm({ narration: "Analyzing your technique, Chef! The CDM is watching!", speakNow: true }); // Await this

    try {
      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64 = (reader.result as string).split(",")[1];
        const res: EvaluationResult = await evaluateTechnique(
          base64,
          step.name,
          quest.id, // Pass questId here
          isDemoMode,
          step.instruction // NEW: Pass the instruction for safety check
        );

        if (!res || !res.rank || !res.feedback || res.xpBonus === undefined || !res.cdmSpeech) {
          setEvalResult({
            rank: "F",
            feedback: "Evaluation system malfunction, Chef! Try again!",
            xpBonus: 0,
            // Error in evaluation feedback - speakNow is true (CDM speaks this)
            cdmSpeech: "Error in evaluation, Chef! Try again!",
          });
        } else {
          setEvalResult(res);
          setTotalXpBonus((prev) => prev + res.xpBonus);
          // Evaluation result feedback - speakNow is true (CDM speaks this)
          await triggerCdm({ narration: res.cdmSpeech, speakNow: true }); // Await this
          if (res.safety_alert) {
            // Safety alert feedback - speakNow is true (CDM speaks this)
            await triggerCdm({ narration: res.safety_alert, speakNow: true }); // Speak the safety alert more emphatically // Await this
          }
        }

        setIsEvaluating(false);
      };

      reader.readAsDataURL(file);
    } catch (e) {
      setIsEvaluating(false);
      setEvalResult({
        rank: "F",
        feedback: "Evaluation failed due to an error, Chef! Try again!",
        xpBonus: 0,
        // Error in evaluation feedback - speakNow is true (CDM speaks this)
        cdmSpeech: "Evaluation failed due to an error, Chef!",
      });
      // Evaluation failed feedback - speakNow is true (CDM speaks this)
      await triggerCdm({ narration: "Evaluation failed, Chef. Try again!", speakNow: true }); // Await this
    } finally {
        // Clear file input value to allow re-uploading the same file
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    }
  };

  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${minutes.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  const heatDisplay = useMemo(() => {
    if (!heat || heat.flames === "N/A") return null; // Display null if N/A
    return `${heat.flames} ${heat.label ? `(${heat.label})` : ''}`; // Only show label if it exists
  }, [heat]);

  const isTimerComplete = !!timerAction && timerRemaining === 0;

  return (
    <div className="flex flex-col h-full gap-4">
      {/* Step Level Indicator */}
      <div className="bg-[#1a1a1a] border border-gray-800 rounded-lg p-4 flex justify-between items-center">
        <div className="flex flex-col">
          <span className="text-[10px] font-pixel text-gray-500 uppercase mb-1">
            Quest: {quest.quest_name}
          </span>
          <h2 className="text-xl font-sans font-bold text-blue-400 uppercase tracking-tight">
            {step.level_name}
          </h2>
        </div>
        <span className="font-pixel text-[10px] text-gray-500 bg-black px-2 py-1 rounded">
          STAGE {currentIdx + 1}/{quest.steps.length}
        </span>
      </div>

      {/* Main Action Stage */}
      <div
        className={`flex-grow bg-[#1a1a1a] border border-gray-800 rounded-xl p-8 flex flex-col items-center justify-center text-center relative overflow-hidden shadow-2xl ${
          evalResult?.safety_alert ? "border-red-500 animate-pulse" : ""
        }`}
      >
        {/* Safety Alert */}
        {evalResult?.safety_alert && (
          <div className="absolute top-0 left-0 w-full bg-red-600 text-white font-sans font-bold text-sm p-3 z-10 shadow-lg uppercase tracking-wider">
            ⚠️ SAFETY WARNING: {evalResult.safety_alert}
          </div>
        )}

        <div className="mb-8 w-full max-w-lg">
          <span className="text-7xl mb-6 block drop-shadow-lg">
            {step.miniGameType === "CHOP" ? "🔪" : step.miniGameType === "SIZZLE" ? "🔥" : "🍽️"}
          </span>

          <h3 className="text-2xl font-sans font-bold text-yellow-400 mb-4 uppercase tracking-wide">
            {step.name}
          </h3>

          <p className="text-3xl font-sans text-white leading-tight mb-10 font-medium">
            "{cleanInstruction}"
          </p>

          {/* ✅ Heat Level always in its own section, consistent formatting */}
          {heatDisplay && (
            <div className="bg-black/40 p-3 mb-6 border-l-4 border-orange-500 text-left rounded-r-md">
              <h4 className="text-[10px] font-pixel text-orange-400 mb-1 uppercase tracking-widest">
                Heat Level
              </h4>
              <p className="text-2xl font-pixel text-white font-bold">{heatDisplay}</p>
            </div>
          )}

          {/* Timer Action Display */}
          {timerAction && (
            <div className="bg-black/40 p-3 mb-6 border-l-4 border-blue-500 text-left rounded-r-md">
              <h4 className="text-[10px] font-pixel text-blue-400 mb-1 uppercase tracking-widest">
                Action Timer: {timerAction.label}
              </h4>

              <div className="flex justify-between items-center mt-2">
                <span
                  className={`text-4xl font-sans font-bold ${
                    timerRemaining <= 10 && timerRemaining > 0
                      ? "text-red-500 animate-pulse"
                      : "text-green-400"
                  }`}
                >
                  {formatTime(timerRemaining)}
                </span>

                {isTimerRunning ? (
                  <button
                    onClick={() => {
                      setIsTimerRunning((prev) => {
                        const next = !prev; // This will be false for PAUSE
                        // Timer control feedback - speakNow is false (default)
                        const timerControlSpeech = async () => {
                          await triggerCdm({ narration: next ? "Timer started, Chef!" : "Timer paused, Chef.", speakNow: false }); // Await this
                        };
                        timerControlSpeech();
                        return next;
                      });
                    }}
                    className="px-4 py-2 rounded-md font-pixel text-sm bg-red-700 hover:bg-red-600 transition-colors"
                  >
                    PAUSE
                  </button>
                ) : isTimerComplete ? (
                  <button
                    onClick={() => {
                      setTimerRemaining(timerAction.time * 60); // Reset to full time
                      setIsTimerRunning(true);
                      // Timer control feedback - speakNow is false (default)
                      const timerControlSpeech = async () => {
                        await triggerCdm({ narration: "Timer restarted, Chef!", speakNow: false }); // Await this
                      };
                      timerControlSpeech();
                    }}
                    className="px-4 py-2 rounded-md font-pixel text-sm bg-green-700 hover:bg-green-600 transition-colors"
                  >
                    RESTART
                  </button>
                ) : (
                  <button
                    onClick={() => {
                      setIsTimerRunning((prev) => {
                        const next = !prev; // This will be true for START
                        // Timer control feedback - speakNow is false (default)
                        const timerControlSpeech = async () => {
                          await triggerCdm({ narration: next ? "Timer started, Chef!" : "Timer paused, Chef.", speakNow: false }); // Await this
                        };
                        timerControlSpeech();
                        return next;
                      });
                    }}
                    className="px-4 py-2 rounded-md font-pixel text-sm bg-green-700 hover:bg-green-600 transition-colors"
                  >
                    START
                  </button>
                )}
              </div>
            </div>
          )}

          <div className="bg-black/40 p-5 border-l-4 border-gray-600 text-left rounded-r-md">
            <h4 className="text-[10px] font-pixel text-gray-500 mb-2 uppercase tracking-widest">
              Technique Guide
            </h4>
            {isReferenceImageLoading ? (
              <div className="w-full h-48 bg-gray-900 flex items-center justify-center pixel-border mb-4">
                <span className="animate-spin text-4xl">🖼️</span>
                <p className="font-pixel text-gray-600 ml-4">RENDERING REFERENCE...</p>
              </div>
            ) : referenceImageUrl ? (
              <img
                src={referenceImageUrl}
                alt={`Reference for ${step.name}`}
                className="w-full h-auto object-cover rounded-md mb-4 pixel-border"
                style={{ imageRendering: 'pixelated' }} // Optional pixelated style for game aesthetic
              />
            ) : step.reference_image_prompt ? ( // NEW: Show prompt if no URL
              <div className="w-full h-48 bg-gray-900 flex items-center justify-center pixel-border mb-4 text-gray-400 font-sans text-sm italic p-4 text-center">
                <p>"{step.reference_image_prompt}"</p>
              </div>
            ) : (
              <div className="w-full h-48 bg-gray-900 flex items-center justify-center pixel-border mb-4 text-gray-600 text-6xl">
                ❓
              </div>
            )}
            <p className="text-lg font-sans text-gray-300 italic leading-relaxed mt-2">
              {step.reference_visual}
            </p>
          </div>
        </div>

        {evalResult && !isEvaluating ? (
          <div className="w-full bg-[#1e1a0a] p-6 border border-yellow-500 rounded-lg text-left shadow-[0_0_20px_rgba(234,179,8,0.1)] animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="flex justify-between items-center mb-4">
              <span className="text-4xl font-sans font-black text-yellow-400">
                RANK {evalResult.rank}
              </span>
              <span className="font-pixel text-green-400 text-xs bg-green-950/40 px-3 py-1 border border-green-800 rounded">
                +{evalResult.xpBonus} XP
              </span>
            </div>

            <p className="text-xl font-sans text-gray-200 mb-6 leading-relaxed">
              {evalResult.feedback}
            </p>

            <button
              onClick={() => handleStepComplete(false)}
              className="w-full bg-blue-600 hover:bg-blue-500 p-5 rounded-md font-sans font-bold text-lg text-white transition-all shadow-lg active:translate-y-1"
            >
              PROCEED TO NEXT TRIAL
            </button>
          </div>
        ) : (
          <div className="w-full max-w-sm flex flex-col gap-5">
            <button
              onClick={() => {
                // To activate camera, would need to integrate camera here or link to general photo app
                // For now, this button directly triggers file input
                fileInputRef.current?.click();
                // Capture progress feedback - speakNow is true (CDM speaks this)
                const captureProgressSpeech = async () => {
                  await triggerCdm({ narration: "Capturing your progress, Chef!", speakNow: true }); // Await this
                };
                captureProgressSpeech();
              }}
              disabled={isEvaluating}
              className="w-full bg-blue-600 hover:bg-blue-500 p-6 rounded-lg font-sans font-bold text-xl text-white transition-all shadow-xl flex items-center justify-center gap-4 active:translate-y-1"
            >
              {isEvaluating ? (
                <div className="w-6 h-6 border-2 border-white border-t-transparent animate-spin rounded-full"></div>
              ) : (
                <span className="text-2xl">📸</span>
              )}
              {isEvaluating ? "ANALYZING..." : "CAPTURE PROGRESS"}
            </button>
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileUpload}
              accept="image/*"
              className="hidden"
            />
            {/* NEW: Secondary Upload Photo Button */}
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={isEvaluating}
              className="font-pixel text-[10px] text-gray-500 hover:text-white transition-colors uppercase tracking-[0.2em] mt-2"
            >
              [ UPLOAD PHOTO ]
            </button>

            <button
              onClick={() => handleStepComplete(true)}
              className="text-[10px] font-pixel text-gray-500 hover:text-red-400 transition-colors uppercase tracking-[0.2em]"
            >
              ⏩ SKIP TRIAL (ZERO XP)
            </button>
          </div>
        )}
      </div>

      <button
        onClick={() => {
          onAbandonQuest(); // Changed to onAbandonQuest
          // Abandon quest feedback - speakNow is true (CDM speaks this)
          const abandonQuestSpeech = async () => {
            await triggerCdm({ narration: "Abandoning the quest, Chef. Perhaps another time!", speakNow: true }); // Await this
          };
          abandonQuestSpeech();
        }}
        className="font-pixel text-[10px] text-red-500 hover:text-red-400 transition-colors text-center py-4 uppercase tracking-widest"
      >
        [ ABANDON QUEST ]
      </button>

      {isEvaluating && (
        <div className="fixed inset-0 bg-black/90 z-50 flex flex-col items-center justify-center p-8 backdrop-blur-sm">
          <div className="w-20 h-20 border-4 border-blue-500 border-t-transparent animate-spin rounded-full mb-10"></div>
          <h3 className="font-pixel text-xl text-blue-400 mb-4 tracking-widest">
            THE CDM IS OBSERVING...
          </h3>
          <p className="text-gray-400 font-sans text-lg italic text-center max-w-md animate-pulse">
            "Your form is being analyzed for speed, technique, and safety..."
          </p>
          </div>
        )}
    </div>
  );
};

export default QuestInterface;