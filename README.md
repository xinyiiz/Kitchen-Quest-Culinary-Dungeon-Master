<div align="center">
  <img width="1200" alt="Kitchen Quest Banner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# 🍳 Kitchen Quest - Culinary Dungeon Master

An AI-powered cooking adventure that transforms everyday meal preparation into a quest-based dungeon experience.

Kitchen Quest combines Generative AI, image recognition, and real-time narration to guide users step-by-step through interactive cooking missions. Designed as both a functional cooking assistant and a gamified learning experience.

---

## ✨ Features

- 📷 **Fridge Image Scanning** - Detect ingredients using Gemini Vision  
- 🧠 **AI Recipe Quest Generation** - Structured, step-based cooking missions  
- 🔊 **Real-time AI Narration (TTS)** - Dynamic step narration  
- 🎮 **Gamified Progression** - XP rewards and quest completion  
- 🎒 **Dynamic Inventory System** - Ingredient tracking and updates  
- 💾 **Save & Resume** - Persistent state using localStorage  
- ⚠ **Safety Confirmation Layer** - Basic risk-aware cooking prompts  
- 🧩 Modular Component Architecture

---

## 🏗 Tech Stack

### Frontend
- React
- TypeScript
- Vite

### AI Integration
- Gemini 2.5 Flash (Text + Vision)
- Gemini Text-to-Speech API

### Browser APIs
- Web Audio API
- MediaDevices API (Camera Access)
- localStorage (Persistence)

---

## 🧠 System Workflow

1. User scans fridge or uploads an image  
2. Gemini Vision detects available ingredients  
3. Inventory updates dynamically  
4. AI generates a structured recipe quest  
5. Each cooking step is narrated in real time  
6. User progresses through quest and earns rewards  

All AI prompts are structured to ensure:
- Controlled output formatting  
- Step segmentation  
- Clear instructional flow  
- Safe cooking practices  

---

## 📁 Project Structure

kitchen-quest/
│
├── src/
│ ├── components/
│ │ ├── FridgeScanner.tsx
│ │ ├── KitchenHub.tsx
│ │ ├── QuestBoard.tsx
│ │ └── QuestInterface.tsx
│ │
│ ├── services/
│ │ ├── geminiService.ts
│ │ └── textToSpeechService.ts
│ │
│ ├── sfx/
│ ├── constants.ts
│ ├── types.ts
│ ├── App.tsx
│ └── main.tsx
│
├── .gitignore
├── package.json
├── tsconfig.json
├── vite.config.ts
└── README.md


---

## 🚀 Run Locally

### Prerequisites
- Node.js (v18 or higher recommended)

### 1. Install Dependencies
npm install


### 2. Environment Setup

Create a `.env.local` file in the root directory:

VITE_GEMINI_API_KEY=your_api_key_here

⚠ Do not commit this file. It is excluded via `.gitignore`.

### 3. Start Development Server
npm run dev

---

## 🔐 Security Notes

- API keys are stored locally in `.env.local`
- Sensitive files are excluded via `.gitignore`
- No backend server required - runs fully client-side

---

## 📌 Design Considerations

- Modular service layer for AI interactions  
- Separation of UI components and business logic  
- Controlled AI prompting to avoid malformed outputs  
- Guarded audio playback to prevent duplicate narration  
- Persistent game state for mid-quest refresh recovery  

---

## 🌟 Future Improvements

- Firebase cloud save system  
- Advanced cooking safety detection  
- Multiplayer co-op mode  
- AI-generated ambient sound effects  
- Deployment via Vercel  

---

## 👩‍💻 Author

Built as a Generative AI project exploring:

- AI-assisted real-world workflows  
- Vision + text multimodal systems  
- Prompt engineering and output control  
- Interactive AI-driven UX design  

---

## 📜 License

This project is for educational and portfolio purposes.
