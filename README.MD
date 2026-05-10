<div align="center">

# 🤖 LLM Chat Application

**A production-ready, ChatGPT-style AI chat interface built with React + Node.js + Groq**

[![React](https://img.shields.io/badge/React-18-61dafb?style=flat-square&logo=react&logoColor=white)](https://reactjs.org/)
[![Node.js](https://img.shields.io/badge/Node.js-20-339933?style=flat-square&logo=node.js&logoColor=white)](https://nodejs.org/)
[![Vite](https://img.shields.io/badge/Vite-5-646cff?style=flat-square&logo=vite&logoColor=white)](https://vitejs.dev/)
[![Groq](https://img.shields.io/badge/Groq-API-f55036?style=flat-square)](https://groq.com/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-CSS-38bdf8?style=flat-square&logo=tailwindcss&logoColor=white)](https://tailwindcss.com/)

<br/>

![Chat App Preview](https://via.placeholder.com/900x500/212121/339cff?text=LLM+Chat+Application)

<br/>

> A full-stack AI conversational application with persistent chat threads,
> real-time streaming responses, syntax-highlighted code blocks, and a
> fully responsive dark-mode UI inspired by ChatGPT.

</div>

---

## ✨ Features

- 🧠 **Groq-powered AI** — Ultra-fast inference via the Groq LPU™ API
- 💬 **Persistent chat threads** — Conversations are stored and resumable
- ⚡ **Streaming word-by-word replies** — Animated token-by-token response rendering
- 🛑 **Stop generation** — Abort an in-progress AI response at any time
- 🎨 **Syntax-highlighted code blocks** — Fenced code with language label + one-click copy
- 📱 **Fully responsive** — Mobile drawer sidebar, tablet, laptop, and ultrawide support
- 🌙 **Dark-mode first** — Polished dark theme throughout
- 🔒 **Environment-based config** — API keys stay in `.env`, never in source

---

## 🗂️ Project Structure

```
LLMAPPLICATION/
│
├── 📁 Backend/                        # Express.js API server
│   ├── 📁 models/
│   │   └── 📄 OverAllScheam.js        # Mongoose schema — threads & messages
│   ├── 📁 routes/
│   │   └── 📄 chat.js                 # REST endpoints: /chat/ai, /chat/thread
│   ├── 📁 utils/
│   │   └── 📄 groq.js                 # Groq SDK client initialisation
│   ├── 📄 server.js                   # Express app entry point
│   ├── 📄 .env                        # Environment variables (not committed)
│   ├── 📄 .gitignore
│   ├── 📄 package.json
│   └── 📄 package-lock.json
│
└── 📁 Frontend/
    └── 📁 frontend/                   # Vite + React application
        ├── 📁 public/                 # Static assets (logo, favicon)
        ├── 📁 src/
        │   ├── 📄 main.jsx            # React DOM entry point
        │   ├── 📄 Mycontext.jsx       # Global React Context definition
        │   │
        │   ├── 🎨 App.css             # Root layout — viewport jail, app shell
        │   ├── ⚛️  App.jsx             # Root component — state, context, sidebar toggle
        │   │
        │   ├── 🎨 SidebarMain.css     # 3-zone sidebar layout (top/scroll/bottom)
        │   ├── ⚛️  SidebarMain.jsx     # Sidebar — thread list, new chat, user profile
        │   │
        │   ├── 🎨 ChatWindow.css      # Navbar, input bar, bottom section styles
        │   ├── ⚛️  ChatWindow.jsx      # Chat window — navbar, input, API calls
        │   │
        │   ├── 🎨 Chat.css            # Bubble styles, code blocks, markdown, loader
        │   ├── ⚛️  Chat.jsx            # Message list — markdown renderer, animation
        │   │
        │   ├── 🎨 index.css           # Tailwind base imports
        │   └── ⚛️  Message.jsx         # Standalone test component (dev utility)
        │
        ├── 📄 vite.config.js          # Vite build configuration
        ├── 📄 postcss.config.js       # PostCSS + Tailwind pipeline
        ├── 📄 index.html              # HTML shell
        ├── 📄 package.json
        └── 📄 eslint.config.js
```

---

## 🚀 Getting Started

### Prerequisites

| Tool         | Version                                         |
| ------------ | ----------------------------------------------- |
| Node.js      | `≥ 18.x`                                        |
| npm          | `≥ 9.x`                                         |
| MongoDB      | Local or [Atlas](https://www.mongodb.com/atlas) |
| Groq API Key | [console.groq.com](https://console.groq.com)    |

---

### 1 — Clone the repository

```bash
git clone https://github.com/your-username/llm-chat-application.git
cd llm-chat-application
```

---

### 2 — Set up the Backend

```bash
cd Backend
npm install
```

Create a `.env` file in the `Backend/` directory:

```env
# Backend/.env

PORT=8080
MONGO_URI=mongodb://localhost:27017/llmchat
GROQ_API_KEY=your_groq_api_key_here
```

Start the development server:

```bash
node server.js
# → API listening on http://localhost:8080
```

---

### 3 — Set up the Frontend

```bash
cd Frontend/frontend
npm install
npm run dev
# → App running on http://localhost:5173
```

---

## 🔌 API Reference

### `POST /chat/ai`

Send a message and receive an AI reply.

**Request body**

```json
{
  "threadID": "550e8400-e29b-41d4-a716-446655440000",
  "message": "Explain how React Context works"
}
```

**Response**

```json
{
  "reply": "React Context provides a way to pass data through the component tree..."
}
```

---

### `GET /chat/thread`

Fetch all saved conversation threads.

**Response**

```json
[
  { "threadId": "550e8400...", "title": "React Context explanation" },
  { "threadId": "7f3a9b12...", "title": "Sorting algorithms in Python" }
]
```

---

### `GET /chat/thread/:threadID`

Load the full message history for a specific thread.

**Response**

```json
{
  "messages": [
    { "role": "user", "content": "Explain how React Context works" },
    { "role": "assistant", "content": "React Context provides a way..." }
  ]
}
```

---

## 🏗️ Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                         Browser (React)                         │
│                                                                 │
│  ┌──────────────┐   ┌──────────────────────────────────────┐   │
│  │  SidebarMain │   │           ChatWindow                 │   │
│  │              │   │  ┌────────────────────────────────┐  │   │
│  │ ┌──────────┐ │   │  │          Navbar                │  │   │
│  │ │  Top     │ │   │  ├────────────────────────────────┤  │   │
│  │ ├──────────┤ │   │  │   Chat (scrollable messages)   │  │   │
│  │ │ Threads  │ │   │  │   ┌──────────────────────────┐ │  │   │
│  │ │(scrolls) │ │   │  │   │ ReactMarkdown + CodeBlock│ │  │   │
│  │ ├──────────┤ │   │  │   └──────────────────────────┘ │  │   │
│  │ │  Bottom  │ │   │  ├────────────────────────────────┤  │   │
│  │ └──────────┘ │   │  │      Input Bar (fixed)         │  │   │
│  └──────────────┘   │  └────────────────────────────────┘  │   │
│                     └──────────────────────────────────────┘   │
└───────────────────────────┬─────────────────────────────────────┘
                            │ axios (HTTP)
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│                     Backend (Express.js)                        │
│                                                                 │
│   POST /chat/ai  ──►  routes/chat.js  ──►  utils/groq.js       │
│                                │                                │
│                                ▼                                │
│                         MongoDB (Mongoose)                      │
│                         OverAllScheam.js                        │
└─────────────────────────────────────────────────────────────────┘
                            │ Groq SDK
                            ▼
                    ┌───────────────┐
                    │   Groq API    │
                    │  (LPU™ Cloud) │
                    └───────────────┘
```

---

## 🧩 Component Reference

| Component     | File                | Responsibility                                                              |
| ------------- | ------------------- | --------------------------------------------------------------------------- |
| `App`         | `App.jsx`           | Root — holds all state, provides Context, owns sidebar open/close toggle    |
| `SidebarMain` | `SidebarMain.jsx`   | Three-zone sidebar: logo+new-chat / scrollable thread list / user profile   |
| `ChatWindow`  | `ChatWindow.jsx`    | Navbar, API call logic, abort controller, input bar                         |
| `Chat`        | `Chat.jsx`          | Renders message list with ReactMarkdown, streaming animation, scroll anchor |
| `CodeBlock`   | _(inside Chat.jsx)_ | Fenced code with language label, copy button, syntax highlighting           |
| `MyContext`   | `Mycontext.jsx`     | Creates the shared React Context consumed by all components                 |

---

## 🎨 UI Layout System

The layout follows a strict **viewport-locked flex architecture** that prevents body scroll and keeps every section in place:

```
html / body / #root  →  height: 100%;  overflow: hidden;   (viewport jail)
  .app               →  display: flex; height: 100%;        (horizontal split)
    .sidebar         →  flex-shrink: 0; height: 100%;
      .sidebar-top   →  flex-shrink: 0                      (never compresses)
      .sidebar-threads → flex: 1; min-height: 0; overflow-y: auto  ← scrolls
      .sidebar-bottom  → flex-shrink: 0                     (always visible)
    .chatWindow      →  flex: 1; min-width: 0; overflow: hidden
      .navbarr       →  flex-shrink: 0                      (always visible)
      .chat-wrapper  →  flex: 1; min-height: 0; overflow: hidden  ← scrolls
      .bottomSection →  flex-shrink: 0                      (always visible)
```

> **Key insight:** `min-height: 0` on every scrollable flex child is required.
> Without it, browsers default to `min-height: auto`, which prevents shrinking
> below content height — making the scrollbar never activate.

---

## 📱 Responsive Breakpoints

| Breakpoint               | Behaviour                                                                     |
| ------------------------ | ----------------------------------------------------------------------------- |
| `> 1024px` (Desktop)     | Full sidebar (260px), centered chat column (max 768px)                        |
| `≤ 1024px` (Tablet)      | Narrower sidebar (220px), adjusted spacing                                    |
| `≤ 768px` (Mobile)       | Sidebar becomes a slide-in drawer overlay; hamburger button visible in navbar |
| `≤ 480px` (Small mobile) | Bubbles expand to 92% width; share button hidden to save space                |

---

## 🛠️ Tech Stack

**Frontend**

- [React 18](https://reactjs.org/) — UI framework
- [Vite](https://vitejs.dev/) — Build tool & dev server
- [Tailwind CSS](https://tailwindcss.com/) — Utility CSS base
- [react-markdown](https://github.com/remarkjs/react-markdown) — Markdown rendering
- [remark-gfm](https://github.com/remarkjs/remark-gfm) — GitHub Flavored Markdown
- [react-syntax-highlighter](https://github.com/react-syntax-highlighter/react-syntax-highlighter) — Code block highlighting
- [axios](https://axios-http.com/) — HTTP client
- [uuid](https://github.com/uuidjs/uuid) — Thread ID generation

**Backend**

- [Node.js](https://nodejs.org/) + [Express](https://expressjs.com/) — API server
- [Mongoose](https://mongoosejs.com/) — MongoDB ODM
- [Groq SDK](https://console.groq.com/docs/libraries) — AI inference client
- [dotenv](https://github.com/motdotla/dotenv) — Environment config
- [cors](https://github.com/expressjs/cors) — Cross-origin requests

---

## 🔐 Environment Variables

| Variable       | Location       | Description                                                         |
| -------------- | -------------- | ------------------------------------------------------------------- |
| `PORT`         | `Backend/.env` | Port the Express server listens on (default: `8080`)                |
| `MONGO_URI`    | `Backend/.env` | MongoDB connection string                                           |
| `GROQ_API_KEY` | `Backend/.env` | Your Groq API key from [console.groq.com](https://console.groq.com) |

> ⚠️ **Never commit `.env` to version control.** Both `.gitignore` files already exclude it.

---

## 📦 Scripts

### Backend

```bash
node server.js          # Start production server
nodemon server.js       # Start with auto-reload (install nodemon globally)
```

### Frontend

```bash
npm run dev             # Start Vite dev server (hot reload)
npm run build           # Production build → dist/
npm run preview         # Preview production build locally
npm run lint            # ESLint check
```

---

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/your-feature-name`
3. Commit your changes: `git commit -m "feat: add your feature"`
4. Push to the branch: `git push origin feature/your-feature-name`
5. Open a Pull Request

Please follow [Conventional Commits](https://www.conventionalcommits.org/) for commit messages.

---

## 📄 License

This project is licensed under the **MIT License** — see the [LICENSE](LICENSE) file for details.

---

<div align="center">

Made with ❤️ by **Tanishq**

⭐ If you found this useful, consider giving it a star!

</div>
