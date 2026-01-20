import React, { useState, useEffect, useRef } from 'react';
import { UserProfile, Client } from '../types';
import { X, Save, User, Briefcase, Settings, Database, Download, FileSpreadsheet, Info, Upload } from 'lucide-react';
import { exportToCSV, parseCSV } from '../services/storage';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (profile: UserProfile) => void;
  onImportClients: (clients: Client[]) => void;
  initialProfile: UserProfile | null;
  clients?: Client[]; 
}

const INDUSTRY_PRESETS = [
  "VFX & Animation",
  "Game Development",
  "Software Engineering",
  "Architecture",
  "Real Estate",
  "Sales & Marketing",
  "Graphic Design",
  "Consulting",
  "Legal Services",
  "Recruiting",
  "Other (Custom)"
];

const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose, onSave, onImportClients, initialProfile, clients }) => {
  const [activeTab, setActiveTab] = useState<'profile' | 'data' | 'about'>('profile');
  const [name, setName] = useState('');
  const [industrySelect, setIndustrySelect] = useState(INDUSTRY_PRESETS[0]);
  const [customIndustry, setCustomIndustry] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  useEffect(() => {
    if (initialProfile) {
      setName(initialProfile.name);
      const isPreset = INDUSTRY_PRESETS.includes(initialProfile.industry);
      if (isPreset) {
        setIndustrySelect(initialProfile.industry);
      } else {
        setIndustrySelect("Other (Custom)");
        setCustomIndustry(initialProfile.industry);
      }
    }
  }, [initialProfile, isOpen]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const finalIndustry = industrySelect === "Other (Custom)" ? customIndustry : industrySelect;
    
    if (name && finalIndustry) {
      onSave({ name, industry: finalIndustry });
      onClose();
    }
  };

  const handleExportCSV = () => {
    if (clients) {
      exportToCSV(clients);
    }
  };

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const text = await file.text();
      const importedClients = parseCSV(text);
      if (importedClients.length > 0) {
        if (window.confirm(`Found ${importedClients.length} clients in file. Import them?`)) {
          onImportClients(importedClients);
          alert("Import successful!");
        }
      } else {
        alert("No valid clients found. Please check the CSV format.");
      }
    } catch (error) {
      console.error(error);
      alert("Failed to parse file. Please ensure it is a valid CSV.");
    }

    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in duration-300">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="p-6 border-b border-slate-800 flex justify-between items-center bg-slate-950/50">
           <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-500/20">
                <Settings size={20} className="text-white" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-white">Settings</h2>
                <p className="text-xs text-slate-400">Manage your profile & data</p>
              </div>
           </div>
           {initialProfile && (
            <button onClick={onClose} className="text-slate-500 hover:text-white transition-colors p-1">
              <X size={24} />
            </button>
           )}
        </div>

        {/* Tabs */}
        {initialProfile && (
          <div className="flex border-b border-slate-800">
            <button 
              onClick={() => setActiveTab('profile')}
              className={`flex-1 py-3 text-sm font-medium transition-colors ${activeTab === 'profile' ? 'text-indigo-400 border-b-2 border-indigo-500 bg-indigo-500/5' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'}`}
            >
              Profile
            </button>
            <button 
              onClick={() => setActiveTab('data')}
              className={`flex-1 py-3 text-sm font-medium transition-colors ${activeTab === 'data' ? 'text-indigo-400 border-b-2 border-indigo-500 bg-indigo-500/5' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'}`}
            >
              Data / Excel
            </button>
            <button 
              onClick={() => setActiveTab('about')}
              className={`flex-1 py-3 text-sm font-medium transition-colors ${activeTab === 'about' ? 'text-indigo-400 border-b-2 border-indigo-500 bg-indigo-500/5' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'}`}
            >
              About
            </button>
          </div>
        )}

        {/* Content */}
        <div className="p-6 overflow-y-auto custom-scrollbar">
          
          {activeTab === 'profile' && (
            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1.5 uppercase tracking-wide flex items-center gap-2">
                  <User size={14} /> Your Name
                </label>
                <input 
                  required
                  type="text"
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl p-3 text-white focus:ring-2 focus:ring-indigo-500 outline-none placeholder:text-slate-600 transition-all"
                  placeholder="e.g. Alex Smith"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>

              <div>
                 <label className="block text-xs font-medium text-slate-400 mb-1.5 uppercase tracking-wide flex items-center gap-2">
                  <Briefcase size={14} /> Your Industry
                </label>
                <div className="space-y-3">
                  <select 
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl p-3 text-white focus:ring-2 focus:ring-indigo-500 outline-none cursor-pointer appearance-none"
                    value={industrySelect}
                    onChange={(e) => setIndustrySelect(e.target.value)}
                  >
                    {INDUSTRY_PRESETS.map(preset => (
                      <option key={preset} value={preset}>{preset}</option>
                    ))}
                  </select>

                  {industrySelect === "Other (Custom)" && (
                    <input 
                      required
                      type="text"
                      className="w-full bg-slate-800 border border-slate-700 rounded-xl p-3 text-white focus:ring-2 focus:ring-indigo-500 outline-none placeholder:text-slate-600 animate-in slide-in-from-top-2"
                      placeholder="Type your industry name..."
                      value={customIndustry}
                      onChange={(e) => setCustomIndustry(e.target.value)}
                    />
                  )}
                </div>
              </div>

              <button 
                type="submit"
                className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-3 rounded-xl transition-all shadow-lg shadow-indigo-500/20 active:scale-95 flex items-center justify-center gap-2"
              >
                <Save size={18} />
                {initialProfile ? "Save Changes" : "Get Started"}
              </button>
            </form>
          )}

          {activeTab === 'data' && (
            <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
               
               {/* Export Section */}
               <div className="bg-slate-800/50 p-4 rounded-xl border border-slate-700">
                  <h3 className="text-white font-medium mb-2 flex items-center gap-2">
                    <Database size={18} className="text-green-400" /> Export Data
                  </h3>
                  <p className="text-sm text-slate-400 leading-relaxed mb-4">
                    Download your full contact list as a CSV file compatible with Microsoft Excel, Google Sheets, and Numbers.
                  </p>
                  
                  <button 
                    onClick={handleExportCSV}
                    className="w-full flex items-center justify-center gap-3 bg-slate-800 hover:bg-slate-700 border border-slate-600 hover:border-green-500 text-white p-4 rounded-xl transition-all group"
                  >
                    <div className="p-2 bg-green-500/20 rounded-lg group-hover:bg-green-500/30 transition-colors">
                      <FileSpreadsheet size={24} className="text-green-400" />
                    </div>
                    <div className="text-left">
                      <div className="font-semibold text-sm">Export to CSV</div>
                      <div className="text-[10px] text-slate-400">Download for Excel</div>
                    </div>
                  </button>
               </div>

               {/* Import Section */}
               <div className="bg-slate-800/50 p-4 rounded-xl border border-slate-700">
                  <h3 className="text-white font-medium mb-2 flex items-center gap-2">
                    <Upload size={18} className="text-blue-400" /> Import Data
                  </h3>
                  <p className="text-sm text-slate-400 leading-relaxed mb-4">
                    Import clients from a CSV file. Ensure the headers match the export format (Name, Company, Email, Phone, etc).
                  </p>
                  
                  <input 
                    type="file" 
                    accept=".csv" 
                    ref={fileInputRef} 
                    className="hidden" 
                    onChange={handleFileChange}
                  />

                  <button 
                    onClick={handleImportClick}
                    className="w-full flex items-center justify-center gap-3 bg-slate-800 hover:bg-slate-700 border border-slate-600 hover:border-blue-500 text-white p-4 rounded-xl transition-all group"
                  >
                    <div className="p-2 bg-blue-500/20 rounded-lg group-hover:bg-blue-500/30 transition-colors">
                      <Upload size={24} className="text-blue-400" />
                    </div>
                    <div className="text-left">
                      <div className="font-semibold text-sm">Import from CSV</div>
                      <div className="text-[10px] text-slate-400">Upload Excel/CSV File</div>
                    </div>
                  </button>
               </div>

            </div>
          )}

          {activeTab === 'about' && (
            <div className="space-y-6 text-center py-8 animate-in fade-in slide-in-from-right-4 duration-300">
              <div className="w-20 h-20 bg-indigo-600 rounded-3xl mx-auto flex items-center justify-center mb-6 shadow-2xl shadow-indigo-500/30">
                <div className="w-10 h-10 border-4 border-white rounded-full"></div>
              </div>
              <h3 className="text-2xl font-bold text-white">Yongu CM</h3>
              <p className="text-slate-400">Client Management for Creative Professionals</p>
              
              <div className="border-t border-slate-800 my-6"></div>
              
              <div className="space-y-2">
                <p className="text-sm text-slate-300 uppercase tracking-wider text-[10px] font-semibold">Created by</p>
                <p className="font-semibold text-white text-lg">Ivan Costarrosa Rios</p>
                <p className="text-xs text-slate-500">2026</p>
              </div>

              <div className="mt-8">
                <p className="text-[10px] text-slate-400 italic uppercase tracking-wider font-semibold">Special thanks to</p>
                <p className="text-indigo-400 font-medium mt-1">Nuria Ferrer Morera</p>
              </div>
            </div>
          )}

        </div>

      </div>
    </div>
  );
};

export default SettingsModal;
