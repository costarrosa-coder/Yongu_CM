import { Client, UserProfile, ClientStatus, IndustrySector, Continent } from '../types';
import { INITIAL_CLIENTS } from '../constants';

// --- Types for File System Access API ---
interface FileSystemHandle {
  kind: 'file' | 'directory';
  name: string;
}

interface FileSystemFileHandle extends FileSystemHandle {
  getFile: () => Promise<File>;
  createWritable: () => Promise<FileSystemWritableFileStream>;
}

interface FileSystemWritableFileStream extends WritableStream {
  write: (data: any) => Promise<void>;
  close: () => Promise<void>;
}

declare global {
  interface Window {
    showOpenFilePicker: (options?: any) => Promise<FileSystemFileHandle[]>;
    showSaveFilePicker: (options?: any) => Promise<FileSystemFileHandle>;
  }
}

export interface AppData {
  clients: Client[];
  profile: UserProfile | null;
  lastUpdated: string;
}

// Helper to validate data structure
const validateData = (data: any): AppData => {
  if (!data || !Array.isArray(data.clients)) {
    // Attempt to recover if structure is slightly off, or throw
    console.warn("Invalid data format detected, resetting to empty list if needed");
    return {
      clients: [],
      profile: null,
      lastUpdated: new Date().toISOString()
    };
  }
  return {
    clients: data.clients,
    profile: data.profile || null,
    lastUpdated: data.lastUpdated || new Date().toISOString()
  };
};

export const createNewDatabase = (): AppData => {
  return {
    clients: INITIAL_CLIENTS as Client[],
    profile: null,
    lastUpdated: new Date().toISOString()
  };
};

// --- Local Storage Operations (Mobile/Tablet Support) ---

const LOCAL_STORAGE_KEY = 'yongu_db_v1';

export const loadFromLocalStorage = (): AppData | null => {
  try {
    const stored = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (!stored) return null;
    return validateData(JSON.parse(stored));
  } catch (e) {
    console.error("Failed to load from local storage", e);
    return null;
  }
};

export const saveToLocalStorage = (data: AppData) => {
  try {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(data));
  } catch (e) {
    console.error("Failed to save to local storage (quota exceeded?)", e);
    alert("Warning: Local storage full. Some data may not be saved.");
  }
};

// --- File System Operations (Desktop Chrome/Edge) ---

export const openDatabaseFile = async (): Promise<{ data: AppData, handle: FileSystemFileHandle }> => {
  if (!window.showOpenFilePicker) {
    throw new Error("NOT_SUPPORTED");
  }

  const [handle] = await window.showOpenFilePicker({
    types: [{
      description: 'Yongu Data File',
      accept: { 'application/json': ['.json', '.yongu'] }
    }],
    multiple: false
  });

  const file = await handle.getFile();
  const text = await file.text();
  const json = JSON.parse(text);
  const data = validateData(json);

  return { data, handle };
};

export const createDatabaseFile = async (): Promise<{ data: AppData, handle: FileSystemFileHandle }> => {
  if (!window.showSaveFilePicker) {
    throw new Error("NOT_SUPPORTED");
  }

  const handle = await window.showSaveFilePicker({
    suggestedName: 'yongu_clients.json',
    types: [{
      description: 'Yongu Data File',
      accept: { 'application/json': ['.json', '.yongu'] }
    }]
  });

  const data = createNewDatabase();
  
  // Write initial data
  const writable = await handle.createWritable();
  await writable.write(JSON.stringify(data, null, 2));
  await writable.close();

  return { data, handle };
};

export const saveDatabaseFile = async (handle: FileSystemFileHandle, data: AppData): Promise<void> => {
  const writable = await handle.createWritable();
  await writable.write(JSON.stringify(data, null, 2));
  await writable.close();
};

// --- CSV Export/Import for Excel ---

export const exportToCSV = (clients: Client[]) => {
  // Define CSV headers
  const headers = [
    "Name", "Company", "Role", "Status", "Sector", 
    "Email", "Phone", "Location", "Last Contact", 
    "Next Follow Up", "Rate", "Notes", "Tags"
  ];

  // Helper to escape CSV fields
  const esc = (text: string | undefined) => {
    if (!text) return '""';
    return `"${text.replace(/"/g, '""')}"`; // Escape double quotes
  };

  const rows = clients.map(c => [
    esc(c.name),
    esc(c.company),
    esc(c.role),
    esc(c.status),
    esc(c.sector),
    esc(c.email),
    esc(c.phone),
    esc(c.location),
    esc(c.lastContactDate ? new Date(c.lastContactDate).toLocaleDateString() : ''),
    esc(c.nextFollowUpDate ? new Date(c.nextFollowUpDate).toLocaleDateString() : ''),
    esc(c.rate),
    esc(c.notes),
    esc(c.tags.join(', '))
  ]);

  const csvContent = [
    headers.join(','), 
    ...rows.map(row => row.join(','))
  ].join('\n');

  // Download
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.setAttribute("href", url);
  link.setAttribute("download", `yongu_export_${new Date().toISOString().slice(0,10)}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

export const parseCSV = (csvText: string): Client[] => {
  const lines = csvText.split(/\r?\n/); // Handle CRLF
  if (lines.length < 2) return [];

  // Helper to split CSV line respecting quotes
  const splitCSVLine = (line: string) => {
    const res = [];
    let current = '';
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      if (char === '"') {
        if (i + 1 < line.length && line[i + 1] === '"') {
          current += '"';
          i++;
        } else {
          inQuotes = !inQuotes;
        }
      } else if (char === ',' && !inQuotes) {
        res.push(current);
        current = '';
      } else {
        current += char;
      }
    }
    res.push(current);
    return res;
  };

  const headers = splitCSVLine(lines[0]).map(h => h.trim().toLowerCase());
  const clients: Client[] = [];

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    
    const values = splitCSVLine(line);
    
    // Safety check for empty lines or severely malformed lines
    if (values.length < 2) continue;

    const val = (keyPart: string) => {
        const index = headers.findIndex(h => h.includes(keyPart));
        return index > -1 ? values[index]?.trim() : '';
    };

    const name = val('name');
    const company = val('company');

    if (name) {
       const newClient: Client = {
           id: crypto.randomUUID(),
           name,
           company: company || 'Unknown',
           role: val('role'),
           status: (val('status') as ClientStatus) || ClientStatus.NEW,
           sector: (val('sector') as IndustrySector) || IndustrySector.OTHER,
           email: val('email'),
           phone: val('phone'),
           location: val('location'),
           continent: Continent.NORTH_AMERICA, // Fallback as CSV usually doesn't have continent enum
           lastContactDate: val('last contact') ? new Date(val('last contact')).toISOString() : undefined,
           nextFollowUpDate: val('next follow') ? new Date(val('next follow')).toISOString() : undefined,
           rate: val('rate'),
           notes: val('notes'),
           tags: val('tags') ? val('tags').split(',').map(t => t.trim()).filter(Boolean) : [],
           logs: []
       };
       clients.push(newClient);
    }
  }

  return clients;
};