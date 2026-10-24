# 🤖 SmartBot — Advanced AI Chatbot Web Application

[![Python](https://img.shields.io/badge/Python-3.10%2B-blue.svg)](https://www.python.org/)
[![Flask](https://img.shields.io/badge/Flask-3.1%2B-green.svg)](https://flask.palletsprojects.com/)
[![OpenAI](https://img.shields.io/badge/OpenAI-SDK%20v1%2B-orange.svg)](https://platform.openai.com/)
[![License](https://img.shields.io/badge/License-MIT-purple.svg)](LICENSE)

**SmartBot** is a full-stack, real-time AI conversational web application powered by **Python Flask**, **Vanilla HTML5/CSS3/JavaScript**, and the official **OpenAI Python SDK**. Designed for university projects, technical portfolios, and modern web application showcases, SmartBot combines state-of-the-art AI responses with an elegant glassmorphic user interface.

---

## 📑 Table of Contents
1. [Project Overview & Objectives](#-project-overview--objectives)
2. [Key Features](#-key-features)
3. [Architecture & Request Lifecycle](#-architecture--request-lifecycle)
4. [Technology Stack](#-technology-stack)
5. [Project Folder Structure](#-project-folder-structure)
6. [Prerequisites & System Requirements](#-prerequisites--system-requirements)
7. [Step-by-Step Installation Guide](#-step-by-step-installation-guide)
8. [OpenAI API Key Configuration](#-openai-api-key-configuration)
9. [How to Run the Application](#-how-to-run-the-application)
10. [Test Cases & Quality Assurance](#-test-cases--quality-assurance)
11. [Sample Dataset & Prompts](#-sample-dataset--prompts)
12. [In-Depth Codebase Walkthrough](#-in-depth-codebase-walkthrough)
13. [Security Architecture & Best Practices](#-security-architecture--best-practices)
14. [Troubleshooting Common Issues](#-troubleshooting-common-issues)
15. [Future Roadmap & Extensions](#-future-roadmap--extensions)

---

## 🌟 Project Overview & Objectives

### Objective
To build an intelligent, secure, responsive chatbot web application that enables users to interact naturally with AI models in real time for:
- **Programming & Debugging**: Writing, explaining, and refactoring code in Python, JavaScript, C++, SQL, etc.
- **Academic Tutoring & Concepts**: Breaking down complex subjects like Machine Learning, Algorithms, and Mathematics into intuitive analogies.
- **College Project Guidance**: Brainstorming project architectures, technology stacks, and implementation roadmaps.
- **Study Schedules & Learning Plans**: Designing customized 7-day or 30-day study curriculums.

---

## 🚀 Key Features

### 1. AI-Powered Conversation Engine
- Real-time conversational AI powered by OpenAI models (e.g., `gpt-4o-mini`, `gpt-4o`, `gpt-3.5-turbo`).
- Context-aware dialogue maintaining the last 20 messages for accurate follow-up comprehension.
- Safe Demo/Offline fallback mode allowing instant UI and feature testing even before entering an API key.
- Configurable system personality via the `.env` file.

### 2. Glassmorphic User Interface
- **Dark & Light Mode**: Seamless dynamic theme switching with persistent user preference stored in `localStorage`.
- **Responsive Drawer**: Collapsible mobile sidebar with backdrop blur and fluid CSS animations.
- **Interactive Markdown**: Full support for headers, tables, ordered/unordered lists, blockquotes, and bold text.
- **Syntax Highlighting & One-Click Copy**: Code blocks with automatic language detection and a copy button with feedback animations.
- **Interactive Suggestions**: 6 prompt cards across Python, Machine Learning, Web Dev, Projects, Study Plans, and Math.

### 3. Conversation Management
- **Multi-Chat History**: Create, switch, search, rename, and delete conversations.
- **Zero-Backend Storage Overhead**: Local storage persistence ensures complete privacy and preserves conversations across page reloads.
- **Export Capabilities**: Export conversations directly to Markdown (`.md`), Plain Text (`.txt`), or JSON (`.json`).
- **Instant Search Filter**: Live text filtering of past conversations in the sidebar.

### 4. Accessibility & Voice Integration
- **Text-to-Speech (TTS)**: Built-in voice synthesizer using the Web Speech API to read answers aloud.
- **Voice Input (Speech-to-Text)**: Microphone dictation directly into the prompt box.
- **Keyboard Shortcuts**: `Ctrl + K` for New Chat, `Enter` to send, and `Shift + Enter` for multi-line inputs.

---

## 🏛️ Architecture & Request Lifecycle

```
[ User Browser / Client ]
      │
      ├── 1. Sends prompt or clicks suggestion card
      │
      ▼
[ JavaScript Client (app.js) ]
      │
      ├── 2. Manages UI state, typing indicator, localStorage
      ├── 3. Sends POST request to /api/chat with sanitized context
      │
      ▼
[ Flask Application (app.py) ]
      │
      ├── 4. Validates payload (roles, character lengths, JSON integrity)
      ├── 5. Checks environment variables via python-dotenv
      │
      ▼
[ Official OpenAI Python SDK ]
      │
      ├── 6. Secure HTTPS handshake with OpenAI API (keeps key hidden)
      ├── 7. Applies custom system prompt instructions
      │
      ▼
[ OpenAI Large Language Model (GPT-4o-mini) ]
      │
      └── 8. Generates structured markdown output
      ▲
      │
[ Response Stream Back to Client ]
      │
      └── 9. Client receives JSON, parses markdown, formats code, saves to localStorage
```

---

## 🛠️ Technology Stack

| Layer | Technology | Purpose |
| :--- | :--- | :--- |
| **Frontend Structure** | HTML5 Semantic Elements | Accessible document layout, landmarks, and modals |
| **Styling & Theme** | Modern CSS3 (Vanilla) | CSS Variables, Glassmorphism, Responsive Flexbox/Grid, Animations |
| **Client Scripting** | Vanilla JavaScript (ES6+) | State machine, localStorage, Web Speech API, DOM rendering |
| **Backend Framework** | Python 3.10+ / Flask 3.1+ | REST endpoints, security filtering, static and template routing |
| **AI Integration** | OpenAI Python SDK (v1.12+) | Official client for Chat Completions and Responses API |
| **Environment Config** | python-dotenv | Secure `.env` environment variable isolation |
| **Markdown & Code** | Marked.js + Highlight.js | Safe markdown conversion and syntax highlighting |

---

## 📁 Project Folder Structure

```
smart_ai_chatbot/
│
├── app.py                  # Core Flask backend server and API endpoints
├── requirements.txt        # Python package dependencies
├── .env.example            # Environment template file
├── .env                    # Local secrets (never committed to Git)
├── .gitignore              # Git ignore rules for virtualenvs, caches, and secrets
├── test_app.py             # Automated unit and integration test suite
├── README.md               # Comprehensive project documentation
│
├── templates/
│   └── index.html          # Semantic HTML single-page chat application
│
└── static/
    ├── style.css           # Glassmorphic, responsive, dual-theme stylesheet
    └── app.js              # State manager, markdown parser, speech & storage logic
```

---

## 💻 Prerequisites & System Requirements

- **Operating System**: Windows 10/11, macOS 10.15+, or Ubuntu/Debian Linux.
- **Python**: Version 3.10, 3.11, or 3.12 (Check with `python --version`).
- **Web Browser**: Google Chrome, Microsoft Edge, Mozilla Firefox, or Safari.
- **Code Editor**: Visual Studio Code (recommended).
- **OpenAI Account**: An active account with API credits from [platform.openai.com](https://platform.openai.com).

---

## ⚙️ Step-by-Step Installation Guide

### Windows (PowerShell / Command Prompt)

1. **Open the project folder in VS Code or Terminal**:
   ```powershell
   cd "c:\Users\ravik\Downloads\ai chatbot"
   ```

2. **Create a Python Virtual Environment**:
   ```powershell
   py -m venv .venv
   ```

3. **Activate the Virtual Environment**:
   ```powershell
   .venv\Scripts\activate
   ```
   *(You should see `(.venv)` appear at the start of your terminal prompt).*

4. **Install Required Packages**:
   ```powershell
   python -m pip install --upgrade pip
   python -m pip install -r requirements.txt
   ```

5. **Configure your Environment File**:
   - Copy `.env.example` to `.env`:
     ```powershell
     copy .env.example .env
     ```
   - Open `.env` in any text editor and insert your OpenAI API key.

---

### macOS & Linux (Bash / Zsh)

1. **Navigate to the directory**:
   ```bash
   cd smart_ai_chatbot
   ```

2. **Create and activate the virtual environment**:
   ```bash
   python3 -m venv .venv
   source .venv/bin/activate
   ```

3. **Install dependencies**:
   ```bash
   pip install --upgrade pip
   pip install -r requirements.txt
   ```

4. **Copy the environment configuration**:
   ```bash
   cp .env.example .env
   ```

---

## 🔑 OpenAI API Key Configuration

1. Visit [https://platform.openai.com/api-keys](https://platform.openai.com/api-keys) and sign in.
2. Click **Create new secret key**, give it a name (e.g., `SmartBot-Key`), and copy the key (it starts with `sk-` or `sk-proj-`).
3. Open the `.env` file in your project root:
   ```env
   OPENAI_API_KEY=sk-proj-your_actual_key_here
   OPENAI_MODEL=gpt-4o-mini
   PORT=5000
   FLASK_DEBUG=True
   ```
4. **Note on Quotas**: OpenAI API usage requires prepaid credits on your OpenAI developer account. If credits are exhausted, the app gracefully alerts you with a Rate Limit / Quota notification.
5. **Note on Security**: Never share or push your `.env` file to public GitHub repositories!

---

## ▶️ How to Run the Application

1. Make sure your virtual environment is active:
   ```powershell
   .venv\Scripts\activate
   ```
2. Start the Flask server:
   ```powershell
   python app.py
   ```
3. You will see terminal output similar to:
   ```
   =================================================================
     🚀 SmartBot — Advanced AI Chatbot Web Application
     📍 Running at: http://127.0.0.1:5000
     🤖 Active Model: gpt-4o-mini
     🔑 API Key: Configured ✅
   =================================================================
   ```
4. Open your web browser and navigate to:
   [http://127.0.0.1:5000](http://127.0.0.1:5000)

---

## 🧪 Test Cases & Quality Assurance

Run the automated test suite anytime with:
```powershell
python test_app.py
```

| # | Test Scenario | Steps to Perform | Expected Result |
| :--- | :--- | :--- | :--- |
| **1** | Normal Query | Type `"What is an API?"` and press Enter. | Message displays, typing dots appear, AI answers with markdown explanation. |
| **2** | Follow-Up Question | Send `"Give me an example in Python"`. | AI understands context from the previous question and provides Python code. |
| **3** | Prompt Suggestion | Click any of the 6 prompt cards on the welcome screen. | The prompt is populated and submitted immediately; answer is generated. |
| **4** | New Conversation | Click `+ New Chat` or press `Ctrl + K`. | Chat area clears to welcome screen; a new conversation entry appears in the sidebar. |
| **5** | Switch Conversations | Create two chats with different topics, click between them. | The chat view switches instantly without page reload; messages match the selected chat. |
| **6** | Rename Conversation | Double-click title or click the pencil icon next to title. | Dialog asks for new title; sidebar and navbar update accordingly. |
| **7** | Delete Conversation | Click the trash icon on a sidebar chat item. | Confirmation modal pops up; confirming removes only that specific chat. |
| **8** | Clear Current Chat | Click the trash can icon in the top navbar. | Confirmation modal appears; current chat messages are cleared. |
| **9** | Page Reload Persistence | Ask questions, then refresh the browser (`F5`). | All conversations and active messages reload intact from `localStorage`. |
| **10** | Empty Message Prevention | Click send or press Enter while input is blank. | Send button remains disabled; nothing is submitted. |
| **11** | Code Block Copy | Ask for code, hover over the block, click `Copy code`. | Code is copied to clipboard; button displays `Copied!` checkmark. |
| **12** | Voice Synthesis (TTS) | Click `Listen` under an assistant message or enable auto-readout. | Speech synthesizer speaks the assistant response clearly through speakers. |
| **13** | Dark / Light Theme | Click the Sun / Moon button in the sidebar footer. | Theme toggles smoothly with immediate contrast shift and persists on reload. |
| **14** | Mobile Responsiveness | Resize window to < 768px or open DevTools device mode. | Sidebar converts into slide-out drawer with hamburger toggle. |

---

## 📚 Sample Dataset & Prompts

### 1. General Knowledge
- **Prompt**: *"What is the difference between synchronous and asynchronous programming?"*
- **Expected Output**: Conceptual breakdown comparing blocking operations vs. event loops, with real-world analogies (e.g., ordering coffee at a counter vs. buzzer).

### 2. Python Programming
- **Prompt**: *"Write an efficient Python program to check whether a number is prime."*
- **Expected Output**: A clean Python function using the $6k \pm 1$ optimization, docstrings, type annotations, and sample driver code.

### 3. Machine Learning
- **Prompt**: *"Explain Machine Learning in simple language with an intuitive real-world example."*
- **Expected Output**: Definition of supervised vs. unsupervised learning using a child learning to identify fruit (apples vs. oranges) based on features (color, texture, weight).

### 4. College Project Planning
- **Prompt**: *"Help me create an AI-based college project idea with full architecture and roadmap."*
- **Expected Output**: Complete project blueprint (e.g., Smart Healthcare Diagnosis or Document Q&A), recommended stack, database schema, and milestone phases.

### 5. Study Planning
- **Prompt**: *"Create a comprehensive 7-day Python study plan for beginners."*
- **Expected Output**: Daily day-by-day timetable: Day 1 (Variables & Syntax), Day 2 (Control Flow), Day 3 (Functions & Modules), Day 4 (Data Structures), Day 5 (OOP), Day 6 (File I/O & APIs), Day 7 (Capstone Mini-Project).

---

## 🔍 In-Depth Codebase Walkthrough

### 1. `app.py` (Backend Engine)
- **`load_dotenv(override=True)`**: Safely reads environment variables from `.env` without hardcoding credentials in git history.
- **`validate_chat_payload(payload)`**: Verifies that the JSON request contains a valid `messages` array, checks that only allowed roles (`user`, `assistant`) are sent, and limits message characters to 4,000.
- **`call_openai_model(messages)`**: Uses `openai.OpenAI()` client to request chat completions using `OPENAI_MODEL` (`gpt-4o-mini`).
- **`generate_demo_response(query)`**: High-quality offline fallback providing educational replies and guidance when an API key is not yet provided.
- **Route `GET /api/status`**: Returns operational status, model name, and whether an API key is active without leaking secret tokens.
- **Route `POST /api/chat`**: Receives messages, catches OpenAI exceptions (`AuthenticationError`, `RateLimitError`, `APIConnectionError`), and translates them into user-friendly error messages.

### 2. `templates/index.html` (Semantic Frontend)
- Organized into clear accessibility landmarks: `<aside>` for conversation history, `<main>` for active chat, `<header>` for navigation and export actions, and `<footer>` for message input.
- Includes embedded SVGs for zero-latency icon rendering.
- Pre-configured modals for confirmation dialogs and notification toasts.

### 3. `static/style.css` (Glassmorphic Styling)
- Uses CSS variables (`--bg-primary`, `--brand-primary`, `--bubble-assistant-bg`) mapped to dark and light modes.
- Utilizes CSS Grid and Flexbox for mobile responsiveness across phones, tablets, and wide monitors.
- Implements micro-animations (`pulseRing`, `orbFloat`, `bounce`, `fadeInMessage`) for visual feedback.

### 4. `static/app.js` (Client State & Interaction)
- **State Machine**: Maintains active conversation, history array, theme, TTS status, and speech recognition state.
- **Safe DOM Rendering**: Escapes untrusted text to prevent Cross-Site Scripting (XSS), intercepts code fences to add interactive copy buttons, and formats markdown tables.
- **Web Speech API**: Powers voice dictation via `webkitSpeechRecognition` and voice synthesis via `speechSynthesis`.
- **Keyboard Listeners**: Intercepts `Ctrl+K` for instant new conversation creation and `Enter` for rapid message submission.

---

## 🛡️ Security Architecture & Best Practices

1. **Zero Secret Leakage**: The OpenAI API key is exclusively stored in `.env` on the server. The client browser never receives or stores the API key.
2. **Input Validation & Sanitization**:
   - Message length is restricted to 4,000 characters.
   - Payloads are restricted to a maximum size of 1 MB.
   - Message roles are strictly validated (`user` and `assistant` only).
3. **Cross-Site Scripting (XSS) Prevention**: User input is strictly escaped into HTML entities before rendering.
4. **Context Window Protection**: The backend automatically bounds context history to the last 20 messages, preventing runaway token consumption.
5. **Production Readiness**: When deploying to production:
   - Set `FLASK_DEBUG=False` in `.env`.
   - Run using a production WSGI server such as Gunicorn or Waitress:
     ```powershell
     pip install waitress
     waitress-serve --port=5000 app:app
     ```

---



## 🚀 Future Roadmap & Extensions

- [ ] **Document Q&A (RAG)**: Upload PDF/DOCX files to ask questions based on course textbooks using LangChain or LlamaIndex.
- [ ] **Database Integration**: SQLite or PostgreSQL storage using SQLAlchemy for user accounts and multi-device sync.
- [ ] **Real-Time Streaming**: Server-Sent Events (SSE) for word-by-word typing response streaming.
- [ ] **Code Sandbox**: Run Python code snippets directly in the browser using Pyodide (WebAssembly).
- [ ] **Admin Analytics**: Usage metrics, token counts, and conversation trend dashboard.

---

## 📜 License & Credits

Built with ❤️ for students, developers, and educators. Feel free to use, modify, and include this project in your academic submissions, resumes, and portfolios!
