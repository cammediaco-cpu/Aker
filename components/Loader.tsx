import React from 'react';

interface LoaderProps {
  progress: number;
  message: string;
}

export const Loader: React.FC<LoaderProps> = ({ progress, message }) => {
  return (
    <div className="flex flex-col items-center justify-center my-12 space-y-4" aria-live="polite">
        <div className="w-16 h-16 border-4 border-dashed rounded-full animate-spin border-cyan-500"></div>
        <div className="w-full max-w-md text-center">
            <p className="text-slate-300 font-semibold mb-2">
                {message}
            </p>
            <div className="w-full bg-slate-700 rounded-full h-2.5">
                <div 
                    className="bg-cyan-500 h-2.5 rounded-full transition-all duration-500 ease-out" 
                    style={{ width: `${progress}%` }}
                ></div>
            </div>
            <p className="text-sm font-medium text-cyan-300 mt-1">{progress}%</p>
        </div>
    </div>
  );
};
