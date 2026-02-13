// components/Login.tsx
import React, { useState } from 'react';

interface LoginProps {
  onLogin: (name: string) => void;
  onEnterDemoMode: () => void; // New prop for demo mode
  onSpeakCdm: (audioData: { narration?: string, speakNow?: boolean }) => Promise<void>;
}

const Login: React.FC<LoginProps> = ({ onLogin, onEnterDemoMode, onSpeakCdm }) => {
  const [name, setName] = useState('');

  const handleLoginClick = async () => { // Made async
    if (name) {
      // Narration for login success is handled by App.tsx handleLogin
      // This button click itself should trigger a minimal SFX (no speech),
      // or simply wait for the next narration.
      await onSpeakCdm({ // Await this
        narration: undefined, // Narration is handled by App.tsx
        speakNow: false, // Don't speak here, just ensure sequencing
      });
      onLogin(name);
    } else {
      await onSpeakCdm({ // Await this
        narration: "Please enter a Chef Name, Hero!",
        speakNow: true,
      });
    }
  };

  const handleEnterDemoClick = async () => { // Made async
    await onSpeakCdm({ // Await this
      narration: undefined, // Narration is handled by App.tsx
      speakNow: false, // Don't speak here, just ensure sequencing
    });
    onEnterDemoMode();
  };

  return (
    <div className="flex flex-col items-center justify-center py-12">
      <div className="relative mb-12 flex flex-col items-center">
        {/* Campfire Visual */}
        <div className="flex gap-1 items-end mb-4">
          <div className="w-4 h-12 bg-orange-600 fire-particle" style={{animationDelay: '0.1s'}}></div>
          <div className="w-6 h-16 bg-red-600 fire-particle"></div>
          <div className="w-4 h-10 bg-yellow-500 fire-particle" style={{animationDelay: '0.1s'}}></div>
        </div>
        <div className="flex gap-2">
          <div className="w-8 h-4 bg-gray-700"></div>
          <div className="w-8 h-4 bg-gray-700"></div>
        </div>
        
        <h1 className="font-pixel text-4xl mt-8 text-center text-white drop-shadow-[4px_4px_0px_#4a90e2] animate-pulse">
          KITCHEN QUEST
        </h1>
      </div>

      <div className="w-full bg-[#1a1a1a] p-8 pixel-border text-center">
        <p className="text-xl mb-6 text-blue-300">"Welcome, Hero! State your Chef Name to load your save file."</p>
        
        <input 
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyPress={(e) => { // Allow pressing Enter to submit
            if (e.key === 'Enter') {
              handleLoginClick();
            }
          }}
          placeholder="CHEF NAME..."
          className="w-full bg-black border-2 border-gray-700 p-4 font-pixel text-center text-yellow-400 focus:border-blue-500 outline-none mb-6"
          aria-label="Enter your Chef Name"
        />

        <button
          onClick={handleLoginClick}
          className="w-full bg-blue-600 hover:bg-blue-500 p-6 pixel-border font-pixel text-lg transition-all active:translate-y-1"
          aria-label="Start New Quest"
        >
          START NEW QUEST
        </button>

        {/* Demo Mode Entry Button */}
        <button
          onClick={handleEnterDemoClick}
          className="font-pixel text-xs text-gray-500 hover:text-blue-400 transition-colors mt-4 opacity-70 block mx-auto"
          aria-label="Enter Demo Mode"
        >
          [ ENTER DEMO MODE ]
        </button>
      </div>
    </div>
  );
};

export default Login;