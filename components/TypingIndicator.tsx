import React from 'react';

export const TypingIndicator: React.FC = () => {
    return (
        <div className="flex gap-3 justify-start items-center">
            <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-cyan-500 to-fuchsia-500 flex-shrink-0"></div>
            <div className="flex items-center space-x-1 p-3 rounded-lg bg-slate-700">
                <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '0s' }}></div>
                <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
            </div>
        </div>
    );
};
