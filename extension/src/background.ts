import Groq from "groq-sdk";
import { createClient } from "@supabase/supabase-js";

const GROQ_API_KEY = import.meta.env.VITE_GROQ_API_KEY;
const SUPABASE_URL = "https://ecbqhlfguzkwffqbtbqz.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVjYnFobGZndXprd2ZmcWJ0YnF6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk5NjI1NDcsImV4cCI6MjA5NTUzODU0N30.aUWH4zHGvLl2ylUORZ3bMz7w0PPBUBrRCeRyfXSv22s";

// @ts-ignore
const groq = new Groq({ apiKey: GROQ_API_KEY, dangerouslyAllowBrowser: true });
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: { persistSession: false },
});

// ---------- helpers ----------

const INTERNAL_PREFIXES = [
  "chrome://",
  "chrome-extension://",
  "edge://",
  "about:",
  "file://",
  "https://chromewebstore.google.com",
];

function isInternalUrl(url: string | undefined) {
  if (!url) return true;
  return INTERNAL_PREFIXES.some((p) => url.startsWith(p));
}

async function ensureContentScript(tabId: number) {
  // The content script's file path is fingerprinted by the bundler at build
  // time (e.g. assets/content.tsx-loader-XXXX.js). Reading it from the
  // runtime manifest avoids hard-coding a stale string here.
  const manifest = chrome.runtime.getManifest() as any;
  const files: string[] = [];
  for (const cs of manifest.content_scripts || []) {
    if (Array.isArray(cs.js)) files.push(...cs.js);
  }
  if (!files.length) return;

  try {
    await chrome.scripting.executeScript({ target: { tabId }, files });
    // Give the IIFE a tick to register its message listener before we ping it.
    await new Promise((r) => setTimeout(r, 200));
  } catch (e: any) {
    // Most common reason this throws is "Cannot access contents of url" when
    // the page is a Chrome internal page or the user navigated away. We
    // surface the message so the popup can show it.
    throw new Error(e?.message || "Could not inject content script");
  }
}

async function getUserProfile() {
  //   1. profile we previously picked (chrome.storage local "pickedProfileId")
  //   2. profile of the user whose auth was synced from the dashboard
  //   3. null  (caller is expected to ask the user to pick one)
  return new Promise<any>((resolve) => {
    try {
      chrome.storage.local.get(
        ["authData", "pickedProfileId", "pickedProfileSnapshot"],
        async (result) => {
          try {
            const pickedId = result.pickedProfileId as string | undefined;
            if (pickedId) {
              // Try a fresh read first…
              try {
                const { data } = await supabase
                  .from("profiles")
                  .select("*")
                  .eq("id", pickedId)
                  .single();
                if (data) {
                  resolve(data);
                  return;
                }
              } catch {
                /* fall through to snapshot */
              }
              // …RLS may block anonymous SELECT of a single row, so fall
              // back to the snapshot we saved when the user clicked Pick.
              if (result.pickedProfileSnapshot) {
                resolve(result.pickedProfileSnapshot);
                return;
              }
            }

            const authData = result.authData as any;
            if (authData?.user) {
              const { data } = await supabase
                .from("profiles")
                .select("*")
                .eq("id", authData.user.id)
                .single();
              resolve(data || null);
              return;
            }
            resolve(null);
          } catch (e) {
            console.error("[EduPilot] getUserProfile error:", e);
            resolve(null);
          }
        },
      );
    } catch {
      resolve(null);
    }
  });
}

async function listRecentProfiles(): Promise<any[]> {
  // Pull every profile the anon key is allowed to see so the user can pick
  // any student. We try the freshest signal we have (last_seen, then
  // updated_at, then created_at) and fall back gracefully.
  const candidates = ["last_seen", "updated_at", "created_at"];
  for (const col of candidates) {
    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .order(col, { ascending: false, nullsFirst: false } as any);
    if (!error && data) return data;
  }
  const { data } = await supabase.from("profiles").select("*");
  return data || [];
}

// ---------- message router ----------

chrome.runtime.onMessage.addListener((request, _sender, sendResponse) => {
  if (request.type === "TOGGLE_ON_ACTIVE_TAB") {
    chrome.tabs.query({ active: true, currentWindow: true }, async (tabs) => {
      const tab = tabs[0];
      if (!tab?.id) {
        sendResponse({ success: false, error: "No active tab found" });
        return;
      }
      if (isInternalUrl(tab.url)) {
        sendResponse({
          success: false,
          error:
            "EduPilot can't run on this Chrome internal page. Open a normal website and try again.",
        });
        return;
      }
      // Try to talk to an already-injected content script first; on fresh
      // tabs we have to inject it on demand using the fingerprinted asset
      // path from the manifest (see ensureContentScript).
      try {
        await chrome.tabs.sendMessage(tab.id, { type: "TOGGLE_CHAT" });
        sendResponse({ success: true });
        return;
      } catch {
        /* fall through to inject + retry */
      }

      try {
        await ensureContentScript(tab.id);
        // Brief retry — sometimes the freshly injected script is still
        // registering its listeners when our first message lands.
        let lastErr: any = null;
        for (let i = 0; i < 5; i++) {
          try {
            await chrome.tabs.sendMessage(tab.id, { type: "TOGGLE_CHAT" });
            sendResponse({ success: true });
            return;
          } catch (e) {
            lastErr = e;
            await new Promise((r) => setTimeout(r, 120));
          }
        }
        throw lastErr || new Error("Could not reach the page.");
      } catch (e: any) {
        sendResponse({
          success: false,
          error: e?.message || "Could not reach the page.",
        });
      }
    });
    return true;
  }

  if (request.type === "SYNC_AUTH") {
    chrome.storage.local.set({ authData: request.payload }, () => {
      sendResponse({ success: true });
    });
    return true;
  }

  if (request.type === "GET_PROFILE") {
    getUserProfile().then((profile) => sendResponse({ success: true, profile }));
    return true;
  }

  if (request.type === "LIST_PROFILES") {
    listRecentProfiles()
      .then((profiles) => sendResponse({ success: true, profiles }))
      .catch((e) =>
        sendResponse({ success: false, error: e?.message || "Could not list profiles" }),
      );
    return true;
  }

  if (request.type === "PICK_PROFILE") {
    const id = request.payload?.id;
    const preview = request.payload?.preview; // full row from LIST_PROFILES
    if (!id) {
      sendResponse({ success: false, error: "id required" });
      return true;
    }
    chrome.storage.local.set(
      { pickedProfileId: id, pickedProfileSnapshot: preview || null },
      async () => {
        // Try a fresh read; fall back to the snapshot if RLS blocks us.
        let data: any = null;
        try {
          const res = await supabase.from("profiles").select("*").eq("id", id).single();
          if (res.data) data = res.data;
        } catch {
          /* ignored */
        }
        if (!data && preview) data = preview;
        sendResponse({ success: true, profile: data });
      },
    );
    return true;
  }

  if (request.type === "PLAN_AUTOFILL") {
    handlePlanAutofill(request.payload).then(sendResponse);
    return true;
  }

  if (request.type === "ANALYZE_CONTEXT") {
    handleContextAnalysis(request.payload).then(sendResponse);
    return true;
  }

  if (request.type === "CHAT") {
    handleChat(request.payload).then(sendResponse);
    return true;
  }
});

// ---------- AI: page analysis ----------

async function handleContextAnalysis(context: { url: string; text: string }) {
  try {
    const profile: any = await getUserProfile();
    let profileContext: string;
    if (profile) {
      const summary = {
        name: profile.name,
        email: profile.email,
        city: profile.city,
        state: profile.state,
        undergrad_college: profile.undergrad_college,
        undergrad_degree: profile.undergrad_degree,
        undergrad_specialization: profile.undergrad_specialization,
        undergrad_cgpa: profile.undergrad_cgpa,
        target_degree: profile.target_degree,
        target_field: profile.target_field,
        target_countries: profile.target_countries,
        gre_score: profile.gre_score,
        gmat_score: profile.gmat_score,
        ielts_score: profile.ielts_score,
        toefl_score: profile.toefl_score,
        family_income: profile.family_income,
        expected_budget: profile.expected_budget,
      };
      profileContext = `STUDENT PROFILE (use this for personalised guidance):\n${JSON.stringify(summary, null, 2)}`;
    } else {
      profileContext = "No student profile selected yet.";
    }

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
    console.error("Groq Analysis Error:", error);
    return { success: false, error: error.message || "Analysis failed" };
  }
}

async function handleChat(payload: { context: any; history: any[]; newMessage: string }) {
  try {
    const profile: any = await getUserProfile();
    let profileContext = "";
    if (profile) {
      // Hand the AI everything that helps it answer questions like
      // "what are my chances of getting in" or "is my CGPA enough".
      const summary = {
        name: profile.name,
        email: profile.email,
        mobile: profile.mobile,
        city: profile.city,
        state: profile.state,
        education_level: profile.education_level,
        tenth_marks: profile.tenth_marks,
        twelfth_marks: profile.twelfth_marks,
        twelfth_stream: profile.twelfth_stream,
        undergrad_college: profile.undergrad_college,
        undergrad_degree: profile.undergrad_degree,
        undergrad_specialization: profile.undergrad_specialization,
        undergrad_cgpa: profile.undergrad_cgpa,
        undergrad_grad_year: profile.undergrad_grad_year,
        backlogs: profile.backlogs,
        research_papers: profile.research_papers,
        internships: profile.internships,
        is_working_professional: profile.is_working_professional,
        company_name: profile.company_name,
        years_experience: profile.years_experience,
        target_degree: profile.target_degree,
        target_field: profile.target_field,
        target_countries: profile.target_countries,
        intake_target: profile.intake_target,
        application_stage: profile.application_stage,
        gre_score: profile.gre_score,
        gmat_score: profile.gmat_score,
        ielts_score: profile.ielts_score,
        toefl_score: profile.toefl_score,
        family_income: profile.family_income,
        expected_budget: profile.expected_budget,
        loan_estimate: profile.loan_estimate,
      };
      profileContext = `STUDENT PROFILE (use this to give specific, personal advice):\n${JSON.stringify(summary, null, 2)}`;
    } else {
      profileContext = "No student profile selected yet.";
    }

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
      ...payload.history.map((m: any) => ({
        role: m.role === "ai" ? "assistant" : "user",
        content: m.content,
      })),
      { role: "user", content: payload.newMessage },
    ];

    // @ts-ignore
    const completion = await groq.chat.completions.create({
      messages: messages as any,
      model: "llama-3.3-70b-versatile",
    });

    return { success: true, response: completion.choices[0]?.message?.content };
  } catch (error: any) {
    console.error("Groq Chat Error:", error);
    return { success: false, error: error.message || "Chat failed" };
  }
}

chrome.runtime.onInstalled.addListener(() => {
  console.log("EduPilot AI installed successfully!");
});

// ---------- AI: autofill planner ----------
//
// Given a structured field list (label/type/options) and the user's profile,
// returns:
//   { fillMap: { fieldKey: value }, missing: [{ key, label, hint }] }
//
// `fillMap` only contains values the AI is confident about.
// `missing` lists fields the AI couldn't fill so the bubble can ask the
// user about them one by one.

async function handlePlanAutofill(payload: {
  fields: any[];
  url: string;
  title: string;
}) {
  try {
    const profile: any = (await getUserProfile()) || {};

    const profileSummary = JSON.stringify(
      {
        name: profile.name,
        email: profile.email,
        mobile: profile.mobile,
        dob: profile.dob,
        gender: profile.gender,
        city: profile.city,
        state: profile.state,
        tenth_marks: profile.tenth_marks,
        twelfth_marks: profile.twelfth_marks,
        twelfth_stream: profile.twelfth_stream,
        undergrad_college: profile.undergrad_college,
        undergrad_degree: profile.undergrad_degree,
        undergrad_specialization: profile.undergrad_specialization,
        undergrad_cgpa: profile.undergrad_cgpa,
        undergrad_grad_year: profile.undergrad_grad_year,
        target_degree: profile.target_degree,
        target_field: profile.target_field,
        target_countries: profile.target_countries,
        gre_score: profile.gre_score,
        gmat_score: profile.gmat_score,
        ielts_score: profile.ielts_score,
        toefl_score: profile.toefl_score,
        family_income: profile.family_income,
        expected_budget: profile.expected_budget,
      },
      null,
      2,
    );

    const prompt = `
You are a form-filling assistant. Map a student's profile onto a webpage's
form fields.

Output ONLY a single JSON object with two keys, no Markdown fences, no prose:
  {
    "fill":   { "fieldKey": "value", ... },
    "missing": [ { "key": "fieldKey", "label": "Human readable", "hint": "What to ask the user" } ]
  }

Rules:
- Only put a key into "fill" if the value is clearly present in the profile.
- For radio/select fields, the value MUST be one of the listed options exactly.
- Do NOT invent data. If unsure, put the key in "missing" instead.
- Skip fields that obviously don't need filling (e.g. CAPTCHAs, file uploads).
- The "hint" should be a short, friendly question we can show the user
  (e.g. "What's your passport number?", "Which intake are you applying for?").

Page: ${payload.title} (${payload.url})

Student profile (use only what's relevant):
${profileSummary}

Form fields (JSON array):
${JSON.stringify(payload.fields).slice(0, 6000)}
`.trim();

    // @ts-ignore
    const completion = await groq.chat.completions.create({
      messages: [{ role: "user", content: prompt }],
      model: "llama-3.3-70b-versatile",
      temperature: 0.1,
      response_format: { type: "json_object" } as any,
    });

    const raw = completion.choices[0]?.message?.content || "{}";
    let parsed: any = {};
    try {
      parsed = JSON.parse(raw);
    } catch {
      const match = raw.match(/\{[\s\S]*\}/);
      if (match) {
        try {
          parsed = JSON.parse(match[0]);
        } catch {
          /* ignore */
        }
      }
    }

    return {
      success: true,
      fill: parsed.fill && typeof parsed.fill === "object" ? parsed.fill : {},
      missing: Array.isArray(parsed.missing) ? parsed.missing : [],
      profile,
    };
  } catch (error: any) {
    console.error("[EduPilot] PLAN_AUTOFILL error:", error);
    return { success: false, error: error?.message || "Autofill plan failed" };
  }
}
