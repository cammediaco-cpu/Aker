import React, { useState, useCallback } from 'react';
import type { StoryScene, ConsistencyGuide } from '../../types';
import { 
    generateSeoTitles, 
    generateSeoDescription,
    generateSeoTags,
    generateImprovedThumbnailTexts,
    generateThumbnailPrompts
} from '../../services/geminiService';
import { SeoCard } from '../SeoCard';
import { CopyIcon } from '../icons/CopyIcon';
import { CheckIcon } from '../icons/CheckIcon';
import { SparklesIcon } from '../icons/SparklesIcon';

interface SeoTabProps {
  story: StoryScene[];
  consistencyGuide: ConsistencyGuide | null;
  isReady: boolean;
}

type LoadingKeys = 'titles' | 'description' | 'tags' | 'thumbnails';

interface ThumbnailData {
    originalText: string;
    improvedText: string;
    prompt: string;
}

export const SeoTab: React.FC<SeoTabProps> = ({ story, consistencyGuide, isReady }) => {
    const [titles, setTitles] = useState<string[]>([]);
    const [descriptions, setDescriptions] = useState<string[]>([]);
    const [tagsList, setTagsList] = useState<string[]>([]);
    const [thumbnailData, setThumbnailData] = useState<ThumbnailData[]>([]);
    const [thumbnailTexts, setThumbnailTexts] = useState<string[]>(['', '', '']);
    
    const [loading, setLoading] = useState<Record<LoadingKeys, boolean>>({
        titles: false,
        description: false,
        tags: false,
        thumbnails: false,
    });
    const [generationCount, setGenerationCount] = useState<Record<LoadingKeys, number>>({
        titles: 0,
        description: 0,
        tags: 0,
        thumbnails: 0,
    });
    
    const [copiedKey, setCopiedKey] = useState<string | null>(null);

    const handleCopy = (key: string, text: string) => {
        navigator.clipboard.writeText(text).then(() => {
            setCopiedKey(key);
            setTimeout(() => setCopiedKey(null), 2000);
        });
    };

    const handleThumbnailTextChange = (index: number, value: string) => {
        const newTexts = [...thumbnailTexts];
        newTexts[index] = value;
        setThumbnailTexts(newTexts);
    };

    const handleGenerate = useCallback(async (type: LoadingKeys) => {
        if (!consistencyGuide) return;
        setLoading(prev => ({ ...prev, [type]: true }));
        try {
            switch (type) {
                case 'titles':
                    const newTitles = await generateSeoTitles(story, consistencyGuide);
                    setTitles(prev => [...prev, ...newTitles]);
                    break;
                case 'description':
                    const newDescription = await generateSeoDescription(story, consistencyGuide);
                    setDescriptions(prev => [...prev, newDescription]);
                    break;
                case 'tags':
                    const newTags = await generateSeoTags(story, consistencyGuide);
                    setTagsList(prev => [...prev, newTags]);
                    break;
                case 'thumbnails':
                    const improvedTexts = await generateImprovedThumbnailTexts(story, consistencyGuide, thumbnailTexts);
                    const newPrompts = await generateThumbnailPrompts(story, consistencyGuide, improvedTexts);
                    const newData = newPrompts.map((prompt, index) => ({
                        originalText: thumbnailTexts[index],
                        improvedText: improvedTexts[index],
                        prompt: prompt,
                    }));
                    setThumbnailData(prev => [...prev, ...newData]);
                    break;
            }
            setGenerationCount(prev => ({ ...prev, [type]: prev[type] + 1 }));
        } catch (error) {
            console.error(`Error generating ${type}:`, error);
            alert(`Failed to generate ${type}. Please try again.`);
        } finally {
            setLoading(prev => ({ ...prev, [type]: false }));
        }
    }, [story, consistencyGuide, thumbnailTexts]);

    if (!isReady) {
        return (
            <div className="text-center py-16 text-slate-500">
                <p>Vui lòng hoàn thành việc tạo kịch bản ở tab "Xem Kịch Bản" trước.</p>
                <p>Sau đó, bạn có thể sử dụng các công cụ SEO tại đây.</p>
            </div>
        );
    }

    return (
        <div className="space-y-8 animate-fade-in">
            <SeoCard
                title="Tạo Tiêu Đề (Tiếng Anh)"
                description="Tạo 3 tiêu đề hấp dẫn, chuẩn SEO cho video YouTube của bạn."
                isLoading={loading.titles}
                onGenerate={() => handleGenerate('titles')}
                generationCount={generationCount.titles}
            >
                {titles.length > 0 && (
                    <ul className="space-y-3">
                        {titles.map((title, index) => (
                            <li key={index} className="flex items-start gap-3 p-3 bg-slate-900 rounded-md border border-slate-700">
                                <span className="flex-grow text-slate-300">{title}</span>
                                <button onClick={() => handleCopy(`title-${index}`, title)} className="p-1 rounded-md hover:bg-slate-700 transition-colors text-slate-400">
                                    {copiedKey === `title-${index}` ? <CheckIcon className="w-5 h-5 text-green-400" /> : <CopyIcon className="w-5 h-5" />}
                                </button>
                            </li>
                        ))}
                    </ul>
                )}
            </SeoCard>

            <SeoCard
                title="Tạo Mô Tả Video (Tiếng Anh)"
                description="Tạo một mô tả chi tiết, cuốn hút và chứa từ khóa cho video."
                isLoading={loading.description}
                onGenerate={() => handleGenerate('description')}
                generationCount={generationCount.description}
            >
                {descriptions.length > 0 && (
                     <ul className="space-y-3">
                        {descriptions.map((desc, index) => (
                            <li key={index} className="flex items-start gap-3 p-4 bg-slate-900 rounded-md border border-slate-700">
                                <p className="flex-grow text-slate-300 whitespace-pre-wrap">{desc}</p>
                                <button onClick={() => handleCopy(`description-${index}`, desc)} className="p-1 rounded-md hover:bg-slate-700 transition-colors text-slate-400 flex-shrink-0 mt-1">
                                    {copiedKey === `description-${index}` ? <CheckIcon className="w-5 h-5 text-green-400" /> : <CopyIcon className="w-5 h-5" />}
                                </button>
                            </li>
                        ))}
                    </ul>
                )}
            </SeoCard>
            
            <SeoCard
                title="Tạo Thẻ Tag"
                description="Tạo danh sách các thẻ tag phù hợp để tăng khả năng tìm thấy video."
                isLoading={loading.tags}
                onGenerate={() => handleGenerate('tags')}
                generationCount={generationCount.tags}
            >
                {tagsList.length > 0 && (
                     <ul className="space-y-3">
                        {tagsList.map((tags, index) => (
                             <li key={index} className="flex items-start gap-3 p-4 bg-slate-900 rounded-md border border-slate-700">
                                <p className="flex-grow text-slate-300 break-words">{tags.split(',').join(', ')}</p>
                                <button onClick={() => handleCopy(`tags-${index}`, tags)} className="p-1 rounded-md hover:bg-slate-700 transition-colors text-slate-400 flex-shrink-0 mt-1">
                                    {copiedKey === `tags-${index}` ? <CheckIcon className="w-5 h-5 text-green-400" /> : <CopyIcon className="w-5 h-5" />}
                                </button>
                            </li>
                        ))}
                    </ul>
                )}
            </SeoCard>

            {/* Custom Thumbnail Generation Card */}
            <div className="bg-slate-800/50 p-6 rounded-2xl shadow-lg border border-slate-700">
                <div className="flex flex-col sm:flex-row justify-between sm:items-start gap-4">
                    <div>
                        <h3 className="text-xl font-bold text-cyan-400">Tạo Prompt Cho Thumbnail (16:9)</h3>
                        <p className="text-slate-400 mt-1 max-w-lg">Tạo 3 prompt chi tiết, có bố cục tối ưu cho text bạn nhập, để dùng với các AI tạo ảnh.</p>
                    </div>
                    <button
                        onClick={() => handleGenerate('thumbnails')}
                        disabled={loading.thumbnails}
                        className="w-full sm:w-auto flex-shrink-0 flex items-center justify-center gap-2 px-5 py-2.5 border border-transparent text-sm font-medium rounded-md text-white bg-cyan-600 hover:bg-cyan-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-900 focus:ring-cyan-500 disabled:bg-slate-600 disabled:cursor-not-allowed transition-all duration-200"
                    >
                        {loading.thumbnails ? (
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
                                {generationCount.thumbnails > 0 ? 'Tạo thêm' : 'Tạo'}
                            </>
                        )}
                    </button>
                </div>
                <div className="mt-6 space-y-3">
                    {thumbnailTexts.map((text, index) => (
                        <input
                            key={index}
                            type="text"
                            placeholder={`Nhập text cho thumbnail ${index + 1} (tùy chọn)`}
                            value={text}
                            onChange={(e) => handleThumbnailTextChange(index, e.target.value)}
                            disabled={loading.thumbnails}
                            className="w-full bg-slate-900 border border-slate-700 rounded-md px-3 py-2 text-slate-300 focus:ring-cyan-500 focus:border-cyan-500 transition placeholder-slate-500 disabled:opacity-50"
                        />
                    ))}
                </div>
                <div className="mt-6">
                    {loading.thumbnails && (
                        <div className="space-y-3 animate-pulse">
                            <div className="h-10 bg-slate-700 rounded-md"></div>
                            <div className="h-10 bg-slate-700 rounded-md w-5/6"></div>
                            <div className="h-10 bg-slate-700 rounded-md w-3/4"></div>
                        </div>
                    )}
                    {!loading.thumbnails && thumbnailData.length > 0 && (
                        <ul className="space-y-4">
                            {thumbnailData.map((data, index) => (
                                <li key={index} className="p-4 bg-slate-900 rounded-md border border-slate-700">
                                    {data.originalText && (
                                        <p className="text-slate-400 mb-1 text-sm">
                                            <span className="font-semibold text-slate-300">Text Gốc:</span> "{data.originalText}"
                                        </p>
                                    )}
                                    <p className="text-cyan-300 mb-3 text-lg font-bold">
                                        <span className="font-semibold text-cyan-200">Text Gợi ý (AI):</span> "{data.improvedText}"
                                    </p>
                                    <div className="flex items-start gap-3 border-t border-slate-700 pt-3 mt-3">
                                        <p className="flex-grow text-slate-300 font-mono text-sm">{data.prompt}</p>
                                        <button onClick={() => handleCopy(`prompt-${index}`, data.prompt)} className="p-1 rounded-md hover:bg-slate-700 transition-colors text-slate-400 flex-shrink-0 mt-1">
                                            {copiedKey === `prompt-${index}` ? <CheckIcon className="w-5 h-5 text-green-400" /> : <CopyIcon className="w-5 h-5" />}
                                        </button>
                                    </div>
                                </li>
                            ))}
                        </ul>
                    )}
                </div>
            </div>
        </div>
    );
};