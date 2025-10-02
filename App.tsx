
import React, { useState, useEffect } from 'react';
import { Header } from './components/Header';
import { IdeaTab } from './components/tabs/IdeaTab';
import { ScriptTab } from './components/tabs/ScriptTab';
import { SeoTab } from './components/tabs/SeoTab';
import { ApiKeyModal } from './components/ApiKeyModal';
import { useScriptGenerator } from './hooks/useScriptGenerator';
import { initializeGemini, validateApiKey } from './services/geminiService';
import type { ScriptRequest, ChatMessage, ApiKeyEntry } from './types';

type ActiveTab = 'idea' | 'script' | 'seo';

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<ActiveTab>('idea');
  const [apiKeys, setApiKeys] = useState<ApiKeyEntry[]>([]);
  const [activeApiKey, setActiveApiKey] = useState<string | null>(null);
  const [isApiKeyModalOpen, setIsApiKeyModalOpen] = useState(false);

  useEffect(() => {
    try {
      const storedKeysRaw = localStorage.getItem('gemini-api-key-list');
      const storedKeys = storedKeysRaw ? JSON.parse(storedKeysRaw) : [];
      setApiKeys(storedKeys);
      
      const storedActiveKey = localStorage.getItem('gemini-active-api-key');
      if (storedActiveKey) {
        initializeGemini(storedActiveKey);
        setActiveApiKey(storedActiveKey);
      } else if (storedKeys.length === 0) {
        // Nếu không có key nào được lưu, mở modal khi tải lần đầu.
        setIsApiKeyModalOpen(true);
      }
    } catch (error) {
      console.error("Lỗi khi tải API keys từ localStorage:", error);
      // Xóa dữ liệu hỏng để tránh lỗi lặp lại
      localStorage.removeItem('gemini-api-key-list');
      localStorage.removeItem('gemini-active-api-key');
    }
  }, []);
  
  // --- State Lifted Up ---
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([
    { role: 'ai', text: 'Xin chào, tôi là Đạo diễn AI của bạn. Hãy kể cho tôi nghe ý tưởng video của bạn, và chúng ta sẽ cùng nhau biến nó thành một kịch bản hoàn chỉnh nhé!' }
  ]);
  const [minutes, setMinutes] = useState(1);
  const [seconds, setSeconds] = useState(0);
  const [aspectRatio, setAspectRatio] = useState('16:9 (Ngang)');
  const [generateImagePrompts, setGenerateImagePrompts] = useState(false);
  // -------------------------

  const { 
    state, 
    startGeneration, 
    generateConsistencyGuide, 
    generateFinalPrompts, 
    cancelGeneration,
    resetGeneration,
  } = useScriptGenerator();

  const handleSetActiveApiKey = (key: string) => {
    try {
      initializeGemini(key);
      localStorage.setItem('gemini-active-api-key', key);
      setActiveApiKey(key);
      setIsApiKeyModalOpen(false);
    } catch (error) {
       console.error("Failed to set active Gemini API key:", error);
       alert("API key không hợp lệ hoặc đã xảy ra lỗi. Vui lòng thử lại.");
    }
  };
  
  const handleSaveApiKey = async (newKeyData: { name: string; key: string }) => {
    const isValid = await validateApiKey(newKeyData.key);
    if (!isValid) {
      throw new Error("API Key không hợp lệ.");
    }

    const newKeyEntry: ApiKeyEntry = {
        ...newKeyData,
        id: `key_${Date.now()}`
    };
    const updatedKeys = [...apiKeys, newKeyEntry];
    setApiKeys(updatedKeys);
    localStorage.setItem('gemini-api-key-list', JSON.stringify(updatedKeys));
    handleSetActiveApiKey(newKeyEntry.key); // Tự động kích hoạt key mới
  };
  
  const handleDeleteApiKey = (id: string) => {
    const keyToDelete = apiKeys.find(k => k.id === id);
    const updatedKeys = apiKeys.filter(k => k.id !== id);
    setApiKeys(updatedKeys);
    localStorage.setItem('gemini-api-key-list', JSON.stringify(updatedKeys));
    
    // Nếu key bị xóa là key đang hoạt động, hãy vô hiệu hóa nó
    if (keyToDelete && keyToDelete.key === activeApiKey) {
        setActiveApiKey(null);
        localStorage.removeItem('gemini-active-api-key');
    }
  };


  const handleStartGeneration = () => {
    if (!activeApiKey) {
      setIsApiKeyModalOpen(true);
      return;
    }
    const request: ScriptRequest = {
      chatHistory: chatMessages,
      minutes,
      seconds,
      aspectRatio,
      generateImagePrompts,
    };
    // Tự động chuyển tab khi bắt đầu
    setActiveTab('script');
    startGeneration(request);
  };

  const handleReset = () => {
    resetGeneration();
    setChatMessages([
        { role: 'ai', text: 'Xin chào, tôi là Đạo diễn AI của bạn. Hãy kể cho tôi nghe ý tưởng video của bạn, và chúng ta sẽ cùng nhau biến nó thành một kịch bản hoàn chỉnh nhé!' }
    ]);
    setMinutes(1);
    setSeconds(0);
    setAspectRatio('16:9 (Ngang)');
    setGenerateImagePrompts(false);
    setActiveTab('idea'); // Switch back to idea tab on reset
  };

  const isGenerating = state.step.startsWith('generating');
  const isScriptComplete = state.step === 'complete';
  const isApiKeySet = !!activeApiKey;

  return (
    <div className="min-h-screen bg-slate-900 font-sans text-slate-200">
      <Header onChangeApiKey={() => setIsApiKeyModalOpen(true)} />
      <main className="container mx-auto px-4 py-8 max-w-5xl">
        <div className="mb-8">
            <div className="flex border-b border-slate-700">
                <button
                    onClick={() => setActiveTab('idea')}
                    className={`px-6 py-3 text-lg font-medium transition-colors duration-200 ${activeTab === 'idea' ? 'border-b-2 border-cyan-400 text-cyan-400' : 'text-slate-400 hover:text-slate-200'}`}
                    aria-selected={activeTab === 'idea'}
                >
                    Phác Thảo Ý Tưởng
                </button>
                <button
                    onClick={() => setActiveTab('script')}
                    className={`px-6 py-3 text-lg font-medium transition-colors duration-200 ${activeTab === 'script' ? 'border-b-2 border-cyan-400 text-cyan-400' : 'text-slate-400 hover:text-slate-200'}`}
                    aria-selected={activeTab === 'script'}
                >
                    Xem Kịch Bản
                </button>
                <button
                    onClick={() => isScriptComplete && setActiveTab('seo')}
                    className={`px-6 py-3 text-lg font-medium transition-colors duration-200 ${activeTab === 'seo' ? 'border-b-2 border-cyan-400 text-cyan-400' : 'text-slate-400'} ${isScriptComplete ? 'hover:text-slate-200' : 'opacity-50 cursor-not-allowed'}`}
                    aria-selected={activeTab === 'seo'}
                    disabled={!isScriptComplete}
                    title={isScriptComplete ? "Tối ưu SEO và tạo ý tưởng thumbnail" : "Hoàn thành kịch bản để mở khóa tab này"}
                >
                    SEO &amp; Thumbnails
                </button>
            </div>
        </div>

        <div>
            <div hidden={activeTab !== 'idea'}>
                <IdeaTab
                    onSubmit={handleStartGeneration}
                    isLoading={isGenerating}
                    messages={chatMessages}
                    setMessages={setChatMessages}
                    minutes={minutes}
                    setMinutes={setMinutes}
                    seconds={seconds}
                    setSeconds={setSeconds}
                    aspectRatio={aspectRatio}
                    setAspectRatio={setAspectRatio}
                    generateImagePrompts={generateImagePrompts}
                    setGenerateImagePrompts={setGenerateImagePrompts}
                    isApiKeySet={isApiKeySet}
                    onRequestApiKey={() => setIsApiKeyModalOpen(true)}
                />
            </div>
            <div hidden={activeTab !== 'script'}>
                <ScriptTab
                    state={state}
                    onCancel={cancelGeneration}
                    onContinueToGuide={generateConsistencyGuide}
                    onContinueToPrompts={generateFinalPrompts}
                    onReset={handleReset}
                />
            </div>
            <div hidden={activeTab !== 'seo'}>
                 <SeoTab
                    story={state.story}
                    consistencyGuide={state.consistencyGuide}
                    isReady={isScriptComplete}
                />
            </div>
        </div>
      </main>
      <footer className="text-center py-6 text-sm text-slate-500">
        <p>Phát triển bởi StudioCineY Siêu Cấp VIP GỒ</p>
      </footer>
      <ApiKeyModal
        isOpen={isApiKeyModalOpen}
        onClose={() => setIsApiKeyModalOpen(false)}
        keys={apiKeys}
        activeKey={activeApiKey}
        onKeySelect={handleSetActiveApiKey}
        onKeySave={handleSaveApiKey}
        onKeyDelete={handleDeleteApiKey}
      />
    </div>
  );
};

export default App;
