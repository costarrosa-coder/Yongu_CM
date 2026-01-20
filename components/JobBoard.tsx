import React, { useState, useEffect, useRef } from 'react';
import { Client, JobOffer, Language, IndustrySector, Continent, DateRange, UserProfile } from '../types';
import { fetchJobs } from '../services/jobService';
import { TRANSLATIONS, SECTOR_OPTIONS, CONTINENT_OPTIONS, DATE_RANGE_OPTIONS } from '../constants';
import { Briefcase, MapPin, Clock, Search, ExternalLink, UserCheck, Filter, Globe, Sparkles, Calendar, Check, ChevronDown, X } from 'lucide-react';

interface JobBoardProps {
  clients: Client[];
  lang: Language;
  onViewClient: (client: Client) => void;
  userProfile: UserProfile | null;
}

// --- MultiSelect Helper Component ---
const MultiSelect = ({ 
  options, 
  selected, 
  onChange, 
  label,
  icon: Icon
}: { 
  options: string[], 
  selected: string[], 
  onChange: (val: string[]) => void, 
  label: string,
  icon: any
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Close on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  const toggleOption = (option: string) => {
    if (selected.includes(option)) {
      onChange(selected.filter(s => s !== option));
    } else {
      onChange([...selected, option]);
    }
  };

  const clearSelection = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange([]);
  };

  return (
    <div className="relative" ref={containerRef}>
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className={`w-full appearance-none bg-slate-800 text-slate-300 text-xs sm:text-sm px-3 py-2 pr-8 rounded-lg border ${isOpen ? 'border-indigo-500 ring-1 ring-indigo-500' : 'border-slate-700'} focus:outline-none flex items-center justify-between min-h-[38px]`}
      >
        <span className="truncate flex items-center gap-2">
           {selected.length === 0 ? label : `${selected.length} selected`}
        </span>
        <div className="flex items-center gap-1">
          {selected.length > 0 && (
            <div onClick={clearSelection} className="p-0.5 hover:bg-slate-700 rounded-full cursor-pointer mr-1">
              <X size={12} className="text-slate-400" />
            </div>
          )}
          <ChevronDown size={14} className={`text-slate-500 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
        </div>
      </button>
      
      {isOpen && (
         <div className="absolute top-full left-0 mt-1 w-full sm:w-64 bg-slate-800 border border-slate-700 rounded-lg shadow-xl z-50 max-h-64 overflow-y-auto animate-in fade-in zoom-in-95 duration-200">
            {options.map(opt => {
              const isSelected = selected.includes(opt);
              return (
                <div 
                  key={opt} 
                  onClick={() => toggleOption(opt)}
                  className={`px-3 py-2.5 text-xs sm:text-sm cursor-pointer flex items-center gap-3 transition-colors ${isSelected ? 'bg-indigo-600/10 text-indigo-300' : 'text-slate-300 hover:bg-slate-700'}`}
                >
                   <div className={`w-4 h-4 rounded border flex items-center justify-center ${isSelected ? 'bg-indigo-600 border-indigo-600' : 'border-slate-600'}`}>
                      {isSelected && <Check size={10} className="text-white" />}
                   </div>
                   <span>{opt}</span>
                </div>
              );
            })}
         </div>
      )}
      <Icon size={14} className="absolute right-8 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none opacity-0" /> {/* Keeping structure similar but icon is handled in button */}
    </div>
  );
};


const JobBoard: React.FC<JobBoardProps> = ({ clients, lang, onViewClient, userProfile }) => {
  const [jobs, setJobs] = useState<JobOffer[]>([]);
  const [loading, setLoading] = useState(false);
  
  // Search State
  const [roleSearch, setRoleSearch] = useState('');
  
  // Changed to arrays for multi-select
  const [selectedSectors, setSelectedSectors] = useState<string[]>([]);
  const [selectedContinents, setSelectedContinents] = useState<string[]>([]);
  
  const [locationSearch, setLocationSearch] = useState('');
  const [dateRange, setDateRange] = useState<DateRange>('any');

  const t = TRANSLATIONS[lang];

  // Initial Load
  useEffect(() => {
    // If we have a user profile industry, we can optionally use it to seed the search
    // But usually, empty search returns 'default' mocks. 
    // We will let the user search explicitly, but if the roleSearch is empty,
    // the backend/service will use the profile industry as fallback context if implemented.
    handleSearch();
  }, []);

  const handleSearch = async () => {
    setLoading(true);
    setJobs([]); // Clear previous to show loading state cleanly
    try {
      // If roleSearch is empty, pass the User Industry as the role context
      const effectiveRole = roleSearch || (userProfile ? userProfile.industry : '');

      const searchParams = {
        role: effectiveRole,
        sectors: selectedSectors,
        continents: selectedContinents,
        location: locationSearch,
        dateRange: dateRange
      };
      
      const data = await fetchJobs(searchParams);
      setJobs(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // Logic to find matches
  // Matches if client.company includes job.company or vice versa (case insensitive)
  const getContactsAtCompany = (companyName: string): Client[] => {
    if (!companyName) return [];
    const normalizedJobCompany = companyName.toLowerCase();
    return clients.filter(c => 
      c.company && (c.company.toLowerCase().includes(normalizedJobCompany) || 
      normalizedJobCompany.includes(c.company.toLowerCase()))
    );
  };

  const getPlaceholder = () => {
    if (userProfile && userProfile.industry !== "VFX & Animation") {
       return `Search ${userProfile.industry} roles...`;
    }
    return t.jobSearchPlaceholder;
  }

  return (
    <div className="animate-in fade-in duration-500 h-full flex flex-col">
      {/* Filters Bar */}
      <div className="flex flex-col gap-4 mb-6 sticky top-0 bg-slate-900/95 backdrop-blur-md z-10 py-4 border-b border-slate-800">
        
        {/* Top Row: Main Search & Action */}
        <div className="flex flex-col md:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
            <input 
              type="text" 
              placeholder={getPlaceholder()}
              className="w-full bg-slate-800 border border-slate-700 rounded-lg pl-10 pr-4 py-2.5 text-sm text-white focus:ring-2 focus:ring-indigo-500 outline-none placeholder:text-slate-600"
              value={roleSearch}
              onChange={(e) => setRoleSearch(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            />
          </div>
          
          <button 
            onClick={handleSearch}
            disabled={loading}
            className="bg-indigo-600 hover:bg-indigo-500 text-white px-6 py-2.5 rounded-lg font-medium flex items-center justify-center gap-2 transition-all shadow-lg shadow-indigo-500/20 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div> : <Sparkles size={18} />}
            <span className="hidden md:inline">{t.deepSearch}</span>
          </button>
        </div>

        {/* Bottom Row: Detailed Filters */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
           {/* Date Range */}
           <div className="relative">
             <select 
               value={dateRange}
               onChange={(e) => setDateRange(e.target.value as DateRange)}
               className="w-full appearance-none bg-slate-800 text-slate-300 text-xs sm:text-sm px-3 py-2 pr-8 rounded-lg border border-slate-700 focus:ring-2 focus:ring-indigo-500 outline-none cursor-pointer"
             >
               {DATE_RANGE_OPTIONS.map(opt => <option key={opt.value} value={opt.value}>{t[opt.labelKey]}</option>)}
             </select>
             <Calendar size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" />
           </div>

           {/* MultiSelect Sector */}
           <MultiSelect 
              label={t.filterSector} 
              options={SECTOR_OPTIONS} 
              selected={selectedSectors} 
              onChange={setSelectedSectors}
              icon={Filter}
           />

           {/* MultiSelect Continent */}
           <MultiSelect 
              label={t.filterContinent} 
              options={CONTINENT_OPTIONS} 
              selected={selectedContinents} 
              onChange={setSelectedContinents}
              icon={Globe}
           />

           {/* Specific Location Input */}
           <div className="relative">
              <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={14} />
              <input 
                type="text" 
                placeholder={t.countryFilter}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg pl-9 pr-3 py-2 text-xs sm:text-sm text-white focus:ring-2 focus:ring-indigo-500 outline-none placeholder:text-slate-600"
                value={locationSearch}
                onChange={(e) => setLocationSearch(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              />
           </div>
        </div>
      </div>

      {/* Results */}
      {loading ? (
        <div className="flex-1 flex flex-col items-center justify-center text-slate-500 space-y-4">
          <div className="relative w-16 h-16">
            <div className="absolute inset-0 border-4 border-slate-800 rounded-full"></div>
            <div className="absolute inset-0 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
            <Globe className="absolute inset-0 m-auto text-slate-600 animate-pulse" size={24} />
          </div>
          <p className="animate-pulse text-sm font-medium">{t.aiSearchTip}</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 pb-10">
          {jobs.length > 0 ? jobs.map(job => {
            const contacts = getContactsAtCompany(job.company);
            const hasContact = contacts.length > 0;
            const isLinkedIn = job.source?.toLowerCase().includes('linkedin');

            return (
              <div key={job.id} className={`bg-slate-800 border ${hasContact ? 'border-green-500/40 shadow-[0_0_15px_-3px_rgba(74,222,128,0.1)]' : 'border-slate-700'} rounded-xl p-5 hover:bg-slate-750 transition-all flex flex-col group`}>
                 <div className="flex justify-between items-start mb-2">
                    <div className="flex-1 pr-4">
                      <h3 className="font-bold text-lg text-white group-hover:text-indigo-300 transition-colors">{job.title}</h3>
                      <p className="text-indigo-400 font-medium">{job.company}</p>
                    </div>
                    {/* Source Badge */}
                    <div className={`px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wider border ${isLinkedIn ? 'bg-blue-900/30 text-blue-300 border-blue-800' : 'bg-slate-700/50 text-slate-400 border-slate-600'}`}>
                       {job.source || 'Web'}
                    </div>
                 </div>

                 {hasContact && (
                   <div className="mb-3 bg-green-500/10 border border-green-500/20 text-green-400 px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-2 animate-in slide-in-from-left-2">
                      <UserCheck size={14} /> 
                      <span>{t.contactAtStudio}</span>
                   </div>
                 )}

                 <div className="flex flex-wrap gap-3 text-xs text-slate-400 mb-4 mt-1">
                    <span className="flex items-center gap-1"><MapPin size={12}/> {job.location}</span>
                    <span className="flex items-center gap-1"><Briefcase size={12}/> {job.type}</span>
                    <span className="flex items-center gap-1"><Clock size={12}/> {new Date(job.postedDate).toLocaleDateString()}</span>
                 </div>
                 
                 <p className="text-xs text-slate-500 line-clamp-2 mb-4">
                   {job.description}
                 </p>

                 {hasContact && (
                   <div className="mt-auto mb-4 border-t border-slate-700/50 pt-3">
                      <p className="text-[10px] uppercase tracking-wide text-green-500/70 mb-2 font-bold">Connections:</p>
                      <div className="flex flex-wrap gap-2">
                         {contacts.map(contact => (
                           <button 
                              key={contact.id} 
                              onClick={() => onViewClient(contact)}
                              className="flex items-center gap-2 bg-slate-900 border border-green-900/40 hover:border-green-400 px-2 py-1 rounded transition-colors group/btn"
                            >
                              <div className="w-4 h-4 bg-green-500/20 rounded-full flex items-center justify-center text-[8px] text-green-400 group-hover/btn:bg-green-500 group-hover/btn:text-white transition-colors">
                                {contact.name.charAt(0)}
                              </div>
                              <span className="text-xs text-slate-300 group-hover/btn:text-white">{contact.name}</span>
                           </button>
                         ))}
                      </div>
                   </div>
                 )}

                 <div className={`mt-auto pt-4 ${!hasContact ? 'border-t border-slate-700/50' : ''} flex justify-end`}>
                    <a 
                      href={job.url} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="bg-white text-slate-900 hover:bg-slate-200 px-4 py-2 rounded-lg text-sm font-semibold flex items-center gap-2 transition-colors"
                    >
                       {t.applyNow} <ExternalLink size={14} />
                    </a>
                 </div>
              </div>
            );
          }) : (
             <div className="col-span-full text-center py-20 text-slate-500">
               <Briefcase size={48} className="mx-auto mb-4 opacity-50" />
               <p>{t.noJobs}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default JobBoard;
