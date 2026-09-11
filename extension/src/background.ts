import Groq from "groq-sdk";
import { createClient } from "@supabase/supabase-js";

const GROQ_API_KEY = import.meta.env.VITE_GROQ_API_KEY;
const SUPABASE_URL = "https://ecbqhlfguzkwffqbtbqz.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVjYnFobGZndXprd2ZmcWJ0YnF6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk5NjI1NDcsImV4cCI6MjA5NTUzODU0N30.aUWH4zHGvLl2ylUORZ3bMz7w0PPBUBrRCeRyfXSv22s";

// @ts-ignore
const groq = new Groq({ apiKey: GROQ_API_KEY, dangerouslyAllowBrowser: true });
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    persistSession: false
  }
});

chrome.action.onClicked.addListener((tab) => {
  if (tab.id) {
    chrome.tabs.sendMessage(tab.id, { type: 'TOGGLE_CHAT' }).catch(() => {});
  }
});

chrome.runtime.onMessage.addListener((request, _sender, sendResponse) => {
  if (request.type === 'SYNC_AUTH') {
    chrome.storage.local.set({ authData: request.payload }, () => {
      sendResponse({ success: true });
    });
    return true;
  }

  if (request.type === 'ANALYZE_CONTEXT') {
    saveToHistory(request.payload.url, request.payload.title);
    handleContextAnalysis(request.payload).then(sendResponse);
    return true;
  }
  
  if (request.type === 'CHAT') {
    handleChat(request.payload).then(sendResponse);
    return true;
  }
});

async function getUserProfile() {
  return new Promise((resolve) => {
    try {
      chrome.storage.local.get(['authData'], async (result) => {
        try {
          const authData = result.authData as any;
          if (authData && authData.user) {
            const userId = authData.user.id;
            const { data, error } = await supabase.from('profiles').select('*').eq('id', userId).single();
            if (error) console.error("Supabase error:", error);
            resolve(data || null);
          } else {
            resolve(null);
          }
        } catch (e) {
          console.error("Inner error:", e);
          resolve(null);
        }
      });
    } catch (err) {
      resolve(null);
    }
  });
}

async function saveToHistory(url: string, title: string) {
  chrome.storage.local.get(['analysisHistory'], (result) => {
    let history = (result.analysisHistory as any[]) || [];
    history = history.filter((h: any) => h.url !== url);
    history.unshift({ url, title, timestamp: Date.now() });
    history = history.slice(0, 5); // Keep last 5
    chrome.storage.local.set({ analysisHistory: history });
  });
}

async function handleContextAnalysis(context: { url: string, text: string }) {
  try {
    const profile: any = await getUserProfile();
    let profileContext = profile 
      ? `User Profile: ${profile.name}, CGPA: ${profile.cgpa}, Target Degree: ${profile.targetDegree}, Budget: ₹${profile.budgetLakhs}L, Countries: ${profile.targetCountry?.join(', ')}.`
      : `User Profile: Not logged in.`;

    const prompt = `
      You are Arjuna Sarathi AI, an advanced AI copilot for students.
      ${profileContext}
      
      The user is currently browsing this webpage:
      URL: ${context.url}
      Content snippet: ${context.text.substring(0, 3000)}
      
      CORE TASK:
      1. Identify exactly what this page is.
      2. Teach the user exactly how to navigate this page using explicit steps (Step 1:, Step 2:).
      3. If they are on a form, tell them exactly what to fill out using their profile as an example.
      4. Provide any useful direct links they might need.
      
      FORMATTING RULES (STRICT):
      - DO NOT use any Markdown formatting like **bold** or *italics*. Do not output any asterisks (*).
      - Do not output long theory or fluff. Keep it extremely concise.
      - Use "Step 1: ", "Step 2: " format for instructions.
    `;

    // @ts-ignore
    const completion = await groq.chat.completions.create({
      messages: [{ role: "user", content: prompt }],
      model: "llama-3.3-70b-versatile",
    });
    
    return { success: true, analysis: completion.choices[0]?.message?.content };
  } catch (error: any) {
    console.error('Groq Analysis Error:', error);
    return { success: false, error: error.message || 'Analysis failed' };
  }
}

async function handleChat(payload: { context: any, history: any[], newMessage: string }) {
  try {
    const profile: any = await getUserProfile();
    let profileContext = profile 
      ? `User Profile Context: ${profile.name}, CGPA: ${profile.cgpa || 'N/A'}, Target Degree: ${profile.targetDegree || 'N/A'}. Use this to give specific advice.`
      : ``;

    const systemPrompt = `
      You are Arjuna Sarathi AI, a brilliant education counselor and application assistant.
      ${profileContext}
      Current Webpage Context: ${payload.context.url}
      Page Content Snippet: ${payload.context.text.substring(0, 2000)}
      
      CORE INSTRUCTIONS:
      1. FORM FILLING: If the user is on a form, explicitly teach them exactly what to type in each field based on their profile. Give clear examples.
      2. NAVIGATION: Tell the user exactly which buttons to click or which options to select on the current page. Provide direct URLs to helpful pages.
      3. REQUIREMENTS & CHANCES: If asked about requirements, first ask the user for their exact marks (GRE/GMAT/IELTS/CGPA) if missing. 
      4. GRAPHICAL SUMMARIES: When predicting admission chances or showing last year's cutoffs, use simple ASCII text-based graphs. 
         Example format:
         Acceptance Chance: [########--] 80%
         Your Score vs Cutoff: [##########] (Cleared!)
         (Strictly use # for filled and - for empty. Do NOT use unicode blocks).
      
      FORMATTING RULES (STRICT):
      - DO NOT use any Markdown asterisks (* or **). They will not render correctly. Use plain text.
      - Do not give long theoretical explanations. Get straight to the point.
      - When giving instructions, use explicit steps like:
        Step 1: [Action]
        Step 2: [Action]
        Step 3: [Action]
    `;

    const messages = [
      { role: "system", content: systemPrompt },
      ...payload.history.map((m: any) => ({ role: m.role === 'ai' ? 'assistant' : 'user', content: m.content })),
      { role: "user", content: payload.newMessage }
    ];

    // @ts-ignore
    const completion = await groq.chat.completions.create({
      messages: messages as any,
      model: "llama-3.3-70b-versatile",
    });
    
    return { success: true, response: completion.choices[0]?.message?.content };
  } catch (error: any) {
    console.error('Groq Chat Error:', error);
    return { success: false, error: error.message || 'Chat failed' };
  }
}

chrome.runtime.onInstalled.addListener(() => {
  console.log("EduPilot AI installed successfully!");
});
