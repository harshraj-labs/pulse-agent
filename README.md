# PULSE — Daily Team Digest Agent for Slack

> Eliminate unnecessary standups. Every team member submits a 60-second brief at 5 PM. PULSE generates an AI-powered manager digest at 6 PM. No meeting needed.

![PULSE Banner](./assets/banner.png)

## 🎯 The Problem

Daily standup meetings are one of the biggest time killers in modern teams. 
A 15-minute meeting with 8 people = 2 hours of collective productivity lost every single day. Most of that information could be communicated asynchronously in 60 seconds per person.

## ✅ The Solution

PULSE is a Slack agent that automates the entire standup workflow:

1. **5:00 PM** - PULSE DMs every team member with a brief submission modal
2. **5:45 PM** - Follow-up reminder to anyone who hasn't submitted yet
3. **Employee submits** - 3 fields: tasks done, blockers, tomorrow's plan
4. **6:00 PM** - AI-generated team digest posted to the manager's channel
5. **Zero meetings needed**

## 🚀 Features

- **📋 `/pulse`** - Submit your daily brief via a clean Slack modal
- **📊 `/pulse-report`** - Manually trigger an AI team digest anytime
- **👥 `/pulse-status`** - See who has and hasn't submitted today
- **🚧 `/pulse-blockers`** - View all active blockers reported by the team
- **🤖 AI Summaries** - Powered by Llama 3.1 via Groq API
- **⏰ Automated Scheduling** - Cron-based triggers at 5 PM, 5:45 PM, and 6 PM IST (Mon–Fri)
- **💾 Persistent Storage** - All briefs stored in SQLite with full history
- **🔔 Smart Reminders** - Only reminds people who haven't submitted yet

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────┐
│                        PULSE Agent                      │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  Slack Workspace                                        │
│  ┌─────────────┐    /pulse command                      │
│  │  Employee   │───────────────────►┐                   │
│  └─────────────┘                    │                   │
│                              ┌──────▼──────┐            │
│  ┌─────────────┐             │  Slack Bolt │            │
│  │  node-cron  │────────────►│   App.js    │            │
│  │  Scheduler  │  5PM/6PM    └──────┬──────┘            │
│  └─────────────┘                    │                   │
│                              ┌──────▼──────┐            │
│                              │   SQLite    │            │
│                              │  Database   │            │
│                              └──────┬──────┘            │
│                                     │                   │
│                              ┌──────▼──────┐            │
│                              │  Groq API   │            │
│                              │  Llama 3.1  │            │
│                              └──────┬──────┘            │
│                                     │                   │
│  ┌─────────────┐             ┌──────▼──────┐            │
│  │   Manager   │◄────────────│   Digest    │            │
│  │   Channel   │  6PM digest │  Builder    │            │
│  └─────────────┘             └─────────────┘            │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

## 🛠️ Tech Stack

| Technology | Purpose |
|------------|---------|
| Node.js + JavaScript | Runtime |
| Slack Bolt SDK | Slack event handling & Socket Mode |
| SQLite + better-sqlite3 | Brief storage & history |
| Groq API (Llama 3.1) | AI-powered team summaries |
| node-cron | Automated scheduling |
| dotenv | Environment configuration |

## 📦 Installation & Setup

### Prerequisites
- Node.js 18+
- A Slack workspace
- Slack App with Socket Mode enabled
- Groq API key (free at console.groq.com)

### 1. Clone the repository
```bash
git clone https://github.com/YOUR_USERNAME/pulse-agent
cd pulse-agent
```

### 2. Install dependencies
```bash
npm install
```

### 3. Create your Slack App
- Go to [api.slack.com/apps](https://api.slack.com/apps)
- Create a new app → From scratch
- Enable Socket Mode → Generate app token (`xapp-`)
- Add Bot Token Scopes: `chat:write`, `commands`, `users:read`, `im:write`
- Install app to workspace → Copy bot token (`xoxb-`)
- Add slash commands: `/pulse`, `/pulse-status`, `/pulse-report`, `/pulse-blockers`

### 4. Configure environment
```bash
cp .env.example .env
```

Fill in your `.env`:
```
SLACK_BOT_TOKEN=xoxb-your-token
SLACK_SIGNING_SECRET=your-signing-secret
SLACK_APP_TOKEN=xapp-your-app-token
GROQ_API_KEY=your-groq-key
MANAGER_CHANNEL_ID=C0XXXXXXXXX
TEAM_MEMBERS=U0XXXXXXXXX,U0XXXXXXXXX
```

### 5. Run PULSE
```bash
npm start
```

## 📋 Usage

### For Employees
1. Type `/pulse` in any Slack channel
2. Fill in the 3-field modal (60 seconds)
3. Hit Submit — you're done

### For Managers
- Receive automatic AI digest at 6 PM every weekday
- Run `/pulse-report` anytime for an instant digest
- Run `/pulse-status` to see submission progress
- Run `/pulse-blockers` to see all active blockers

## 🗂️ Project Structure

```
pulse-agent/
├── src/
│   ├── app.js          # Main Slack Bolt app, event handlers
│   ├── db.js           # SQLite database layer
│   ├── modal.js        # Slack Block Kit UI components
│   ├── summary.js      # AI summary generation (Groq)
│   └── scheduler.js    # Cron job scheduling
├── .env.example
├── package.json
└── README.md
```

## 🏆 Hackathon Track

Submitted to: **New Slack Agent Track** - Slack Agent Builder Challenge 2026

**Technologies used:**
- ✅ MCP-ready architecture
- ✅ Slack AI capabilities (Block Kit, Socket Mode, Events API)
- ✅ Real workflow automation

## 📄 License

MIT