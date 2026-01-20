import { JobOffer, IndustrySector, Continent, DateRange } from '../types';
import { GoogleGenAI, Type } from "@google/genai";

// Safely access process.env.API_KEY
const apiKey = typeof process !== 'undefined' && process.env ? process.env.API_KEY : undefined;

let ai: GoogleGenAI | null = null;
if (apiKey) {
  try {
     ai = new GoogleGenAI({ apiKey });
  } catch(e) {
    console.warn("AI init failed in JobService, using mock data.");
  }
}

interface SearchParams {
  role?: string;
  sectors?: string[]; 
  continents?: string[];
  location?: string;
  dateRange?: DateRange;
}

// Fallback Mock Data for Offline or No API Key
const MOCK_STUDIOS = [
  'Skynet VFX', 'Tristram Games', 'Industrial Light & Magic', 'Weta FX', 
  'Framestore', 'MPC', 'Sony Pictures Imageworks', 'Epic Games', 
  'Unity Technologies', 'The Mill', 'DNEG', 'Riot Games', 'Blizzard', 'Naughty Dog'
];

const MOCK_ROLES = [
  'Senior Compositor', 'FX TD', 'Lead Animator', 'Pipeline TD', 
  'Unreal Engine Generalist', 'Creative Director', 'Motion Designer', 
  'Character Rigger', 'Environment Artist', 'VFX Supervisor', 'Lighting Artist'
];

const MOCK_LOCATIONS = [
  'London, UK', 'Vancouver, Canada', 'Los Angeles, USA', 'Montreal, Canada', 
  'Remote', 'Sydney, Australia', 'Paris, France', 'Singapore', 'Berlin, Germany', 'Tokyo, Japan'
];

const getDateRangeInDays = (range: DateRange): number => {
  switch (range) {
    case '24h': return 1;
    case '7d': return 7;
    case '15d': return 15;
    case '30d': return 30;
    case '2m': return 60;
    default: return 90;
  }
};

const getDateQueryString = (range: DateRange): string => {
  switch (range) {
    case '24h': return 'posted in the last 24 hours';
    case '7d': return 'posted in the last week';
    case '15d': return 'posted in the last 15 days';
    case '30d': return 'posted in the last month';
    case '2m': return 'posted in the last 2 months';
    default: return 'recently posted';
  }
};

const isValidJobUrl = (url?: string): boolean => {
  if (!url || url === '#' || !url.startsWith('http')) return false;
  try {
    const urlObj = new URL(url);
    const path = urlObj.pathname;
    if (path === '/' || path === '') return false;
    if (url.includes('linkedin.com')) return path.includes('/jobs/view') || path.includes('/jobs/search') || path.includes('/comm/jobs');
    if (url.includes('artstation.com')) return path.includes('/jobs/');
    if (url.includes('glassdoor.com')) return path.includes('/job-listing') || path.includes('/partner/jobListing.htm');
    return path.length > 3 || url.includes('?'); 
  } catch (e) {
    return false;
  }
};

const generateMockJobs = (count: number, params: SearchParams): JobOffer[] => {
  const jobs: JobOffer[] = [];
  const maxDays = getDateRangeInDays(params.dateRange || '30d');

  for (let i = 0; i < count; i++) {
    const company = MOCK_STUDIOS[Math.floor(Math.random() * MOCK_STUDIOS.length)];
    const role = params.role || MOCK_ROLES[Math.floor(Math.random() * MOCK_ROLES.length)];
    const location = params.location || MOCK_LOCATIONS[Math.floor(Math.random() * MOCK_LOCATIONS.length)];
    
    const sectorValues = Object.values(IndustrySector);
    let allowedSectors = sectorValues;
    if (params.sectors && params.sectors.length > 0) {
        allowedSectors = params.sectors.map(s => s as IndustrySector);
    }
    const sector = allowedSectors[Math.floor(Math.random() * allowedSectors.length)];

    let jobContinent = params.continents && params.continents.length > 0 
        ? params.continents[Math.floor(Math.random() * params.continents.length)]
        : undefined;

    const sources: any[] = ['LinkedIn', 'Glassdoor', 'ArtStation', 'Direct'];
    const source = sources[Math.floor(Math.random() * sources.length)];
    
    const msAgo = Math.floor(Math.random() * maxDays * 24 * 60 * 60 * 1000);
    
    let mockUrl = '#';
    if (source === 'LinkedIn') mockUrl = `https://www.linkedin.com/jobs/search?keywords=${role.replace(' ', '%20')}`;
    else if (source === 'ArtStation') mockUrl = `https://www.artstation.com/jobs`;
    else mockUrl = `https://www.google.com/search?q=${role.replace(' ', '+')}+jobs+at+${company.replace(' ', '+')}`;

    jobs.push({
      id: `mock-job-${Date.now()}-${i}`,
      title: role,
      company: company,
      location: location,
      continent: jobContinent, 
      sector: sector,
      type: Math.random() > 0.3 ? 'Full-time' : 'Contract',
      postedDate: new Date(Date.now() - msAgo).toISOString(),
      description: `(Offline Demo) We are looking for a talented ${role} to join our team at ${company}. Experience with Houdini, Nuke, or Maya required.`,
      url: mockUrl,
      source: source
    });
  }
  return jobs.sort((a, b) => new Date(b.postedDate).getTime() - new Date(a.postedDate).getTime());
};

export const fetchJobs = async (params: SearchParams): Promise<JobOffer[]> => {
  // If we have AI, we try to use it
  if (ai) {
    try {
      const timeString = getDateQueryString(params.dateRange || 'any');
      const sectorStr = (params.sectors && params.sectors.length > 0) ? `Focus on these specific sectors: ${params.sectors.join(', ')}.` : `Focus on sector: "Any Creative Tech".`;
      const continentStr = (params.continents && params.continents.length > 0) ? `Prioritize these regions/continents: ${params.continents.join(', ')}.` : `Location context: "${params.location || 'Global'}".`;

      const prompt = `
        Find 8 REAL job openings for "${params.role || 'VFX, Animation, or Game Development'}" roles.
        ${sectorStr} ${continentStr}
        Strictly ${timeString}. Return a list of jobs with direct links.
      `;

      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: prompt,
        config: {
          tools: [{ googleSearch: {} }],
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                title: { type: Type.STRING },
                company: { type: Type.STRING },
                location: { type: Type.STRING },
                url: { type: Type.STRING },
                source: { type: Type.STRING },
                description: { type: Type.STRING },
                postedDate: { type: Type.STRING }
              },
              required: ["title", "company", "url"]
            }
          }
        }
      });

      if (response.text) {
        const data = JSON.parse(response.text);
        const validItems = data.filter((item: any) => isValidJobUrl(item.url));
        return validItems.map((item: any, index: number) => ({
          id: `ai-job-${Date.now()}-${index}`,
          title: item.title,
          company: item.company,
          location: item.location || params.location || 'Unknown',
          sector: (params.sectors && params.sectors.length === 1) ? params.sectors[0] as IndustrySector : IndustrySector.OTHER, 
          type: 'Full-time',
          postedDate: new Date().toISOString(),
          description: item.description || `Found via Google Search on ${item.source}`,
          url: item.url,
          source: item.source || 'Web Search'
        }));
      }

    } catch (error) {
      // Fall through to mock
      console.log("Using mock jobs due to AI error or lack of connection");
    }
  }

  // Fallback / Offline Mode
  await new Promise(resolve => setTimeout(resolve, 600)); // Simulate search feeling
  return generateMockJobs(15, params);
};