import React from 'react';
import { FilmIcon } from './icons/FilmIcon';
import { KeyIcon } from './icons/KeyIcon';

interface HeaderProps {
  onChangeApiKey: () => void;
}

export const Header: React.FC<HeaderProps> = ({ onChangeApiKey }) => {
  return (
    <header className="py-4 border-b border-slate-800">
      <div className="container mx-auto px-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <FilmIcon className="w-10 h-10 text-cyan-400" />
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight bg-gradient-to-r from-cyan-400 to-fuchsia-500 text-transparent bg-clip-text">
            Trình bào Prompt AI VEO 3
          </h1>
        </div>
        <button 
          onClick={onChangeApiKey}
          className="flex items-center gap-2 px-3 py-2 bg-slate-700 hover:bg-slate-600 text-slate-300 hover:text-white font-semibold rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-900 focus:ring-cyan-500"
          title="Thay đổi API Key"
          aria-label="Thay đổi API Key"
        >
          <KeyIcon className="w-5 h-5" />
          <span className="hidden sm:inline">API Key</span>
        </button>
      </div>
    </header>
  );
};