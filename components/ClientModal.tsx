import React, { useState, useEffect } from 'react';
import { Client, ClientStatus, IndustrySector, ContactLog, Continent, Language } from '../types';
import { SECTOR_OPTIONS, STATUS_OPTIONS, CONTINENT_OPTIONS, TRANSLATIONS } from '../constants';
import { generateOutreachEmail } from '../services/geminiService';
import { X, Save, Plus, Trash2, Calendar, Mail, Phone, MessageSquare, History, Globe, MapPin, DollarSign, Compass, Sparkles, Loader2 } from 'lucide-react';

// Shared styles for inputs
const INPUT_STYLE = "w-full bg-slate-800 border border-slate-700 rounded-lg p-2.5 text-white focus:ring-2 focus:ring-indigo-500 outline-none placeholder:text-slate-600 transition-all";

interface ClientModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (client: Client) => void;
  client?: Client | null;
  lang: Language;
}

const ClientModal: React.FC<ClientModalProps> = ({ isOpen, onClose, onSave, client, lang }) => {
  const [formData, setFormData] = useState<Partial<Client>>({});
  const [tagInput, setTagInput] = useState('');
  
  const t = TRANSLATIONS[lang];

  // Log State
  const [newLog, setNewLog] = useState<Partial<ContactLog>>({
    type: 'Email',
    date: new Date().toISOString().split('T')[0],
    notes: ''
  });
  const [showLogForm, setShowLogForm] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);

  useEffect(() => {
    if (client) {
      setFormData({ ...client });
    } else {
      setFormData({
        status: ClientStatus.NEW,
        sector: IndustrySector.OTHER,
        continent: Continent.NORTH_AMERICA,
        tags: [],
        logs: [],
        notes: '',
      });
    }
    setNewLog({
      type: 'Email',
      date: new Date().toISOString().split('T')[0],
      notes: ''
    });
    setShowLogForm(false);
  }, [client, isOpen]);

  const handleChange = (field: keyof Client, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleAddTag = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && tagInput.trim()) {
      e.preventDefault();
      const currentTags = formData.tags || [];
      if (!currentTags.includes(tagInput.trim())) {
        handleChange('tags', [...currentTags, tagInput.trim()]);
      }
      setTagInput('');
    }
  };

  const removeTag = (tag: string) => {
    handleChange('tags', (formData.tags || []).filter(t => t !== tag));
  };

  const handleAddLog = () => {
    if (!newLog.notes) return;

    const logEntry: ContactLog = {
      id: crypto.randomUUID(),
      date: new Date(newLog.date!).toISOString(),
      type: newLog.type as any,
      notes: newLog.notes || ''
    };

    const updatedLogs = [logEntry, ...(formData.logs || [])];
    
    setFormData(prev => ({
      ...prev,
      logs: updatedLogs,
      lastContactDate: (!prev.lastContactDate || new Date(logEntry.date) > new Date(prev.lastContactDate)) 
        ? logEntry.date 
        : prev.lastContactDate
    }));

    setNewLog({
      type: 'Email',
      date: new Date().toISOString().split('T')[0],
      notes: ''
    });
    setShowLogForm(false);
  };

  const handleDeleteLog = (logId: string) => {
    setFormData(prev => ({
      ...prev,
      logs: (prev.logs || []).filter(l => l.id !== logId)
    }));
  };

  const handleGenerateDraft = async () => {
    if (!formData.name) return;
    setIsGenerating(true);
    
    // Determine context based on status or let user be prompted? 
    // For simplicity/speed we infer context from client status for now.
    let context = "General check-in";
    if (formData.status === ClientStatus.NEW) context = "Introduction and services";
    else if (formData.status === ClientStatus.NEGOTIATING) context = "Discussing rates and budget";
    else if (formData.status === ClientStatus.OLD) context = "Re-connecting after a long time";

    const draft = await generateOutreachEmail(formData as Client, context);
    
    setNewLog(prev => ({ ...prev, notes: draft }));
    setIsGenerating(false);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.company) return;
    
    const isStatusChanged = !client || client.status !== formData.status;
    const updatedTimestamp = isStatusChanged ? new Date().toISOString() : (client?.statusUpdatedAt || new Date().toISOString());

    const newClient: Client = {
      id: formData.id || crypto.randomUUID(),
      name: formData.name,
      company: formData.company,
      role: formData.role || '',
      email: formData.email || '',
      phone: formData.phone || '',
      sector: formData.sector || IndustrySector.OTHER,
      status: formData.status || ClientStatus.NEW, 
      statusUpdatedAt: updatedTimestamp,
      continent: formData.continent || Continent.NORTH_AMERICA,
      location: formData.location || '',
      lat: formData.lat,
      lng: formData.lng,
      website: formData.website || '',
      rate: formData.rate || '',
      notes: formData.notes || '',
      tags: formData.tags || [],
      logs: formData.logs || [],
      lastContactDate: formData.lastContactDate,
      nextFollowUpDate: formData.nextFollowUpDate,
    };

    onSave(newClient);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="bg-slate-900 border border-slate-700 rounded-xl w-full max-w-4xl max-h-[95vh] overflow-y-auto shadow-2xl">
        
        <div className="p-6">
          <div className="flex justify-between items-center mb-6 border-b border-slate-700 pb-4">
            <div>
              <h2 className="text-2xl font-bold text-white">
                {client ? t.addClient.replace('New', 'Edit') : t.addClient}
              </h2>
            </div>
            <button onClick={onClose} className="p-2 hover:bg-slate-800 rounded-lg text-slate-400">
              <X size={24} />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            
            {/* --- Core Info Section --- */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
               <div className="space-y-4">
                  <h3 className="text-indigo-400 font-semibold text-sm uppercase tracking-wide flex items-center gap-2">
                    <UserIcon /> {t.basicInfo}
                  </h3>
                  <div>
                    <label className="block text-xs font-medium text-slate-400 mb-1">{t.name} *</label>
                    <input required className={INPUT_STYLE} value={formData.name || ''} onChange={e => handleChange('name', e.target.value)} />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-400 mb-1">{t.company} *</label>
                    <input required className={INPUT_STYLE} value={formData.company || ''} onChange={e => handleChange('company', e.target.value)} />
                  </div>
                   <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-medium text-slate-400 mb-1">{t.status}</label>
                      <select className={INPUT_STYLE} value={formData.status} onChange={e => handleChange('status', e.target.value)}>
                        {STATUS_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-400 mb-1">{t.sector}</label>
                      <select className={INPUT_STYLE} value={formData.sector} onChange={e => handleChange('sector', e.target.value)}>
                        {SECTOR_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
                      </select>
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-400 mb-1 flex items-center gap-1"><DollarSign size={12}/> {t.rate}</label>
                    <input className={INPUT_STYLE} value={formData.rate || ''} onChange={e => handleChange('rate', e.target.value)} placeholder="e.g. $500/day" />
                  </div>
               </div>

               <div className="space-y-4">
                  <h3 className="text-indigo-400 font-semibold text-sm uppercase tracking-wide flex items-center gap-2">
                    <ContactIcon /> {t.contactDetails}
                  </h3>
                  <div className="grid grid-cols-2 gap-4">
                     <div>
                       <label className="block text-xs font-medium text-slate-400 mb-1">{t.email}</label>
                       <input type="email" className={INPUT_STYLE} value={formData.email || ''} onChange={e => handleChange('email', e.target.value)} />
                     </div>
                     <div>
                       <label className="block text-xs font-medium text-slate-400 mb-1">{t.phone}</label>
                       <input className={INPUT_STYLE} value={formData.phone || ''} onChange={e => handleChange('phone', e.target.value)} />
                     </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                     <div>
                       <label className="block text-xs font-medium text-slate-400 mb-1 flex items-center gap-1"><Globe size={12}/> {t.website}</label>
                       <input type="url" className={INPUT_STYLE} value={formData.website || ''} onChange={e => handleChange('website', e.target.value)} placeholder="https://" />
                     </div>
                     <div>
                       <label className="block text-xs font-medium text-slate-400 mb-1 flex items-center gap-1"><MapPin size={12}/> {t.location}</label>
                       <input className={INPUT_STYLE} value={formData.location || ''} onChange={e => handleChange('location', e.target.value)} placeholder="City, Country" />
                     </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                     <div>
                       <label className="block text-xs font-medium text-slate-400 mb-1">{t.role}</label>
                       <input className={INPUT_STYLE} value={formData.role || ''} onChange={e => handleChange('role', e.target.value)} />
                     </div>
                     <div>
                      <label className="block text-xs font-medium text-slate-400 mb-1">{t.continent}</label>
                      <select className={INPUT_STYLE} value={formData.continent} onChange={e => handleChange('continent', e.target.value)}>
                        {CONTINENT_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
                      </select>
                     </div>
                  </div>
                  
                  {/* Coordinates for Map */}
                  <div className="grid grid-cols-2 gap-4 p-3 bg-slate-800/50 rounded-lg border border-slate-700/50">
                    <div>
                      <label className="block text-[10px] font-medium text-slate-500 mb-1 flex items-center gap-1"><Compass size={10}/> {t.latitude}</label>
                      <input type="number" step="any" className="w-full bg-slate-900 border border-slate-700 rounded p-1.5 text-xs text-white" value={formData.lat || ''} onChange={e => handleChange('lat', parseFloat(e.target.value))} placeholder="0.00" />
                    </div>
                    <div>
                      <label className="block text-[10px] font-medium text-slate-500 mb-1 flex items-center gap-1"><Compass size={10}/> {t.longitude}</label>
                      <input type="number" step="any" className="w-full bg-slate-900 border border-slate-700 rounded p-1.5 text-xs text-white" value={formData.lng || ''} onChange={e => handleChange('lng', parseFloat(e.target.value))} placeholder="0.00" />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-medium text-slate-400 mb-1">{t.lastContact}</label>
                      <input type="date" className={INPUT_STYLE} value={formData.lastContactDate ? formData.lastContactDate.split('T')[0] : ''} onChange={e => handleChange('lastContactDate', new Date(e.target.value).toISOString())} />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-400 mb-1">{t.nextFollowUp}</label>
                      <input type="date" className={INPUT_STYLE} value={formData.nextFollowUpDate ? formData.nextFollowUpDate.split('T')[0] : ''} onChange={e => handleChange('nextFollowUpDate', new Date(e.target.value).toISOString())} />
                    </div>
                  </div>
               </div>
            </div>

            {/* --- Tags & Notes --- */}
            <div className="space-y-4">
               <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1">{t.tags}</label>
                  <div className="flex flex-wrap gap-2 mb-2 p-2 bg-slate-800/50 rounded-lg min-h-[42px] border border-slate-700">
                    {formData.tags?.map(tag => (
                      <span key={tag} className="bg-indigo-600/30 text-indigo-300 px-2 py-1 rounded text-xs flex items-center gap-1">
                        {tag} <button type="button" onClick={() => removeTag(tag)}><X size={12} /></button>
                      </span>
                    ))}
                    <input
                      className="bg-transparent outline-none text-sm min-w-[100px] flex-1 text-slate-300 placeholder:text-slate-600"
                      placeholder="Type tag & Enter..."
                      value={tagInput}
                      onChange={e => setTagInput(e.target.value)}
                      onKeyDown={handleAddTag}
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1">{t.notes}</label>
                  <textarea rows={2} className={`${INPUT_STYLE} resize-none`} value={formData.notes || ''} onChange={e => handleChange('notes', e.target.value)} />
                </div>
            </div>

            {/* --- Activity Log Section --- */}
            <div className="border-t border-slate-700 pt-6">
               <div className="flex items-center justify-between mb-4">
                  <h3 className="text-indigo-400 font-semibold text-sm uppercase tracking-wide flex items-center gap-2">
                    <History size={16} /> {t.activityLog}
                  </h3>
                  <button type="button" onClick={() => setShowLogForm(!showLogForm)} className="text-xs bg-slate-800 hover:bg-slate-700 text-white px-3 py-1.5 rounded border border-slate-700 transition-colors flex items-center gap-1">
                    <Plus size={14} /> Add Log
                  </button>
               </div>

               {showLogForm && (
                 <div className="bg-slate-800/50 p-4 rounded-lg border border-slate-700 mb-4 animate-in fade-in slide-in-from-top-2">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-3">
                       <input type="date" className={INPUT_STYLE} value={newLog.date} onChange={e => setNewLog({...newLog, date: e.target.value})} />
                       <select className={INPUT_STYLE} value={newLog.type} onChange={e => setNewLog({...newLog, type: e.target.value as any})}>
                          <option value="Email">Email</option>
                          <option value="Call">Call</option>
                          <option value="Meeting">Meeting</option>
                          <option value="Social">Social</option>
                       </select>
                       <div className="flex items-center text-xs text-slate-500 italic">
                          Updates Last Contact date
                       </div>
                    </div>
                    
                    <div className="relative">
                      <textarea 
                        placeholder={newLog.type === 'Email' ? "Paste email content here or generate a draft..." : "What happened?"}
                        className={`${INPUT_STYLE} mb-3 h-32 resize-none`} 
                        value={newLog.notes} 
                        onChange={e => setNewLog({...newLog, notes: e.target.value})}
                      />
                      {newLog.type === 'Email' && (
                        <button 
                          type="button" 
                          onClick={handleGenerateDraft}
                          disabled={isGenerating || !formData.name}
                          className="absolute right-3 bottom-6 text-xs bg-indigo-600/90 hover:bg-indigo-500 text-white px-3 py-1.5 rounded-md flex items-center gap-2 backdrop-blur-sm transition-colors disabled:opacity-50"
                        >
                          {isGenerating ? <Loader2 size={12} className="animate-spin" /> : <Sparkles size={12} />}
                          {isGenerating ? 'Drafting...' : 'Auto-Draft'}
                        </button>
                      )}
                    </div>

                    <div className="flex justify-end gap-2">
                      <button type="button" onClick={() => setShowLogForm(false)} className="px-3 py-1.5 text-xs text-slate-400 hover:text-slate-300">Cancel</button>
                      <button type="button" onClick={handleAddLog} className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded text-xs font-medium">Add Entry</button>
                    </div>
                 </div>
               )}

               <div className="bg-slate-900/50 rounded-lg border border-slate-800 max-h-[200px] overflow-y-auto p-2 space-y-2 custom-scrollbar">
                  {(formData.logs && formData.logs.length > 0) ? (
                    formData.logs.map(log => (
                      <div key={log.id} className="bg-slate-800 p-3 rounded border border-slate-700/50 flex gap-3 group">
                         <div className="mt-1">
                           {log.type === 'Email' && <Mail size={14} className="text-blue-400"/>}
                           {log.type === 'Call' && <Phone size={14} className="text-green-400"/>}
                           {log.type === 'Meeting' && <Calendar size={14} className="text-purple-400"/>}
                           {log.type === 'Social' && <MessageSquare size={14} className="text-pink-400"/>}
                         </div>
                         <div className="flex-1 min-w-0">
                            <div className="flex justify-between items-start">
                               <span className="text-xs font-bold text-slate-300">{new Date(log.date).toLocaleDateString()}</span>
                               <button type="button" onClick={() => handleDeleteLog(log.id)} className="opacity-0 group-hover:opacity-100 text-slate-600 hover:text-red-400 transition-opacity">
                                  <Trash2 size={12} />
                               </button>
                            </div>
                            <p className="text-sm text-slate-400 mt-1 leading-relaxed whitespace-pre-wrap">{log.notes}</p>
                         </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-6 text-slate-600 text-sm">No activity recorded yet.</div>
                  )}
               </div>
            </div>

            <div className="flex justify-end items-center pt-4 border-t border-slate-700 mt-6">
              <button
                type="submit"
                className="bg-indigo-600 hover:bg-indigo-500 text-white px-8 py-2.5 rounded-lg font-medium flex items-center gap-2 transition-all shadow-lg shadow-indigo-500/20"
              >
                <Save size={18} />
                {t.saveClient}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

// Simple icons to keep code cleaner
const UserIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>;
const ContactIcon = () => <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg>;

export default ClientModal;