import React from 'react';
import { FolderOpen, FilePlus, AlertTriangle, Smartphone, HardDrive } from 'lucide-react';

interface FileStartupProps {
  onOpen: () => void;
  onCreate: () => void;
  onUseLocal: () => void;
  error?: string | null;
}

const FileStartup: React.FC<FileStartupProps> = ({ onOpen, onCreate, onUseLocal, error }) => {
  return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-6 text-center font-sans">
      
      <div className="max-w-md w-full animate-in fade-in slide-in-from-bottom-8 duration-700">
        <div className="w-20 h-20 bg-indigo-600 rounded-3xl mx-auto flex items-center justify-center mb-8 shadow-2xl shadow-indigo-500/30">
          <div className="w-10 h-10 border-4 border-white rounded-full"></div>
        </div>

        <h1 className="text-4xl font-bold text-white mb-2">Yongu CM</h1>
        <p className="text-slate-400 mb-10 text-lg">
          Your portable, standalone client manager.
        </p>

        <div className="space-y-4">
          
          {/* Mobile / Simple Option */}
          <button 
            onClick={onUseLocal}
            className="w-full group bg-slate-800 hover:bg-slate-750 border border-slate-700 hover:border-blue-500 p-5 rounded-2xl transition-all duration-300 flex items-center gap-5 text-left shadow-lg hover:shadow-blue-500/10"
          >
            <div className="w-12 h-12 bg-slate-900 rounded-xl flex items-center justify-center group-hover:bg-blue-600 transition-colors shrink-0">
              <Smartphone size={24} className="text-blue-400 group-hover:text-white" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white">Browser Storage</h3>
              <p className="text-xs text-slate-400">Best for Mobile. Saves directly to this device.</p>
            </div>
          </button>

          <div className="relative py-2">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-slate-800"></div>
            </div>
            <div className="relative flex justify-center">
              <span className="bg-slate-950 px-2 text-xs text-slate-500 uppercase tracking-wider">Or use File System (Desktop)</span>
            </div>
          </div>

          <button 
            onClick={onOpen}
            className="w-full group bg-slate-900/50 hover:bg-slate-800 border border-slate-800 hover:border-indigo-500 p-4 rounded-xl transition-all duration-300 flex items-center gap-4 text-left"
          >
            <div className="w-10 h-10 bg-slate-800 rounded-lg flex items-center justify-center group-hover:bg-indigo-600 transition-colors shrink-0">
              <FolderOpen size={20} className="text-indigo-400 group-hover:text-white" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">Open .json File</h3>
              <p className="text-xs text-slate-500">Load from hard drive.</p>
            </div>
          </button>

          <button 
            onClick={onCreate}
            className="w-full group bg-slate-900/50 hover:bg-slate-800 border border-slate-800 hover:border-green-500 p-4 rounded-xl transition-all duration-300 flex items-center gap-4 text-left"
          >
            <div className="w-10 h-10 bg-slate-800 rounded-lg flex items-center justify-center group-hover:bg-green-600 transition-colors shrink-0">
              <FilePlus size={20} className="text-green-400 group-hover:text-white" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">New File</h3>
              <p className="text-xs text-slate-500">Create fresh database.</p>
            </div>
          </button>
        </div>

        {error && (
          <div className="mt-8 p-4 bg-red-500/10 border border-red-500/20 rounded-xl flex items-center gap-3 text-red-300 text-sm text-left">
            <AlertTriangle size={24} className="shrink-0" />
            <p>{error}</p>
          </div>
        )}

        <div className="mt-10 text-slate-600 text-xs">
          <p>Local Storage data stays in this browser.</p>
          <p>Files allow you to move data between devices.</p>
        </div>
      </div>
    </div>
  );
};

export default FileStartup;