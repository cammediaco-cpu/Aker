
import React, { useState, useRef, useCallback, useEffect } from 'react';
import type { ChatMessage, ImagePart } from '../../types';
import { getChatResponse } from '../../services/geminiService';
import { SparklesIcon } from '../icons/SparklesIcon';
import { PlusIcon } from '../icons/PlusIcon';
import { SendIcon } from '../icons/SendIcon';
import { XCircleIcon } from '../icons/XCircleIcon';
import { TypingIndicator } from '../TypingIndicator';

interface IdeaTabProps {
  onSubmit: () => void;
  isLoading: boolean;
  messages: ChatMessage[];
  setMessages: React.Dispatch<React.SetStateAction<ChatMessage[]>>;
  minutes: number;
  setMinutes: (value: number) => void;
  seconds: number;
  setSeconds: (value: number) => void;
  aspectRatio: string;
  setAspectRatio: (value: string) => void;
  generateImagePrompts: boolean;
  setGenerateImagePrompts: (value: boolean) => void;
  isApiKeySet: boolean;
  onRequestApiKey: () => void;
}

const fileToBase64 = (file: File): Promise<ImagePart> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => {
      const result = reader.result as string;
      const base64Data = result.split(',')[1];
      resolve({ mimeType: file.type, data: base64Data });
    };
    reader.onerror = error => reject(error);
  });
};

export const IdeaTab: React.FC<IdeaTabProps> = ({ 
  onSubmit, 
  isLoading,
  messages,
  setMessages,
  minutes,
  setMinutes,
  seconds,
  setSeconds,
  aspectRatio,
  setAspectRatio,
  generateImagePrompts,
  setGenerateImagePrompts,
  isApiKeySet,
  onRequestApiKey
}) => {
  const [currentMessage, setCurrentMessage] = useState('');
  const [pendingImages, setPendingImages] = useState<ImagePart[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [isAiTyping, setIsAiTyping] = useState(false);
  const [generationOffer, setGenerationOffer] = useState<boolean>(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isAiTyping]);
  
  const handleImageUpload = useCallback(async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    try {
      const imagePromises = Array.from(files)
        .filter(file => file.type.startsWith('image/'))
        .map(fileToBase64);
      const imageParts = await Promise.all(imagePromises);
      setPendingImages(prev => [...prev, ...imageParts]);
    } catch (error) {
      console.error("Lỗi xử lý hình ảnh:", error);
    }
  }, []);

  const handleFormSubmit = useCallback((e?: React.FormEvent) => {
    e?.preventDefault();
    if (!isApiKeySet) {
      onRequestApiKey();
      return;
    }
    if (messages.filter(m => m.role === 'user').length === 0) {
      alert("Vui lòng bắt đầu cuộc trò chuyện để mô tả ý tưởng của bạn trước.");
      return;
    }
    const totalSeconds = (minutes * 60) + seconds;
    if (totalSeconds <= 0) {
      alert("Vui lòng nhập thời lượng video hợp lệ.");
      return;
    }
    onSubmit();
  }, [isApiKeySet, onRequestApiKey, messages, minutes, seconds, onSubmit]);

  const handleSendMessage = async () => {
    if (!isApiKeySet) {
      onRequestApiKey();
      return;
    }
    if (isLoading || isAiTyping || (!currentMessage.trim() && pendingImages.length === 0)) return;

    const userMessage: ChatMessage = {
      role: 'user',
      text: currentMessage.trim(),
      images: pendingImages.length > 0 ? pendingImages : undefined,
    };

    const newMessages = [...messages, userMessage];
    setMessages(newMessages);
    setCurrentMessage('');
    setPendingImages([]);
    setIsAiTyping(true);

    try {
      const { text: aiResponseText, functionCall } = await getChatResponse(newMessages);
      
      const aiResponseMessage: ChatMessage = { role: 'ai', text: aiResponseText };
      if (functionCall?.name === 'offerToGenerateScript') {
         aiResponseMessage.text = "Có vẻ chúng ta đã có một nền tảng tuyệt vời rồi. Bạn có muốn tôi bắt đầu tạo kịch bản chi tiết ngay bây giờ không?";
         setGenerationOffer(true);
      }

      setMessages(prev => [...prev, aiResponseMessage]);
    } catch (error) {
      console.error("Lỗi khi nhận phản hồi từ AI:", error);
      setMessages(prev => [...prev, { role: 'ai', text: "Xin lỗi, tôi đang gặp chút sự cố. Vui lòng thử lại." }]);
    } finally {
      setIsAiTyping(false);
    }
  };
  
  const handleOfferResponse = (agreed: boolean) => {
    setGenerationOffer(false);
    if (agreed) {
        setMessages(prev => [...prev, { role: 'user', text: "Tuyệt vời, bắt đầu thôi!" }]);
        // Delay slightly to let state update before submitting
        setTimeout(() => handleFormSubmit(), 100);
    } else {
        const userMessage: ChatMessage = { role: 'user', text: "Chưa, hãy thảo luận thêm." };
        const aiMessage: ChatMessage = { role: 'ai', text: "Được thôi! Chúng ta có thể điều chỉnh thêm. Bạn muốn tập trung vào khía cạnh nào tiếp theo?" };
        setMessages(prev => [...prev, userMessage, aiMessage]);
    }
  };


  const handleDragEvents = (e: React.DragEvent<HTMLDivElement>, isEntering: boolean) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(isEntering);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    handleDragEvents(e, false);
    handleImageUpload(e.dataTransfer.files);
  };

  const handlePaste = async (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
    handleImageUpload(e.clipboardData.files);
  };

  const hasUserChatted = messages.filter(m => m.role === 'user').length > 0;

  return (
    <div className="bg-slate-800/50 p-6 sm:p-8 rounded-2xl shadow-2xl border border-slate-700">
      <div className="flex flex-col md:flex-row gap-8">
        {/* Chat Section */}
        <div 
            className="flex-grow flex flex-col h-[60vh] bg-slate-900 rounded-lg border border-slate-700 relative"
            onDragEnter={(e) => handleDragEvents(e, true)}
        >
            {isDragging && (
                <div 
                    className="absolute inset-0 bg-cyan-500/20 border-2 border-dashed border-cyan-400 rounded-lg flex items-center justify-center z-10"
                    onDragLeave={(e) => handleDragEvents(e, false)}
                    onDrop={handleDrop}
                >
                    <p className="text-cyan-300 font-bold text-lg">Thả ảnh vào đây</p>
                </div>
            )}
            <div className="flex-grow p-4 overflow-y-auto space-y-4">
                {messages.map((msg, index) => (
                    <div key={index} className={`flex gap-3 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                        {msg.role === 'ai' && <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-cyan-500 to-fuchsia-500 flex-shrink-0 mt-1"></div>}
                        <div className={`max-w-md p-3 rounded-lg ${msg.role === 'user' ? 'bg-cyan-800/70' : 'bg-slate-700'}`}>
                           {msg.images && (
                               <div className="grid grid-cols-2 gap-2 mb-2">
                                   {msg.images.map((img, i) => (
                                       <img key={i} src={`data:${img.mimeType};base64,${img.data}`} alt="uploaded content" className="rounded-md object-cover"/>
                                   ))}
                               </div>
                           )}
                           <p className="text-slate-200 whitespace-pre-wrap">{msg.text}</p>
                        </div>
                    </div>
                ))}
                {isAiTyping && <TypingIndicator />}
                {generationOffer && (
                    <div className="flex justify-end gap-2 p-2 animate-fade-in">
                        <button onClick={() => handleOfferResponse(true)} className="px-4 py-2 bg-cyan-600 hover:bg-cyan-700 text-white font-semibold rounded-lg transition-colors">
                            Có, tạo kịch bản
                        </button>
                        <button onClick={() => handleOfferResponse(false)} className="px-4 py-2 bg-slate-600 hover:bg-slate-700 text-white font-semibold rounded-lg transition-colors">
                            Thảo luận thêm
                        </button>
                    </div>
                )}
                <div ref={chatEndRef}></div>
            </div>
            <div className="p-4 border-t border-slate-700">
                {pendingImages.length > 0 && (
                    <div className="flex gap-2 mb-2 flex-wrap">
                        {pendingImages.map((img, i) => (
                            <div key={i} className="relative">
                                <img src={`data:${img.mimeType};base64,${img.data}`} className="h-16 w-16 object-cover rounded-md"/>
                                <button onClick={() => setPendingImages(p => p.filter((_, idx) => idx !== i))} className="absolute -top-1 -right-1 bg-slate-800 rounded-full text-red-400 hover:text-red-300">
                                    <XCircleIcon className="w-5 h-5"/>
                                </button>
                            </div>
                        ))}
                    </div>
                )}
                <div className="flex items-center gap-2">
                    <button
                        onClick={() => fileInputRef.current?.click()}
                        className="p-2 text-slate-400 hover:text-cyan-400 transition-colors rounded-full bg-slate-800 hover:bg-slate-700 disabled:opacity-50"
                        aria-label="Đính kèm ảnh"
                        title="Đính kèm ảnh"
                        disabled={generationOffer || isAiTyping || isLoading}
                    >
                        <PlusIcon className="w-6 h-6"/>
                    </button>
                    <input type="file" multiple accept="image/*" ref={fileInputRef} onChange={e => handleImageUpload(e.target.files)} className="hidden"/>
                    <textarea
                        rows={1}
                        className="flex-grow bg-slate-800 border border-slate-600 rounded-full px-4 py-2 focus:ring-cyan-500 focus:border-cyan-500 transition placeholder-slate-500 resize-none"
                        placeholder={!isApiKeySet ? "Vui lòng nhập API Key để bắt đầu..." : (generationOffer ? "Vui lòng chọn một tùy chọn ở trên..." : "Nhập tin nhắn hoặc dán ảnh...")}
                        value={currentMessage}
                        onChange={e => setCurrentMessage(e.target.value)}
                        onKeyDown={e => {if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSendMessage(); }}}
                        onPaste={handlePaste}
                        disabled={isAiTyping || isLoading || generationOffer}
                    />
                    <button onClick={handleSendMessage} disabled={isLoading || isAiTyping || (!currentMessage.trim() && pendingImages.length === 0) || generationOffer} className="p-2 text-white bg-cyan-600 hover:bg-cyan-700 rounded-full disabled:bg-slate-600 transition-colors" aria-label="Gửi tin nhắn">
                        <SendIcon className="w-6 h-6"/>
                    </button>
                </div>
            </div>
        </div>

        {/* Controls Section */}
        <form onSubmit={handleFormSubmit} className="space-y-6 md:w-64 flex-shrink-0">
            <div>
              <label className="block text-sm font-medium mb-2 text-slate-300">Thời lượng video</label>
              <div className="flex items-center space-x-2">
                <input
                  type="number"
                  min="0"
                  max="59"
                  value={minutes}
                  onChange={(e) => setMinutes(parseInt(e.target.value, 10) || 0)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-md px-3 py-2 text-center focus:ring-cyan-500 focus:border-cyan-500 transition"
                  aria-label="Phút"
                />
                <span className="text-slate-400">:</span>
                <input
                  type="number"
                  min="0"
                  max="59"
                  value={seconds}
                  onChange={(e) => setSeconds(parseInt(e.target.value, 10) || 0)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-md px-3 py-2 text-center focus:ring-cyan-500 focus:border-cyan-500 transition"
                  aria-label="Giây"
                />
              </div>
            </div>

            <div>
              <label htmlFor="aspectRatio" className="block text-sm font-medium mb-2 text-slate-300">
                Tỉ lệ khung hình
              </label>
              <select
                id="aspectRatio"
                value={aspectRatio}
                onChange={(e) => setAspectRatio(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded-md px-3 py-2 focus:ring-cyan-500 focus:border-cyan-500 transition"
              >
                <option>16:9 (Ngang)</option>
                <option>9:16 (Dọc)</option>
              </select>
            </div>
            
            <div className="relative flex items-start pt-2">
                <div className="flex h-6 items-center">
                    <input
                        id="generateImagePrompts"
                        aria-describedby="generateImagePrompts-description"
                        name="generateImagePrompts"
                        type="checkbox"
                        checked={generateImagePrompts}
                        onChange={(e) => setGenerateImagePrompts(e.target.checked)}
                        className="h-4 w-4 rounded border-slate-600 bg-slate-800 text-cyan-600 focus:ring-cyan-600"
                    />
                </div>
                <div className="ml-3 text-sm leading-6">
                    <label htmlFor="generateImagePrompts" className="font-medium text-slate-300 cursor-pointer">
                        Tạo prompt hình ảnh
                    </label>
                    <p id="generateImagePrompts-description" className="text-slate-500 text-xs">
                        Tạo một prompt ảnh cho khung hình bắt đầu của mỗi cảnh.
                    </p>
                </div>
            </div>
          
            <div className="pt-2">
              <button
                type="submit"
                disabled={isLoading || isAiTyping || !hasUserChatted}
                className="w-full flex items-center justify-center gap-2 px-6 py-3 border border-transparent text-base font-medium rounded-md text-white bg-cyan-600 hover:bg-cyan-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-800 focus:ring-cyan-500 disabled:bg-slate-600 disabled:cursor-not-allowed transition-all duration-300"
                title={!hasUserChatted ? "Vui lòng trò chuyện với AI để phác thảo ý tưởng trước" : "Tạo kịch bản từ cuộc trò chuyện"}
              >
                {isLoading ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Đang xử lý...
                  </>
                ) : (
                  <>
                    <SparklesIcon className="w-5 h-5" />
                    Tạo Kịch Bản
                  </>
                )}
              </button>
            </div>
        </form>
      </div>
    </div>
  );
};
