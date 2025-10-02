import React, { useState, useEffect } from 'react';
import { KeyIcon } from './icons/KeyIcon';
import { XCircleIcon } from './icons/XCircleIcon';
import { PlusIcon } from './icons/PlusIcon';
import { CheckIcon } from './icons/CheckIcon';
import type { ApiKeyEntry } from '../types';

interface ApiKeyModalProps {
  isOpen: boolean;
  onClose: () => void;
  keys: ApiKeyEntry[];
  activeKey: string | null;
  onKeySelect: (key: string) => void;
  onKeySave: (data: { name: string; key: string }) => Promise<void>;
  onKeyDelete: (id: string) => void;
}

export const ApiKeyModal: React.FC<ApiKeyModalProps> = ({ 
  isOpen, 
  onClose,
  keys,
  activeKey,
  onKeySelect,
  onKeySave,
  onKeyDelete,
}) => {
  const [view, setView] = useState<'list' | 'add'>('list');
  const [name, setName] = useState('');
  const [key, setKey] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (isOpen) {
      if (keys.length === 0) {
        setView('add');
      } else {
        setView('list');
      }
      setName('');
      setKey('');
      setError(null);
      setIsSaving(false);
    }
  }, [isOpen, keys.length]);

  if (!isOpen) {
    return null;
  }

  const handleSaveSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!name.trim()) {
      setError('Vui lòng đặt tên cho API Key.');
      return;
    }
    if (!key.trim()) {
      setError('Vui lòng nhập API Key.');
      return;
    }

    setIsSaving(true);
    try {
        await onKeySave({ name: name.trim(), key: key.trim() });
    } catch (err) {
        setError(err instanceof Error ? err.message : "Đã xảy ra lỗi không xác định.");
    } finally {
        setIsSaving(false);
    }
  };
  
  const handleDelete = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (window.confirm('Bạn có chắc chắn muốn xóa API Key này không?')) {
        onKeyDelete(id);
    }
  };

  const renderListView = () => (
    <>
      <KeyIcon className="w-12 h-12 text-cyan-400 mx-auto mb-4" />
      <h2 className="text-2xl font-bold text-slate-100 mb-2">Quản lý API Keys</h2>
      <p className="text-slate-400 mb-6">
        Chọn một key để sử dụng hoặc thêm một key mới.
      </p>
      
      <div className="space-y-3 mb-6 max-h-60 overflow-y-auto pr-2">
        {keys.length > 0 ? keys.map(apiKey => (
          <div 
            key={apiKey.id} 
            className={`flex items-center justify-between p-3 rounded-lg border-2 transition-all ${apiKey.key === activeKey ? 'border-cyan-500 bg-cyan-900/40' : 'border-slate-600 bg-slate-700/50'}`}
          >
            <div className="text-left">
              <p className="font-semibold text-slate-200">{apiKey.name}</p>
              <p className="text-xs text-slate-400 font-mono">...{apiKey.key.slice(-6)}</p>
            </div>
            <div className="flex items-center gap-2">
                {apiKey.key !== activeKey && (
                    <button onClick={() => onKeySelect(apiKey.key)} className="px-3 py-1 text-sm bg-slate-600 hover:bg-slate-500 text-white font-semibold rounded-md transition-colors">
                        Sử dụng
                    </button>
                )}
                 <button onClick={(e) => handleDelete(e, apiKey.id)} className="p-2 text-red-400 hover:text-red-300 rounded-full hover:bg-red-900/50 transition-colors" title="Xóa Key">
                    <XCircleIcon className="w-5 h-5"/>
                </button>
            </div>
          </div>
        )) : (
            <p className="text-slate-500 text-center py-4">Chưa có API Key nào được lưu.</p>
        )}
      </div>

      <button
        onClick={() => setView('add')}
        className="w-full flex items-center justify-center gap-2 px-6 py-3 border border-slate-600 text-base font-medium rounded-md text-slate-300 bg-slate-700 hover:bg-slate-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-800 focus:ring-cyan-500 transition-all duration-300"
      >
        <PlusIcon className="w-5 h-5" />
        Thêm API Key mới
      </button>
    </>
  );

  const renderAddView = () => (
    <>
      <KeyIcon className="w-12 h-12 text-cyan-400 mx-auto mb-4" />
      <h2 className="text-2xl font-bold text-slate-100 mb-2">Thêm API Key mới</h2>
      <p className="text-slate-400 mb-6">
          Đặt tên và dán API Key của bạn vào bên dưới.
      </p>
      <form onSubmit={handleSaveSubmit} className="space-y-4">
        <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Tên gợi nhớ (ví dụ: Key cá nhân)"
            className={`w-full bg-slate-900 border ${error ? 'border-red-500' : 'border-slate-600'} rounded-md px-4 py-2.5 text-slate-200 focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 transition placeholder-slate-500`}
            aria-label="Tên API Key"
        />
        <input
          type="password"
          value={key}
          onChange={(e) => setKey(e.target.value)}
          placeholder="Nhập API Key của bạn tại đây"
          className={`w-full bg-slate-900 border ${error ? 'border-red-500' : 'border-slate-600'} rounded-md px-4 py-2.5 text-slate-200 focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 transition placeholder-slate-500`}
          aria-label="Google AI API Key"
        />
        {error && <p className="text-red-400 text-sm text-left">{error}</p>}
        <div className="flex gap-3 pt-2">
            {keys.length > 0 && (
                 <button
                    type="button"
                    onClick={() => setView('list')}
                    className="w-full px-6 py-3 border border-slate-600 text-base font-medium rounded-md text-slate-300 bg-slate-700 hover:bg-slate-600 transition-all duration-300"
                    disabled={isSaving}
                >
                    Hủy
                </button>
            )}
            <button
                type="submit"
                className="w-full flex items-center justify-center gap-2 px-6 py-3 border border-transparent text-base font-medium rounded-md text-white bg-cyan-600 hover:bg-cyan-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-800 focus:ring-cyan-500 disabled:bg-slate-600 disabled:cursor-wait transition-all duration-300"
                disabled={isSaving}
            >
                {isSaving ? (
                    <>
                        <svg className="animate-spin -ml-1 mr-2 h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Đang kiểm tra...
                    </>
                ) : 'Lưu Key'}
            </button>
        </div>
      </form>
    </>
  );

  return (
    <div 
      className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 animate-fade-in"
      onClick={onClose}
      aria-modal="true"
      role="dialog"
    >
      <style>{`
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        .animate-fade-in { animation: fadeIn 0.2s ease-out; }
      `}</style>
      <div 
        className="w-full max-w-lg bg-slate-800 p-8 rounded-2xl shadow-2xl border border-slate-700 relative text-center"
        onClick={e => e.stopPropagation()}
      >
        <button onClick={onClose} className="absolute top-3 right-3 text-slate-500 hover:text-slate-300 transition-colors" aria-label="Đóng">
          <XCircleIcon className="w-8 h-8"/>
        </button>
        
        {view === 'list' ? renderListView() : renderAddView()}
        
        <p className="mt-6 text-xs text-slate-500 text-center">
          Key của bạn được lưu cục bộ trên trình duyệt. Lấy API Key tại{' '}
          <a
            href="https://aistudio.google.com/app/apikey"
            target="_blank"
            rel="noopener noreferrer"
            className="text-cyan-500 hover:underline"
          >
            Google AI Studio
          </a>.
        </p>
      </div>
    </div>
  );
};