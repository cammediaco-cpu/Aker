import React from 'react';
import type { GeneratorState } from '../../types';
import { Loader } from '../Loader';
import { ResultsTable } from '../ResultsTable';
import { StopIcon } from '../icons/StopIcon';
import { SparklesIcon } from '../icons/SparklesIcon';
import { RefreshCwIcon } from '../icons/RefreshCwIcon';

interface ScriptTabProps {
    state: GeneratorState;
    onCancel: () => void;
    onReset: () => void;
    onContinueToGuide: () => void;
    onContinueToPrompts: () => void;
}

const isGenerating = (step: string) => step.startsWith('generating');

export const ScriptTab: React.FC<ScriptTabProps> = ({ 
    state, 
    onCancel, 
    onReset, 
    onContinueToGuide, 
    onContinueToPrompts 
}) => {
    const { step, progress, stepMessage, error, story, consistencyGuide, results } = state;

    if (step === 'idle') {
        return (
            <div className="text-center py-16 text-slate-500">
                <p>Bắt đầu bằng cách phác thảo ý tưởng ở tab bên cạnh.</p>
                <p>Sau khi tạo, kịch bản chi tiết của bạn sẽ xuất hiện ở đây.</p>
            </div>
        );
    }

    if (step === 'error') {
        return (
            <div className="mt-8 bg-red-900/50 border border-red-700 text-red-300 px-4 py-3 rounded-lg text-center" role="alert">
                <p className="font-bold">Lỗi!</p>
                <p className="text-sm">{error}</p>
                <button onClick={onReset} className="mt-4 flex items-center justify-center mx-auto gap-2 px-4 py-2 bg-slate-600 hover:bg-slate-700 text-white font-semibold rounded-md transition-colors">
                    <RefreshCwIcon className="w-4 h-4" />
                    Thử lại từ đầu
                </button>
            </div>
        );
    }

    return (
        <div className="space-y-12">
            {/* Step 1: Story Results */}
            {story.length > 0 && (
                <section className="animate-fade-in">
                    <h2 className="text-2xl font-bold mb-4 text-cyan-400 border-b-2 border-slate-700 pb-2">Bước 1: Cốt truyện đã tạo</h2>
                    <div className="bg-slate-800/50 p-4 rounded-lg border border-slate-700 space-y-3 max-h-96 overflow-y-auto">
                        {story.map(scene => (
                            <p key={scene.sceneNumber} className="text-slate-300">
                                <span className="font-bold text-cyan-300">Cảnh {scene.sceneNumber}:</span> {scene.description}
                            </p>
                        ))}
                    </div>
                </section>
            )}

            {/* Step 2: Consistency Guide Results */}
            {consistencyGuide && (
                 <section className="animate-fade-in">
                    <h2 className="text-2xl font-bold mb-4 text-cyan-400 border-b-2 border-slate-700 pb-2">Bước 2: Hướng dẫn nhất quán</h2>
                    <div className="bg-slate-800/50 p-6 rounded-lg border border-slate-700 space-y-4">
                        <div>
                            <h3 className="font-semibold text-lg text-cyan-300">Characters & Appearance</h3>
                            <p className="text-slate-300 whitespace-pre-wrap">{consistencyGuide.charactersAndAppearance}</p>
                        </div>
                         <div>
                            <h3 className="font-semibold text-lg text-cyan-300">Setting & Mood</h3>
                            <p className="text-slate-300 whitespace-pre-wrap">{consistencyGuide.settingAndMood}</p>
                        </div>
                         <div>
                            <h3 className="font-semibold text-lg text-cyan-300">Key Objects & Style</h3>
                            <p className="text-slate-300 whitespace-pre-wrap">{consistencyGuide.keyObjectsAndStyle}</p>
                        </div>
                    </div>
                </section>
            )}
            
            {/* Final Result: Prompts Table */}
            {results.length > 0 && (
                 <section className="animate-fade-in">
                    <h2 className="text-2xl font-bold mb-6 text-cyan-400 border-b-2 border-slate-700 pb-2">Bước 3: Kịch bản và Prompts chi tiết</h2>
                    <ResultsTable results={results} />
                </section>
            )}

            {/* Loader & Progress */}
            {isGenerating(step) && (
                <>
                    <Loader progress={progress} message={stepMessage} />
                    <div className="text-center mt-4">
                        <button
                            onClick={onCancel}
                            className="flex items-center justify-center mx-auto gap-2 px-6 py-2 bg-red-600 hover:bg-red-700 text-white font-semibold rounded-md transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-900 focus:ring-red-500"
                            aria-label="Dừng quá trình tạo kịch bản"
                        >
                            <StopIcon className="w-5 h-5" />
                            Dừng Tạo Kịch Bản
                        </button>
                    </div>
                </>
            )}

            {/* Action Buttons for non-generating states */}
            {!isGenerating(step) && (
                <div className="flex items-center justify-center gap-4 pt-4">
                     <button onClick={onReset} className="flex items-center justify-center gap-2 px-6 py-2 bg-slate-600 hover:bg-slate-700 text-white font-semibold rounded-md transition-all duration-200">
                        <RefreshCwIcon className="w-5 h-5" />
                        Làm lại từ đầu
                    </button>
                    {step === 'story_complete' && (
                        <button onClick={onContinueToGuide} className="flex items-center justify-center gap-2 px-6 py-2 bg-cyan-600 hover:bg-cyan-700 text-white font-bold rounded-md transition-all duration-200">
                           Tiếp tục & Phân tích
                        </button>
                    )}
                    {step === 'guide_complete' && (
                        <button onClick={onContinueToPrompts} className="flex items-center justify-center gap-2 px-6 py-3 bg-fuchsia-600 hover:bg-fuchsia-700 text-white font-bold rounded-md transition-all duration-200 text-lg shadow-lg">
                            <SparklesIcon className="w-6 h-6"/>
                            Tạo Prompts cuối cùng
                        </button>
                    )}
                </div>
            )}
        </div>
    );
};