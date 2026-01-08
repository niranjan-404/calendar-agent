# Calendar-Agent

Application featuring a real-time AI voice assistant powered by an AI Agent with integrated **Google Calendar** capabilities.

## 🚀 Features

* **Voice-to-Voice AI:** Low-latency interaction using OpenAI's WebRTC implementation.
* **Calendar Integration:** View and schedule events directly through the AI.
* **Full-Stack:** Next.js App Router for a seamless frontend and backend experience.

---

## 🛠️ Local Setup

### 1. Prerequisites

* [Node.js](https://nodejs.org/) (v21 or higher)
* An [OpenAI API Key](https://platform.openai.com/)
* A [Google Cloud Project](https://console.cloud.google.com/) with Calendar API enabled

### 2. Environment Variables

Create a `.env.local` file in the root directory:

```env
# OpenAI
OPENAI_API_KEY=your_openai_key

# Google Service Account
GOOGLE_PROJECT_ID=your-project-id
GOOGLE_CLIENT_EMAIL=your-service-account@your-project.iam.gserviceaccount.com
GOOGLE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nYourKeyContents\n-----END PRIVATE KEY-----\n"
GOOGLE_CLIENT_ID=
GOOGLE_AUTH_URI=
GOOGLE_TOKEN_URI=
GOOGLE_AUTH_PROVIDER_X509_CERT_URL=
GOOGLE_CLIENT_X509_CERT_URL=
GOOGLE_UNIVERSE_DOMAIN=

# primary email
CALENDAR_ID=primary email

```

### 3. Google Calendar Authorization

1. Go to the **Google Cloud Console** > **IAM & Admin** > **Service Accounts**.
2. Create a key for your service account in **JSON** format.
3. Open your Google Calendar settings.
4. Under **"Share with specific people"**, add the Service Account Email and grant it **"Make changes to events"** permissions.

---

## 🏃 Running Locally

```bash
# Install dependencies
npm install

# Run the development server
npm run dev

```

Open [http://localhost:3000](https://www.google.com/search?q=http://localhost:3000) to view the app.


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

