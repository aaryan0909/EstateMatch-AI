# EstateMatch AI 🇨🇦

**Your cynical, intelligent, and helpful assistant for Canadian Real Estate.**

EstateMatch AI helps you cut through the marketing fluff of real estate listings. It analyzes descriptions to find hidden red flags (Strata fees, oil tanks, special assessments), checks if the home actually meets your criteria, and even drafts inquiry emails for you.

---

## 🚀 Key Features

### 1. **The "Cynical Auditor" Engine**
Most AI tools just summarize. Ours acts like a grumpy home inspector.
*   **Anti-Hallucination:** It only reports facts it can quote directly from the text.
*   **Buy vs. Rent Modes:** Tailored logic for each.
    *   *Buying:* Checks for knob & tube wiring, leasehold status, age of roof.
    *   *Renting:* Checks for pet deposits, utilities inclusions, fixed-term clauses.

### 2. **Match Score 🎯**
Get a definitive 0-100 score based on your specific needs:
*   Budget constraints
*   Bedroom/Bathroom count
*   Commute & Lifestyle priorities
*   Custom "Must-Haves" (e.g., "Must be south-facing")

### 3. **Chat with the Listing 💬**
Stop Control-F'ing through long descriptions. Just ask:
*   "Is the heating gas or electric?"
*   "Does it mention a parking stall number?"
*   "Are rentals allowed?"

### 4. **Inquiry Drafts ✉️**
Found a red flag? The AI automatically drafts a professional email to the agent/landlord specifically asking about the missing info or risks it found.

---

## 🛠️ Tech Stack

*   **Frontend:** React (Next.js ready), Tailwind CSS
*   **AI Model:** Google Gemini 2.5 Flash (via `@google/genai`)
*   **Styling:** Custom "Pastel Soft Life" UI with Bento Grid layouts
*   **Font:** 'Outfit' from Google Fonts

---

## 📦 Setup & Installation

1.  **Clone the repo**
    ```bash
    git clone https://github.com/yourusername/estatematch-ai.git
    cd estatematch-ai
    ```

2.  **Install Dependencies**
    ```bash
    npm install
    ```

3.  **Get a Gemini API Key**
    *   Visit [Google AI Studio](https://aistudio.google.com/).
    *   Create a free API key.

4.  **Run the Project**
    *   This project is set up to run in a standard React environment or specific AI coding sandboxes.
    *   Ensure `process.env.API_KEY` is set in your environment or passed during build.

---

## 📸 How to Use

1.  **Select Mode:** Toggle between **BUY** and **RENT** at the top.
2.  **Set Preferences:** Enter your budget, desired beds/baths, and prioritize what matters (Commute vs. Condition).
3.  **Paste Listing:** Copy the full description/details from Realtor.ca, Zolo, or Craigslist and paste it into the box.
4.  **Analyze:** Click the button and watch the magic happen.
5.  **Interrogate:** Use the "Chat" tab to ask specific questions about the property.

---

## 🇨🇦 Canadian Context
This tool is specifically tuned for Canadian real estate terms:
*   *Strata Fees* (Condo fees)
*   *Special Assessments* (Unexpected condo costs)
*   *Knob and Tube* (Old wiring found in Toronto/Vancouver homes)
*   *Oil Tanks* (Environmental hazards in older homes)

---

*Built with ❤️ for stressed home buyers.*
