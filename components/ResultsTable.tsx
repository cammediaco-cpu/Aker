
import React, { useState } from 'react';
import type { PromptResult, VideoPromptDetails } from '../../types';
import { CopyIcon } from './icons/CopyIcon';
import { CheckIcon } from './icons/CheckIcon';
import { ChevronDownIcon } from './icons/ChevronDownIcon';

interface ResultsTableProps {
  results: PromptResult[];
}

export const ResultsTable: React.FC<ResultsTableProps> = ({ results }) => {
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const [copiedImagePromptIndex, setCopiedImagePromptIndex] = useState<number | null>(null);
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null);

  const handleCopy = (e: React.MouseEvent, promptObject: VideoPromptDetails, index: number) => {
    e.stopPropagation(); // Ngăn sự kiện click lan ra thẻ <tr> để không bị toggle expand
    const textToCopy = JSON.stringify(promptObject, null, 2);
    navigator.clipboard.writeText(textToCopy).then(() => {
      setCopiedIndex(index);
      setTimeout(() => setCopiedIndex(null), 2000);
    });
  };

  const handleImagePromptCopy = (e: React.MouseEvent, textToCopy: string, index: number) => {
    e.stopPropagation();
    navigator.clipboard.writeText(textToCopy).then(() => {
      setCopiedImagePromptIndex(index);
      setTimeout(() => setCopiedImagePromptIndex(null), 2000);
    });
  };


  const toggleExpand = (index: number) => {
    setExpandedIndex(prevIndex => (prevIndex === index ? null : index));
  };

  const formatJsonObject = (promptObject: VideoPromptDetails) => {
    return JSON.stringify(promptObject, null, 2);
  }

  return (
    <div className="overflow-x-auto bg-slate-800/50 border border-slate-700 rounded-lg shadow-lg">
      <table className="min-w-full divide-y divide-slate-700">
        <thead className="bg-slate-800">
          <tr>
            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-cyan-300 uppercase tracking-wider w-16">
              STT
            </th>
            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-cyan-300 uppercase tracking-wider">
              Phân Cảnh
            </th>
            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-cyan-300 uppercase tracking-wider">
              Video Prompt (JSON - English)
            </th>
            <th scope="col" className="px-6 py-3 text-center text-xs font-medium text-cyan-300 uppercase tracking-wider w-28">
              Hành Động
            </th>
          </tr>
        </thead>
        <tbody className="bg-slate-800 divide-y divide-slate-700">
          {results.map((result, index) => (
            <tr 
              key={index}
              onClick={() => toggleExpand(index)}
              className="hover:bg-slate-700/50 transition-colors duration-200 cursor-pointer"
            >
              <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-slate-300 text-center align-top">
                {index + 1}
              </td>
              <td className="px-6 py-4 text-sm text-slate-300 max-w-xs align-top">
                {result.phanCanh}
              </td>
              <td className="px-6 py-4 text-sm text-slate-400 font-mono align-top">
                <div className="flex justify-between items-start">
                  <div className="flex-grow pr-4">
                    {expandedIndex === index ? (
                      <>
                        <pre className="whitespace-pre-wrap break-all bg-slate-900/70 p-3 rounded-md text-xs">{formatJsonObject(result.videoPrompt)}</pre>
                        {result.videoPrompt.starting_image_prompt && (
                            <div className="mt-4 border-t border-slate-600 pt-3">
                                <h4 className="text-xs font-semibold text-cyan-300 uppercase tracking-wider mb-2">Prompt Hình Ảnh Bắt Đầu</h4>
                                <div className="flex items-start gap-3 p-3 bg-slate-900/70 rounded-md">
                                    <p className="flex-grow text-slate-300 font-mono text-xs break-words">{result.videoPrompt.starting_image_prompt}</p>
                                    <button
                                        onClick={(e) => handleImagePromptCopy(e, result.videoPrompt.starting_image_prompt!, index)}
                                        className="flex-shrink-0 inline-flex items-center gap-1.5 text-cyan-400 hover:text-cyan-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-900 focus:ring-cyan-500 rounded-md p-1 transition-colors duration-200 text-xs"
                                        title="Copy image prompt"
                                    >
                                        {copiedImagePromptIndex === index ? (
                                            <>
                                                <CheckIcon className="w-4 h-4 text-green-400" />
                                                <span className="text-green-400">Đã chép</span>
                                            </>
                                        ) : (
                                            <>
                                                <CopyIcon className="w-4 h-4" />
                                                <span>Copy</span>
                                            </>
                                        )}
                                    </button>
                                </div>
                            </div>
                        )}
                      </>
                    ) : (
                      <p className="text-slate-500 italic pt-1">Nhấn để xem chi tiết prompt...</p>
                    )}
                  </div>
                  <ChevronDownIcon 
                    className={`w-5 h-5 text-slate-500 mt-1 flex-shrink-0 transition-transform duration-300 ${expandedIndex === index ? 'rotate-180' : ''}`} 
                  />
                </div>
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-center text-sm font-medium align-top">
                <button
                  // FIX: The handleCopy function expects the event object 'e' as the first argument, but it was missing in the call.
                  onClick={(e) => handleCopy(e, result.videoPrompt, index)}
                  className="inline-flex items-center gap-2 text-cyan-400 hover:text-cyan-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-800 focus:ring-cyan-500 rounded-md p-2 transition-colors duration-200"
                  title="Copy prompt"
                >
                  {copiedIndex === index ? (
                    <>
                      <CheckIcon className="w-5 h-5 text-green-400" />
                      <span className="text-green-400">Đã chép</span>
                    </>
                  ) : (
                    <>
                      <CopyIcon className="w-5 h-5" />
                      <span>Copy</span>
                    </>
                  )}
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};
