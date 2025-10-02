import React from 'react';
import { SparklesIcon } from './icons/SparklesIcon';

interface SeoCardProps {
  title: string;
  description: string;
  isLoading: boolean;
  onGenerate: () => void;
  children: React.ReactNode;
  generationCount: number;
}

export const SeoCard: React.FC<SeoCardProps> = ({
  title,
  description,
  isLoading,
  onGenerate,
  children,
  generationCount
}) => {
  return (
    <div className="bg-slate-800/50 p-6 rounded-2xl shadow-lg border border-slate-700">
      <div className="flex flex-col sm:flex-row justify-between sm:items-start gap-4">
        <div>
          <h3 className="text-xl font-bold text-cyan-400">{title}</h3>
          <p className="text-slate-400 mt-1 max-w-lg">{description}</p>
        </div>
        <button
          onClick={onGenerate}
          disabled={isLoading}
          className="w-full sm:w-auto flex-shrink-0 flex items-center justify-center gap-2 px-5 py-2.5 border border-transparent text-sm font-medium rounded-md text-white bg-cyan-600 hover:bg-cyan-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-900 focus:ring-cyan-500 disabled:bg-slate-600 disabled:cursor-not-allowed transition-all duration-200"
        >
          {isLoading ? (
            <>
              <svg className="animate-spin -ml-1 mr-2 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Đang tạo...
            </>
          ) : (
            <>
              <SparklesIcon className="w-5 h-5" />
              {generationCount > 0 ? 'Tạo thêm' : 'Tạo'}
            </>
          )}
        </button>
      </div>
      <div className="mt-6">
        {isLoading && (
            <div className="space-y-3 animate-pulse">
                <div className="h-10 bg-slate-700 rounded-md"></div>
                <div className="h-10 bg-slate-700 rounded-md w-5/6"></div>
                <div className="h-10 bg-slate-700 rounded-md w-3/4"></div>
            </div>
        )}
        {!isLoading && children}
      </div>
    </div>
  );
};