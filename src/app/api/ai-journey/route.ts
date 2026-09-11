import { NextResponse } from 'next/server';
import { GoogleGenAI, Type } from '@google/genai';

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || 'mock' });

export async function POST(request: Request) {
  try {
    const { phase, profileData, decisionState } = await request.json();

    let prompt = '';
    let responseSchema: any = null;

    switch (phase) {
      case 'PHASE_1_PROFILE':
        prompt = `You are an expert AI Study Abroad Consultant. Analyze this profile and calculate an Academic Score (0-100), Financial Score (0-100), and Admission Readiness Score (0-100). Provide detailed reasoning explicitly addressing their CGPA, test scores, and budget. Profile: ${JSON.stringify(profileData)}`;
        responseSchema = {
          type: Type.OBJECT,
          properties: {
            academicScore: { type: Type.NUMBER },
            financialScore: { type: Type.NUMBER },
            admissionReadinessScore: { type: Type.NUMBER },
            reasoning: { type: Type.STRING }
          }
        };
        break;

      case 'PHASE_2_COUNTRY':
        prompt = `Recommend 3 countries based on this profile. Detail the match score, why recommended, why not recommended, expected cost, post study work, job market (0-100), and visa difficulty. Explicitly use CGPA and GRE/IELTS in the reasoning. Profile: ${JSON.stringify(profileData)}`;
        responseSchema = {
          type: Type.OBJECT,
          properties: {
            recommendedCountries: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  countryName: { type: Type.STRING },
                  matchScore: { type: Type.NUMBER },
                  whyRecommended: { type: Type.STRING },
                  whyNotRecommended: { type: Type.STRING },
                  expectedCost: { type: Type.STRING },
                  postStudyWork: { type: Type.STRING },
                  jobMarket: { type: Type.NUMBER },
                  visaDifficulty: { type: Type.STRING }
                }
              }
            }
          }
        };
        break;

      case 'PHASE_3_UNIVERSITY':
        prompt = `Recommend 3 best match universities in ${decisionState?.selectedCountry || 'any country'} for this profile. Provide admission chance (0-100), ranking, tuition, living cost, ROI, scholarship availability, and detailed reasoning based on their scores. Profile: ${JSON.stringify(profileData)}`;
        responseSchema = {
          type: Type.OBJECT,
          properties: {
            bestMatchUniversities: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  id: { type: Type.STRING },
                  name: { type: Type.STRING },
                  country: { type: Type.STRING },
                  admissionChance: { type: Type.NUMBER },
                  ranking: { type: Type.NUMBER },
                  tuition: { type: Type.NUMBER },
                  livingCost: { type: Type.NUMBER },
                  roi: { type: Type.NUMBER },
                  scholarshipAvailability: { type: Type.STRING },
                  whyRecommended: { type: Type.STRING }
                }
              }
            }
          }
        };
        break;

      case 'PHASE_4_ADMISSION':
        prompt = `Analyze admission chances for ${decisionState?.selectedUniversity || 'the university'} based on profile. Breakdown positive/negative factors, missing requirements, and improved chance. Profile: ${JSON.stringify(profileData)}`;
        responseSchema = {
          type: Type.OBJECT,
          properties: {
            currentChance: { type: Type.NUMBER },
            chanceBreakdown: { type: Type.STRING },
            positiveFactors: { type: Type.ARRAY, items: { type: Type.STRING } },
            negativeFactors: { type: Type.ARRAY, items: { type: Type.STRING } },
            missingRequirements: { type: Type.ARRAY, items: { type: Type.STRING } },
            improvedChanceAfterRecs: { type: Type.NUMBER }
          }
        };
        break;

      case 'PHASE_5_COST':
        prompt = `Calculate estimated costs for studying at ${decisionState?.selectedUniversity || 'the university'} in ${decisionState?.selectedCountry || 'the country'}. Break down tuition, living, insurance, visa, travel, misc. Return total, yearly, monthly costs. Profile: ${JSON.stringify(profileData)}`;
        responseSchema = {
          type: Type.OBJECT,
          properties: {
            tuition: { type: Type.NUMBER },
            living: { type: Type.NUMBER },
            insurance: { type: Type.NUMBER },
            visa: { type: Type.NUMBER },
            travel: { type: Type.NUMBER },
            miscellaneous: { type: Type.NUMBER },
            totalCost: { type: Type.NUMBER },
            yearlyCost: { type: Type.NUMBER },
            monthlyCost: { type: Type.NUMBER }
          }
        };
        break;

      case 'PHASE_6_AFFORDABILITY':
        prompt = `Analyze affordability. Budget: ${profileData?.budgetLakhs || 0} Lakhs. Total Cost: $${decisionState?.totalCost?.totalCost || 50000}. Return whether they can afford it (canAfford boolean), funding gap, self funding capacity, etc.`;
        responseSchema = {
          type: Type.OBJECT,
          properties: {
            canAfford: { type: Type.BOOLEAN },
            fundingGap: { type: Type.NUMBER },
            selfFundingCapacity: { type: Type.NUMBER },
            savingsContribution: { type: Type.NUMBER },
            familyContribution: { type: Type.NUMBER },
            reasoning: { type: Type.STRING }
          }
        };
        break;

      case 'PHASE_7_LOAN':
        prompt = `Generate a loan plan for a funding gap of $${decisionState?.affordability?.fundingGap || 20000}. Provide required loan amount, estimated EMI, interest, and recommended lenders.`;
        responseSchema = {
          type: Type.OBJECT,
          properties: {
            loanAmountRequired: { type: Type.NUMBER },
            emi: { type: Type.NUMBER },
            interest: { type: Type.NUMBER },
            recommendedLenders: { type: Type.ARRAY, items: { type: Type.STRING } }
          }
        };
        break;

      case 'PHASE_8_DOCUMENTS':
        prompt = `Determine required documents for applying to ${decisionState?.selectedUniversity || 'a top university'}. Which are available, missing, and pending based on profile: ${JSON.stringify(profileData)}`;
        responseSchema = {
          type: Type.OBJECT,
          properties: {
            requiredDocuments: { type: Type.ARRAY, items: { type: Type.STRING } },
            available: { type: Type.ARRAY, items: { type: Type.STRING } },
            missing: { type: Type.ARRAY, items: { type: Type.STRING } },
            pending: { type: Type.ARRAY, items: { type: Type.STRING } }
          }
        };
        break;

      case 'PHASE_9_DOC_ACQUISITION':
        prompt = `Provide a step-by-step acquisition guide for these missing documents: ${decisionState?.documentReadiness?.missing?.join(', ') || 'Passport, Transcripts'}.`;
        responseSchema = {
          type: Type.OBJECT,
          properties: {
            guides: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  documentName: { type: Type.STRING },
                  steps: { type: Type.ARRAY, items: { type: Type.STRING } }
                }
              }
            }
          }
        };
        break;

      case 'PHASE_10_REVIEWS':
        let reviewContext = "No live reviews found.";
        const universityName = decisionState?.selectedUniversity || "the university";
        
        // Use Serper API
        try {
          if (process.env.SERPER_API_KEY) {
            const queries = [`${universityName} student reviews reddit`, `${universityName} international students placements`];
            const serperResponses = await Promise.all(queries.map(q => 
              fetch('https://google.serper.dev/search', {
                method: 'POST',
                headers: { 'X-API-KEY': process.env.SERPER_API_KEY || '', 'Content-Type': 'application/json' },
                body: JSON.stringify({ q })
              }).then(res => res.json())
            ));
            
            reviewContext = serperResponses.map(res => 
              (res.organic || []).slice(0, 3).map((r: any) => r.snippet).join('\n')
            ).join('\n\n');
          }
        } catch (e) {
          console.error("Serper API error", e);
        }

        prompt = `Summarize these live reviews and placement data for ${universityName}. Live Data: ${reviewContext}\n\nGenerate pros, cons, placement insights, housing insights, student satisfaction, and a sentiment score (0-100).`;
        responseSchema = {
          type: Type.OBJECT,
          properties: {
            pros: { type: Type.ARRAY, items: { type: Type.STRING } },
            cons: { type: Type.ARRAY, items: { type: Type.STRING } },
            placementInsights: { type: Type.STRING },
            housingInsights: { type: Type.STRING },
            studentSatisfaction: { type: Type.STRING },
            sentimentScore: { type: Type.NUMBER }
          }
        };
        break;

      case 'PHASE_11_ROADMAP':
        prompt = `Generate a 90-day action roadmap for applying to ${decisionState?.selectedUniversity || 'the university'} in ${decisionState?.selectedCountry}. Missing docs: ${decisionState?.documentReadiness?.missing?.join(',')}. Funding Gap: ${decisionState?.affordability?.fundingGap}. Prioritize admission risk.`;
        responseSchema = {
          type: Type.OBJECT,
          properties: {
            immediateActions: { type: Type.ARRAY, items: { type: Type.STRING } },
            day7Plan: { type: Type.ARRAY, items: { type: Type.STRING } },
            day30Plan: { type: Type.ARRAY, items: { type: Type.STRING } },
            day60Plan: { type: Type.ARRAY, items: { type: Type.STRING } },
            day90Plan: { type: Type.ARRAY, items: { type: Type.STRING } }
          }
        };
        break;

      default:
        return NextResponse.json({ error: 'Invalid phase' }, { status: 400 });
    }

    try {
      if (process.env.GEMINI_API_KEY === 'mock' || !process.env.GEMINI_API_KEY) {
        throw new Error('No API key');
      }
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
        config: {
          responseMimeType: 'application/json',
          responseSchema: responseSchema,
          temperature: 0.2,
        }
      });
      const text = response.text;
      if (!text) throw new Error('Empty response from AI');
      return NextResponse.json({ data: JSON.parse(text) });
    } catch (apiError) {
      console.warn('Falling back to mock data due to AI error:', apiError);
      return NextResponse.json({ data: generateMockData(phase) });
    }
  } catch (error: any) {
    console.error('AI Journey Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

function generateMockData(phase: string) {
  switch(phase) {
    case 'PHASE_1_PROFILE':
      return {
        academicScore: 85, financialScore: 70, admissionReadinessScore: 75,
        reasoning: "Your CGPA is solid, but your financial readiness needs some work. With a clear target, you are well on your way."
      };
    case 'PHASE_2_COUNTRY':
      return {
        recommendedCountries: [
          { countryName: 'United States', matchScore: 95, whyRecommended: 'Great tech hub', whyNotRecommended: 'High cost', expectedCost: '$50,000', postStudyWork: '3 years OPT', jobMarket: 90, visaDifficulty: 'Moderate' },
          { countryName: 'United Kingdom', matchScore: 85, whyRecommended: '1 year masters', whyNotRecommended: 'Fewer tech jobs', expectedCost: '£30,000', postStudyWork: '2 years PSW', jobMarket: 80, visaDifficulty: 'Easy' }
        ]
      };
    case 'PHASE_3_UNIVERSITY':
      return {
        bestMatchUniversities: [
          { id: '1', name: 'Mock Dream University', country: 'US', admissionChance: 30, ranking: 15, tuition: 55000, livingCost: 20000, roi: 90, scholarshipAvailability: 'Low', whyRecommended: 'A reach but excellent ROI.' },
          { id: '2', name: 'Mock Target University', country: 'US', admissionChance: 65, ranking: 50, tuition: 40000, livingCost: 15000, roi: 85, scholarshipAvailability: 'Medium', whyRecommended: 'A perfect match for your CGPA.' },
          { id: '3', name: 'Mock Safe University', country: 'US', admissionChance: 95, ranking: 120, tuition: 30000, livingCost: 10000, roi: 75, scholarshipAvailability: 'High', whyRecommended: 'You are highly likely to get in.' }
        ]
      };
    case 'PHASE_4_ADMISSION':
      return {
        currentChance: 65, chanceBreakdown: "Academics strong, missing some docs.", positiveFactors: ["Good CGPA", "Strong GRE"], negativeFactors: ["No work exp"], missingRequirements: ["SOP", "LOR"], improvedChanceAfterRecs: 85
      };
    case 'PHASE_5_COST':
      return { tuition: 40000, living: 15000, insurance: 1000, visa: 500, travel: 1000, miscellaneous: 2000, totalCost: 59500, yearlyCost: 29750, monthlyCost: 2479 };
    case 'PHASE_6_AFFORDABILITY':
      return { canAfford: false, fundingGap: 20000, selfFundingCapacity: 10000, savingsContribution: 5000, familyContribution: 5000, reasoning: "You fall short by $20k, you will need an education loan." };
    case 'PHASE_7_LOAN':
      return { loanAmountRequired: 20000, emi: 400, interest: 10, recommendedLenders: ["HDFC Credila", "Prodigy Finance"] };
    case 'PHASE_8_DOCUMENTS':
      return { requiredDocuments: ["Passport", "Transcripts", "SOP", "LOR", "Resume"], available: ["Passport"], missing: ["SOP", "LOR"], pending: ["Transcripts"] };
    case 'PHASE_9_DOC_ACQUISITION':
      return { guides: [{ documentName: "SOP", steps: ["Draft your career goals", "Review with mentor", "Finalize"] }, { documentName: "LOR", steps: ["Identify recommenders", "Send request email", "Follow up"] }] };
    case 'PHASE_10_REVIEWS':
      return { pros: ["Great campus", "Excellent professors"], cons: ["Expensive", "Cold weather"], placementInsights: "Strong tech placements, average starting salary $100k.", housingInsights: "Costly housing, apply early.", studentSatisfaction: "Very High", sentimentScore: 85 };
    case 'PHASE_11_ROADMAP':
      return { immediateActions: ["Start SOP draft", "Contact recommenders"], day7Plan: ["Finalize SOP"], day30Plan: ["Take GRE"], day60Plan: ["Submit applications"], day90Plan: ["Prepare for visa"] };
    default:
      return {};
  }
}
