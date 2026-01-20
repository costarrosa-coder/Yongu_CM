export enum ClientStatus {
  OLD = 'Old',
  NEW = 'New',
  CONTACTED = 'Contacted',
  NEGOTIATING = 'Negotiating',
  ACTIVE = 'Active',
  COMPLETED = 'Completed',
  ARCHIVED = 'Archived',
}

export enum IndustrySector {
  VFX_FILM = 'VFX (Film)',
  VFX_COMMERCIAL = 'VFX (Commercial)',
  ANIMATION = 'Animation',
  GAMES_REALTIME = 'Games/Realtime',
  AI_GEN = 'Generative AI',
  MOGRAPH = 'Motion Graphics',
  OTHER = 'Other',
}

export enum Continent {
  NORTH_AMERICA = 'North America',
  SOUTH_AMERICA = 'South America',
  EUROPE = 'Europe',
  ASIA = 'Asia',
  AFRICA = 'Africa',
  OCEANIA = 'Oceania',
  ANTARCTICA = 'Antarctica'
}

export interface UserProfile {
  name: string;
  industry: string; // e.g. "VFX", "Real Estate", "Software"
}

export interface ContactLog {
  id: string;
  date: string; // ISO Date
  type: 'Email' | 'Call' | 'Meeting' | 'Social';
  notes: string;
}

export interface Client {
  id: string;
  name: string;
  company: string;
  role: string;
  email: string;
  phone?: string;
  sector: IndustrySector;
  status: ClientStatus;
  statusUpdatedAt?: string; // ISO Date of last status change
  
  // Geographic Data
  location?: string;
  continent: Continent;
  lat?: number;
  lng?: number;

  website?: string;
  lastContactDate?: string;
  nextFollowUpDate?: string;
  rate?: string; // e.g., Day rate or Project budget
  notes: string;
  tags: string[]; // e.g., "Houdini", "Compositing", "Pipeline"
  logs: ContactLog[];
}

export interface JobOffer {
  id: string;
  title: string;
  company: string;
  location: string;
  continent?: string;
  sector: IndustrySector;
  type: 'Full-time' | 'Contract' | 'Remote';
  postedDate: string;
  description: string;
  salaryRange?: string;
  url: string;
  source?: 'LinkedIn' | 'Glassdoor' | 'ArtStation' | 'Direct' | 'Other';
}

export type DateRange = '24h' | '7d' | '15d' | '30d' | '2m' | 'any';

export type ViewState = 'DASHBOARD' | 'CLIENTS' | 'KANBAN' | 'MAP' | 'JOBS';
export type Language = 'en' | 'es';