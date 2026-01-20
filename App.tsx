import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  LayoutDashboard, 
  Users, 
  Trello, 
  Plus, 
  Search, 
  Filter, 
  Calendar,
  Clock,
  Map as MapIcon,
  Briefcase,
  Settings,
  Timer,
  Save,
  TrendingUp,
  Download,
  Smartphone
} from 'lucide-react';
import { Client, ViewState, ClientStatus, Language, UserProfile } from './types';
import { STATUS_COLORS, SECTOR_OPTIONS, CONTINENT_OPTIONS, TRANSLATIONS } from './constants';
import { openDatabaseFile, createDatabaseFile, saveDatabaseFile, loadFromLocalStorage, saveToLocalStorage, createNewDatabase, AppData } from './services/storage';
import ClientModal from './components/ClientModal';
import MapView from './components/MapView';
import JobBoard from './components/JobBoard';
import SettingsModal from './components/SettingsModal';
import FileStartup from './components/FileStartup';

// --- Helper Components ---
const StatCard = ({ title, value, icon: Icon, color }: any) => (
  <div className="bg-slate-800 border border-slate-700 p-6 rounded-xl flex items-center gap-4">
    <div className={`p-3 rounded-lg ${color} bg-opacity-20`}>
      <Icon size={24} className={color.replace('bg-', 'text-')} />
    </div>
    <div>
      <p className="text-slate-400 text-sm font-medium">{title}</p>
      <h3 className="text-2xl font-bold text-white">{value}</h3>
    </div>
  </div>
);

const ClientCard: React.FC<{ client: Client, onClick: () => void, onDelete: (e: React.MouseEvent) => void }> = ({ client, onClick, onDelete }) => {
  const isOverdue = client.nextFollowUpDate && new Date(client.nextFollowUpDate) <= new Date();
  
  return (
    <div 
      onClick={onClick}
      className="group bg-slate-800 hover:bg-slate-750 border border-slate-700 hover:border-indigo-500/50 rounded-xl p-5 cursor-pointer transition-all duration-200 relative"
    >
      <div className="flex justify-between items-start mb-3">
        <div>
          <h3 className="font-bold text-lg text-white group-hover:text-indigo-400 transition-colors">{client.name}</h3>
          <p className="text-slate-400 text-sm">{client.role} at <span className="text-slate-200">{client.company}</span></p>
        </div>
        <div className={`px-2 py-1 rounded text-xs font-semibold border ${STATUS_COLORS[client.status]}`}>
          {client.status}
        </div>
      </div>
      
      <div className="flex flex-wrap gap-2 mb-4">
        {client.tags.slice(0, 3).map(tag => (
          <span key={tag} className="text-xs bg-slate-700/50 text-slate-300 px-2 py-1 rounded">
            {tag}
          </span>
        ))}
        {client.tags.length > 3 && <span className="text-xs text-slate-500">+{client.tags.length - 3}</span>}
      </div>

      <div className="flex items-center gap-4 text-sm text-slate-400 mt-auto pt-3 border-t border-slate-700/50">
        <div className="flex items-center gap-1">
          <Calendar size={14} />
          {client.lastContactDate ? new Date(client.lastContactDate).toLocaleDateString() : 'No contact'}
        </div>
        {client.nextFollowUpDate && (
          <div className={`flex items-center gap-1 ${isOverdue ? 'text-red-400 font-medium' : ''}`}>
             <Clock size={14} />
             {new Date(client.nextFollowUpDate).toLocaleDateString()}
          </div>
        )}
      </div>
    </div>
  );
};

// --- Main App Component ---

const App = () => {
  // File System State
  const [fileHandle, setFileHandle] = useState<any>(null);
  const [storageMode, setStorageMode] = useState<'FILE' | 'LOCAL'>('FILE');
  const [isFileLoaded, setIsFileLoaded] = useState(false);
  const [fsError, setFsError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // App Data State
  const [clients, setClients] = useState<Client[]>([]);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  
  const [view, setView] = useState<ViewState>('DASHBOARD');
  const [searchTerm, setSearchTerm] = useState('');
  
  // Modals
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  
  // Filters
  const [lang, setLang] = useState<Language>('en');
  const [filterContinent, setFilterContinent] = useState<string>('All');
  const [filterSector, setFilterSector] = useState<string>('All');

  // PWA Install Prompt
  const [installPrompt, setInstallPrompt] = useState<any>(null);

  const t = TRANSLATIONS[lang];

  useEffect(() => {
    // Check for previous Local Storage session
    const localData = loadFromLocalStorage();
    if (localData) {
      // We don't auto-load, we let the user choose in FileStartup, 
      // but we could hint that data exists.
    }

    const handleInstallPrompt = (e: any) => {
      e.preventDefault();
      setInstallPrompt(e);
    };

    window.addEventListener('beforeinstallprompt', handleInstallPrompt);
    return () => window.removeEventListener('beforeinstallprompt', handleInstallPrompt);
  }, []);

  const handleInstallClick = () => {
    if (!installPrompt) return;
    installPrompt.prompt();
    installPrompt.userChoice.then((choiceResult: any) => {
      setInstallPrompt(null);
    });
  };

  // --- File/Storage Operations ---

  const handleUseLocalStorage = () => {
    setFsError(null);
    let data = loadFromLocalStorage();
    if (!data) {
      data = createNewDatabase();
      saveToLocalStorage(data);
    }
    setClients(data.clients);
    setUserProfile(data.profile);
    setStorageMode('LOCAL');
    setIsFileLoaded(true);
    if (!data.profile) setIsSettingsOpen(true);
  };

  const handleOpenFile = async () => {
    try {
      setFsError(null);
      const result = await openDatabaseFile();
      setClients(result.data.clients);
      setUserProfile(result.data.profile);
      setFileHandle(result.handle);
      setStorageMode('FILE');
      setIsFileLoaded(true);
      if (!result.data.profile) setIsSettingsOpen(true);
    } catch (e: any) {
      if (e.message === 'NOT_SUPPORTED') {
        setFsError("File System not supported on this device. Please use 'Browser Storage'.");
      } else if (e.name !== 'AbortError') {
        setFsError("Failed to open file. Please ensure it is a valid .json or .yongu file.");
      }
    }
  };

  const handleCreateFile = async () => {
    try {
      setFsError(null);
      const result = await createDatabaseFile();
      setClients(result.data.clients);
      setUserProfile(result.data.profile);
      setFileHandle(result.handle);
      setStorageMode('FILE');
      setIsFileLoaded(true);
      setIsSettingsOpen(true);
    } catch (e: any) {
       if (e.message === 'NOT_SUPPORTED') {
        setFsError("File System not supported on this device. Please use 'Browser Storage'.");
      } else if (e.name !== 'AbortError') {
        setFsError("Failed to create file.");
      }
    }
  };

  const saveData = async (newClients: Client[], newProfile: UserProfile | null) => {
    setIsSaving(true);
    const data: AppData = {
      clients: newClients,
      profile: newProfile,
      lastUpdated: new Date().toISOString()
    };

    try {
      if (storageMode === 'FILE' && fileHandle) {
        await saveDatabaseFile(fileHandle, data);
      } else if (storageMode === 'LOCAL') {
        saveToLocalStorage(data);
        // Artificial delay so user sees "Saving..."
        await new Promise(r => setTimeout(r, 500));
      }
    } catch (e) {
      console.error("Auto-save failed:", e);
      alert("Failed to save changes.");
    } finally {
      setIsSaving(false);
    }
  };

  // --- Handlers ---

  const handleSaveClient = (client: Client) => {
    const updatedClients = (() => {
      const exists = clients.find(c => c.id === client.id);
      if (exists) {
        return clients.map(c => c.id === client.id ? client : c);
      }
      return [...clients, client];
    })();
    
    setClients(updatedClients);
    saveData(updatedClients, userProfile);
    setSelectedClient(null);
  };

  const handleDeleteClient = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (window.confirm(lang === 'en' ? "Are you sure?" : "¿Estás seguro?")) {
      const updatedClients = clients.filter(c => c.id !== id);
      setClients(updatedClients);
      saveData(updatedClients, userProfile);
    }
  };

  const handleSaveProfile = (profile: UserProfile) => {
    setUserProfile(profile);
    saveData(clients, profile);
  };
  
  const handleImportClients = (newClients: Client[]) => {
    const updatedClients = [...clients, ...newClients];
    setClients(updatedClients);
    saveData(updatedClients, userProfile);
    setView('CLIENTS');
  };

  // --- Derived State ---

  const stats = useMemo(() => {
    const total = clients.length;
    const active = clients.filter(c => c.status === ClientStatus.ACTIVE).length;
    const leads = clients.filter(c => c.status === ClientStatus.NEW).length;
    const followUps = clients.filter(c => c.nextFollowUpDate && new Date(c.nextFollowUpDate) <= new Date()).length;
    return { total, active, leads, followUps };
  }, [clients]);

  const filteredClients = useMemo(() => {
    return clients.filter(c => {
      const matchesSearch = 
        c.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
        c.company.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.tags.some(t => t.toLowerCase().includes(searchTerm.toLowerCase()));
      
      const matchesContinent = filterContinent === 'All' || c.continent === filterContinent;
      const matchesSector = filterSector === 'All' || c.sector === filterSector;

      return matchesSearch && matchesContinent && matchesSector;
    });
  }, [clients, searchTerm, filterContinent, filterSector]);

  const appTitle = useMemo(() => {
    if (userProfile?.industry) {
      const industryShort = userProfile.industry.split('&')[0].trim();
      return `${industryShort} Yongu CM`;
    }
    return "Yongu CM";
  }, [userProfile]);


  // --- Render ---

  if (!isFileLoaded) {
    return <FileStartup onOpen={handleOpenFile} onCreate={handleCreateFile} onUseLocal={handleUseLocalStorage} error={fsError} />;
  }

  const renderDashboard = () => (
    <div className="space-y-8 animate-in fade-in duration-500">
      {userProfile && (
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-2xl font-bold text-white">Hello, {userProfile.name}</h1>
            <p className="text-slate-400 text-sm">Here is what's happening in your {userProfile.industry} network today.</p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title={t.totalClients} value={stats.total} icon={Users} color="text-indigo-400 bg-indigo-500" />
        <StatCard title={t.activeProjects} value={stats.active} icon={TrendingUp} color="text-green-400 bg-green-500" />
        <StatCard title={t.pendingLeads} value={stats.leads} icon={Trello} color="text-blue-400 bg-blue-500" />
        <StatCard title={t.followUpDue} value={stats.followUps} icon={Clock} color="text-orange-400 bg-orange-500" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-6">
           <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
             <Clock className="text-orange-400" size={20}/> {t.priorityFollowUps}
           </h2>
           <div className="space-y-3">
             {clients
                .filter(c => c.nextFollowUpDate && new Date(c.nextFollowUpDate) <= new Date())
                .sort((a, b) => new Date(a.nextFollowUpDate!).getTime() - new Date(b.nextFollowUpDate!).getTime())
                .slice(0, 5)
                .map(client => (
                  <div key={client.id} onClick={() => { setSelectedClient(client); setIsModalOpen(true); }} className="flex items-center justify-between p-3 bg-slate-800 rounded-lg hover:bg-slate-700 cursor-pointer transition-colors border border-slate-700/50">
                    <div>
                      <h4 className="font-semibold text-slate-200">{client.name}</h4>
                      <p className="text-xs text-slate-400">{client.company}</p>
                    </div>
                    <div className="text-right">
                       <span className="text-xs text-orange-400 font-medium">Overdue</span>
                       <p className="text-xs text-slate-500">{new Date(client.nextFollowUpDate!).toLocaleDateString()}</p>
                    </div>
                  </div>
                ))}
              {stats.followUps === 0 && <p className="text-slate-500 text-sm italic">No urgent follow-ups.</p>}
           </div>
        </div>

        <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-6">
           <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
             <TrendingUp className="text-green-400" size={20}/> {t.recentActivity}
           </h2>
            <div className="space-y-3">
             {clients
                .filter(c => c.status === ClientStatus.ACTIVE)
                .slice(0, 5)
                .map(client => (
                   <div key={client.id} onClick={() => { setSelectedClient(client); setIsModalOpen(true); }} className="flex items-center justify-between p-3 bg-slate-800 rounded-lg hover:bg-slate-700 cursor-pointer transition-colors border border-slate-700/50">
                    <div>
                      <h4 className="font-semibold text-slate-200">{client.name}</h4>
                      <p className="text-xs text-slate-400">{client.role}</p>
                    </div>
                    <div className="px-2 py-1 rounded text-xs bg-green-500/10 text-green-400 border border-green-500/20">
                       Active
                    </div>
                  </div>
                ))}
               {stats.active === 0 && <p className="text-slate-500 text-sm italic">No active projects currently.</p>}
           </div>
        </div>
      </div>
    </div>
  );

  const renderKanban = () => {
    const columns = [
      ClientStatus.OLD, ClientStatus.NEW, ClientStatus.CONTACTED, 
      ClientStatus.NEGOTIATING, ClientStatus.ACTIVE, ClientStatus.COMPLETED
    ];
    
    return (
      <div className="flex gap-6 overflow-x-auto pb-6 h-[calc(100vh-200px)] animate-in fade-in duration-500">
        {columns.map(status => {
           const columnClients = filteredClients.filter(c => c.status === status);
           return (
             <div key={status} className="min-w-[300px] w-80 bg-slate-800/30 rounded-xl border border-slate-700/50 flex flex-col shrink-0">
                <div className={`p-4 border-b border-slate-700/50 font-semibold text-sm uppercase tracking-wider flex justify-between items-center ${STATUS_COLORS[status].split(' ')[1]}`}>
                  {status}
                  <span className="bg-slate-800 px-2 py-0.5 rounded-full text-xs text-slate-400">{columnClients.length}</span>
                </div>
                <div className="p-3 space-y-3 overflow-y-auto flex-1 custom-scrollbar">
                  {columnClients.map(client => {
                    const daysInStatus = client.statusUpdatedAt 
                      ? Math.floor((new Date().getTime() - new Date(client.statusUpdatedAt).getTime()) / (1000 * 3600 * 24)) 
                      : 0;
                    
                    return (
                      <div 
                        key={client.id}
                        onClick={() => { setSelectedClient(client); setIsModalOpen(true); }}
                        className="bg-slate-800 p-4 rounded-lg border border-slate-700 hover:border-indigo-500/50 cursor-pointer shadow-sm transition-all group"
                      >
                        <h4 className="font-bold text-slate-200 mb-1 group-hover:text-indigo-300 transition-colors">{client.name}</h4>
                        <p className="text-xs text-slate-400 mb-2">{client.company}</p>
                        <div className="flex items-center justify-between mt-2">
                            <span className="text-[10px] bg-slate-700 px-1.5 py-0.5 rounded text-slate-300">{client.sector}</span>
                            <div className="flex items-center gap-3">
                              <span className={`text-[10px] flex items-center gap-1 ${daysInStatus > 30 ? 'text-red-400' : 'text-slate-500'}`} title={`In this stage for ${daysInStatus} days`}>
                                <Timer size={10} /> {daysInStatus}d
                              </span>
                              {client.nextFollowUpDate && new Date(client.nextFollowUpDate) <= new Date() && (
                                <span className="w-2 h-2 rounded-full bg-orange-500 animate-pulse" title="Follow up due"></span>
                              )}
                            </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
             </div>
           )
        })}
      </div>
    );
  };

  return (
    <div className="flex h-screen bg-slate-900 text-slate-200 overflow-hidden font-sans">
      <aside className="w-20 lg:w-64 bg-slate-950 border-r border-slate-800 flex flex-col items-center lg:items-stretch transition-all duration-300 shrink-0">
        <div className="p-6 flex items-center justify-center lg:justify-start gap-3">
          <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center shadow-lg shadow-indigo-500/20">
             <div className="w-4 h-4 border-2 border-white rounded-full"></div>
          </div>
          <span className="hidden lg:block font-bold text-xl tracking-tight text-white whitespace-nowrap overflow-hidden text-ellipsis">
            {appTitle}
          </span>
        </div>

        <nav className="flex-1 px-4 space-y-2 mt-4">
          <button onClick={() => setView('DASHBOARD')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${view === 'DASHBOARD' ? 'bg-indigo-600/10 text-indigo-400' : 'text-slate-400 hover:bg-slate-900 hover:text-white'}`}>
            <LayoutDashboard size={20} /> <span className="hidden lg:block font-medium">{t.dashboard}</span>
          </button>
          <button onClick={() => setView('CLIENTS')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${view === 'CLIENTS' ? 'bg-indigo-600/10 text-indigo-400' : 'text-slate-400 hover:bg-slate-900 hover:text-white'}`}>
            <Users size={20} /> <span className="hidden lg:block font-medium">{t.clients}</span>
          </button>
          <button onClick={() => setView('KANBAN')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${view === 'KANBAN' ? 'bg-indigo-600/10 text-indigo-400' : 'text-slate-400 hover:bg-slate-900 hover:text-white'}`}>
            <Trello size={20} /> <span className="hidden lg:block font-medium">{t.pipeline}</span>
          </button>
          <button onClick={() => setView('MAP')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${view === 'MAP' ? 'bg-indigo-600/10 text-indigo-400' : 'text-slate-400 hover:bg-slate-900 hover:text-white'}`}>
            <MapIcon size={20} /> <span className="hidden lg:block font-medium">{t.map}</span>
          </button>
          <button onClick={() => setView('JOBS')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${view === 'JOBS' ? 'bg-indigo-600/10 text-indigo-400' : 'text-slate-400 hover:bg-slate-900 hover:text-white'}`}>
            <Briefcase size={20} /> <span className="hidden lg:block font-medium">{t.jobs}</span>
          </button>
        </nav>

        <div className="p-4 border-t border-slate-800 space-y-4">
           {/* Install App Button */}
           {installPrompt && (
              <button onClick={handleInstallClick} className="w-full flex items-center justify-center gap-2 py-2 text-xs font-bold text-slate-900 bg-indigo-500 hover:bg-indigo-400 rounded-lg transition-colors shadow-lg shadow-indigo-500/20 animate-pulse">
                <Download size={14} /> Install App
              </button>
           )}

           <div className="flex bg-slate-900 rounded-lg p-1 border border-slate-800">
              <button onClick={() => setLang('en')} className={`flex-1 py-1.5 text-xs font-medium rounded ${lang === 'en' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'}`}>EN</button>
              <button onClick={() => setLang('es')} className={`flex-1 py-1.5 text-xs font-medium rounded ${lang === 'es' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'}`}>ES</button>
           </div>
           
           <div className="flex items-center justify-between text-xs text-slate-500 px-2">
              <span>{storageMode === 'LOCAL' ? 'Local Storage' : 'File Mode'}</span>
              {storageMode === 'LOCAL' && <Smartphone size={12} />}
           </div>

           <button onClick={() => setIsSettingsOpen(true)} className="w-full flex items-center justify-center gap-2 py-2 text-xs font-medium text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors">
             <Settings size={14} /> Settings
           </button>
        </div>
      </aside>

      <main className="flex-1 flex flex-col overflow-hidden">
        <header className="h-16 border-b border-slate-800 flex items-center justify-between px-6 bg-slate-900/50 backdrop-blur-md sticky top-0 z-10">
           <div className="flex items-center gap-4 flex-1">
             {view !== 'JOBS' && (
               <div className="relative w-full max-w-xs hidden md:block animate-in fade-in">
                 <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
                 <input type="text" placeholder={t.searchPlaceholder} className="w-full bg-slate-800 border-none rounded-lg pl-10 pr-4 py-2 text-sm text-white focus:ring-2 focus:ring-indigo-500 outline-none placeholder:text-slate-600" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
               </div>
             )}

             {view !== 'JOBS' && (
                <div className="flex items-center gap-2 animate-in fade-in">
                    <div className="relative group">
                      <select value={filterContinent} onChange={(e) => setFilterContinent(e.target.value)} className="appearance-none bg-slate-800 text-slate-300 text-sm px-3 py-2 pr-8 rounded-lg border border-slate-700 hover:border-slate-600 focus:ring-2 focus:ring-indigo-500 outline-none cursor-pointer">
                        <option value="All">{t.filterContinent}</option>
                        {CONTINENT_OPTIONS.map(c => <option key={c} value={c}>{c}</option>)}
                      </select>
                      <Filter size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" />
                    </div>

                    <div className="relative group hidden sm:block">
                      <select value={filterSector} onChange={(e) => setFilterSector(e.target.value)} className="appearance-none bg-slate-800 text-slate-300 text-sm px-3 py-2 pr-8 rounded-lg border border-slate-700 hover:border-slate-600 focus:ring-2 focus:ring-indigo-500 outline-none cursor-pointer">
                        <option value="All">{t.filterSector}</option>
                        {SECTOR_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
                      </select>
                      <Filter size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" />
                    </div>
                </div>
             )}
             
             {isSaving && (
               <span className="text-xs text-indigo-400 flex items-center gap-1 animate-pulse">
                 <Save size={12} /> Saving...
               </span>
             )}
           </div>
           
           <div className="flex items-center gap-4">
             <button onClick={() => { setSelectedClient(null); setIsModalOpen(true); }} className="bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2 rounded-lg font-medium flex items-center gap-2 transition-all shadow-lg shadow-indigo-500/20 active:scale-95">
               <Plus size={18} /> <span className="hidden md:inline">{t.addClient}</span>
             </button>
           </div>
        </header>

        <div className="flex-1 overflow-y-auto p-6 md:p-8 relative custom-scrollbar">
           {view === 'DASHBOARD' && renderDashboard()}
           {view === 'CLIENTS' && (
             <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 animate-in slide-in-from-bottom-4 duration-500">
                {filteredClients.map(client => (
                  <ClientCard key={client.id} client={client} onClick={() => { setSelectedClient(client); setIsModalOpen(true); }} onDelete={(e) => handleDeleteClient(e, client.id)} />
                ))}
                {filteredClients.length === 0 && (
                   <div className="col-span-full text-center py-20 text-slate-500">
                      <Users size={48} className="mx-auto mb-4 opacity-50" />
                      <p className="text-lg">{t.noClients}</p>
                   </div>
                )}
             </div>
           )}
           {view === 'KANBAN' && renderKanban()}
           {view === 'MAP' && (
              <div className="h-full min-h-[500px] animate-in fade-in duration-500">
                <MapView clients={filteredClients} onSelectClient={(c) => { setSelectedClient(c); setIsModalOpen(true); }} />
              </div>
           )}
           {view === 'JOBS' && (
              <JobBoard clients={clients} lang={lang} onViewClient={(c) => { setSelectedClient(c); setIsModalOpen(true); }} userProfile={userProfile} />
           )}
        </div>
      </main>

      <ClientModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} onSave={handleSaveClient} client={selectedClient} lang={lang} />
      
      <SettingsModal 
        isOpen={isSettingsOpen} 
        onClose={() => setIsSettingsOpen(false)} 
        onSave={handleSaveProfile} 
        onImportClients={handleImportClients}
        initialProfile={userProfile} 
        clients={clients} 
      />
    </div>
  );
};

export default App;