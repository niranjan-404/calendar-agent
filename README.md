# Calendar-Agent
Application featuring a real-time AI voice assistant powered by an AI Agent with integrated **Google Calendar** capabilities.

## 🚀 Key Features

* **Low-Latency Voice Interaction:** Utilizes WebRTC for high-performance, bidirectional speech-to-speech communication.
* **Autonomous Tool Use:** The agent identifies scheduling intents and autonomously calls Google Calendar functions to create events.
* **Natural Language Understanding:** Handles complex scheduling requests, including date/time extraction and event titling.
* **Production Ready:** Fully responsive Next.js frontend with a secure backend architecture.

## 🔗 Project Links

* **Live Application:** [https://calendar-agent-jade.vercel.app/](https://calendar-agent-jade.vercel.app/)

---

## 🛠️ Technology Stack

* **Core Engine:** OpenAI Realtime API (`gpt-4o-realtime`)
* **Frontend:** React.js / Next.js (App Router)
* **Communication:** WebRTC (Real-time audio streaming)
* **Backend:** Next.js API Routes (Node.js)
* **Integrations:** Google Calendar API (Service Account authentication)

---

## ⚙️ Google Cloud Setup (Prerequisites)

To enable the agent to interact with Google Calendar:

1. **Create Project:** Go to the [Google Cloud Console](https://console.cloud.google.com/) and create a new project.
2. **Enable API:** Search for and enable the **Google Calendar API**.
3. **Service Account:**
* Navigate to **APIs & Services > Credentials**.
* Create a **Service Account** and copy its unique email address.
* Go to the **Keys** tab, click **Add Key > Create New Key (JSON)**. Save this file for your `.env` variables.


4. **Calendar Sharing:**
* Open your Google Calendar settings.
* Under **"Share with specific people"**, add the **Service Account Email**.
* Grant permissions to **"Make changes to events"**.



---

## 💻 Local Installation

### 1. Clone the Repository

```bash
git clone https://github.com/niranjan-404/calendar-agent.git
cd calendar-agent

```

### 2. Configure Environment Variables

Create a `.env.local` file in the root directory:

```env
# OpenAI Configuration
OPENAI_API_KEY=your_openai_key

# Google Service Account (from your JSON key)
GOOGLE_PROJECT_ID=your-project-id
GOOGLE_CLIENT_EMAIL=your-service-account@your-project.iam.gserviceaccount.com
GOOGLE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nYourKeyContents\n-----END PRIVATE KEY-----\n"

# Target Calendar ID
CALENDAR_ID=your-primary-email@gmail.com

```

### 3. Run Development Server

```bash
npm install
npm run dev

```

Navigate to `http://localhost:3000` to start interacting with the agent.

---

## 🏗️ Project Structure

```text
├── src/
│    ├── app/                # Next.js App Router (Pages & API)
│    │    ├── api/           # Backend routes
│    │    ├── layout.js      # Global layout
│    │    └── page.js        # Home page
│    │
│    └── lib/                # Shared utilities & configurations
│         └──calendar.js 
│
├── public/                  # Static assets (images, fonts, robots.txt)
├── .env.example             # Template for environment variables (tracked)
├── .env.local               # Actual secrets (ignored by git)
├── jsconfig.json           
└── package.json             # Absolute imports configuration
```
