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
- ⚠ **Safety Confirmation Layer** - Risk-aware cooking prompts  
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

# 🚀 How to Run Kitchen Quest

Kitchen Quest requires a Gemini API key to enable AI features such as:

- Ingredient detection  
- Recipe quest generation  
- AI narration  

---

## 🔑 Step 1 - Get a Gemini API Key

1. Visit: https://ai.google.dev  
2. Sign in with your Google account  
3. Create a new API key  
4. Copy the generated key  

You will use this key in the next step.

---

## 🖥 Option A - Run Locally (Recommended)

### Prerequisites

- Node.js v18 or higher  

### 1. Install Dependencies

npm install

---

## 2️⃣ Step 2 - Create Environment File

Create a file in the root directory named:
.env.local

Add the following:
VITE_GEMINI_API_KEY=your_api_key_here

Replace `your_api_key_here` with your actual Gemini API key.

⚠ Do not commit this file. It is excluded via `.gitignore`.

---

## 3️⃣ Step 3 - Start Development Server

npm run dev
Open the local URL shown in your terminal.

---

## 🌍 Option B - Use the Live Deployed Version

1. Open the GitHub Pages site  
2. When prompted, paste your Gemini API key  
3. Begin your cooking quest  

The API key is stored only in your browser session and is not saved to any server.

---

## 🧭 How to Use the App

1. Scan your fridge using camera or upload an image  
2. Review detected ingredients  
3. Generate a cooking quest  
4. Follow narrated step-by-step instructions  
5. Complete the quest and earn rewards  
6. Resume anytime using Save & Resume  

---

## 🔐 Security Notes

- API keys are stored locally in `.env.local` or browser memory  
- No backend server is used  
- All AI requests are made directly from the client  
- For production-grade security, a backend proxy would be recommended  

---

## 📌 Design Considerations

- Modular service layer for AI interactions  
- Separation of UI and business logic  
- Structured prompt engineering for controlled outputs  
- Guarded audio playback to prevent duplicate narration  
- Persistent game state for mid-quest recovery  

---

## 🌟 Future Improvements

- Firebase cloud save system  
- Advanced cooking safety detection  
- Multiplayer co-op mode  
- AI-generated ambient sound effects  
- Backend proxy for secure API handling  

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

