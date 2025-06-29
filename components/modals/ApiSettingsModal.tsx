
import React, { useState, useEffect, useCallback } from 'react';
import Modal from '../Modal';
import Button from '../Button';
import Input from '../Input';
import RadioGroup from '../RadioGroup'; 
import { useSettings } from '../../contexts/SettingsContext';
import { GEMINI_API_KEY_URL } from '../../constants';
import { ApiProvider } from '../../types';
import { usePublicToast } from '../../contexts/ToastContext';

interface ApiSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const ApiKeyItem: React.FC<{apiKey: string, onRemove: () => void, isOnlyKey: boolean}> = ({apiKey, onRemove, isOnlyKey}) => {
    const maskKey = (key: string) => {
        if (key.length <= 8) return '****';
        return `${key.substring(0, 4)}...${key.substring(key.length - 4)}`;
    };
    return (
        <div className="flex items-center justify-between p-2.5 bg-slate-100 dark:bg-slate-700 rounded-md">
            <span className="text-sm font-mono text-slate-700 dark:text-slate-300">{maskKey(apiKey)}</span>
            <Button 
                variant="danger" 
                size="xs" 
                onClick={onRemove}
                title="Xóa API Key này"
                className="!p-1.5"
                disabled={isOnlyKey && (apiKey === "" || apiKey === undefined)} 
            >
                <i className="fas fa-times"></i>
            </Button>
        </div>
    );
};

const ApiSettingsModal: React.FC<ApiSettingsModalProps> = ({ isOpen, onClose }) => {
  const { 
    settings, 
    setSettings, 
    // addApiKey, // Direct use of setApiKeys or validateAndSaveGeminiKeys is preferred
    // removeApiKey,
    validateAndSaveGeminiKeys,
  } = useSettings();
  const { addToast } = usePublicToast();

  const [selectedProvider, setSelectedProvider] = useState<ApiProvider>(settings.apiProvider);
  
  const [localGeminiKeys, setLocalGeminiKeys] = useState<string[]>([]);
  const [newGeminiKeyInput, setNewGeminiKeyInput] = useState('');
  
  const [isProcessingSave, setIsProcessingSave] = useState(false);
  const [overallProviderStatus, setOverallProviderStatus] = useState<'idle' | 'success' | 'error'>('idle');


  useEffect(() => {
    if (isOpen) {
      setSelectedProvider(settings.apiProvider);
      setLocalGeminiKeys([...settings.geminiCustomApiKeys]);
      setNewGeminiKeyInput('');
      setIsProcessingSave(false);
      
      if (settings.apiProvider === 'geminiCustom') {
        if (settings.apiKeyStatus === 'valid') setOverallProviderStatus('success');
        else if (settings.apiKeyStatus === 'invalid' && settings.geminiCustomApiKeys.length > 0) setOverallProviderStatus('error');
        else setOverallProviderStatus('idle');
      } else { // geminiDefault
        setOverallProviderStatus('success'); // Default is always considered successful selection initially
      }
    }
  }, [isOpen, settings]);

  const handleProviderChange = (provider: string) => {
    const newProvider = provider as ApiProvider;
    setSelectedProvider(newProvider);
    setOverallProviderStatus('idle'); 
    if (newProvider === 'geminiCustom' && settings.apiKeyStatus !== 'valid') setOverallProviderStatus('idle');
    if (newProvider === 'geminiDefault') setOverallProviderStatus('success');
  };

  const handleAddGeminiKeyToList = () => {
    if (newGeminiKeyInput.trim() && !localGeminiKeys.includes(newGeminiKeyInput.trim())) {
      setLocalGeminiKeys(prev => [...prev, newGeminiKeyInput.trim()]);
    }
    setNewGeminiKeyInput('');
    setOverallProviderStatus('idle'); 
  };

  const handleRemoveGeminiKeyFromList = (keyToRemove: string) => {
    setLocalGeminiKeys(prev => prev.filter(k => k !== keyToRemove));
    setOverallProviderStatus('idle'); 
  };

  const handleSaveSettings = async () => {
    setIsProcessingSave(true);
    let success = true;
    let providerStatus: 'valid' | 'invalid' | 'unknown' | 'default' = 'unknown';

    if (selectedProvider === 'geminiCustom') {
      if (localGeminiKeys.length === 0) {
        await validateAndSaveGeminiKeys([]); 
        providerStatus = 'invalid'; 
        success = false; 
      } else {
        success = await validateAndSaveGeminiKeys(localGeminiKeys);
        providerStatus = success ? 'valid' : 'invalid';
      }
      setOverallProviderStatus(providerStatus === 'valid' ? 'success' : 'error');
    } else { // geminiDefault
      setSettings(s => ({ ...s, apiProvider: 'geminiDefault', useDefaultAPI: true, apiKeyStatus: 'default' }));
      success = true; 
      providerStatus = 'default';
      setOverallProviderStatus('success');
    }
    
    if (selectedProvider !== 'geminiDefault') { // geminiCustom
        setSettings(s => ({ ...s, apiProvider: selectedProvider, useDefaultAPI: false }));
    }


    if (success) {
      let toastMessage = "Đã lưu cài đặt API.";
      if (selectedProvider === 'geminiDefault') {
        toastMessage = "Đã chuyển sang dùng API Key mặc định của ứng dụng.";
      } else if (success) { // geminiCustom and success
        toastMessage = `Đã lưu API Keys cho Gemini (Key riêng). Ít nhất một key hợp lệ.`;
      }
      
      addToast({ message: toastMessage, type: 'success', duration: 7000 });
      setTimeout(onClose, (providerStatus === 'valid' || providerStatus === 'default') ? 1200 : 0);
    } else {
      addToast({ message: `Không có API key nào hợp lệ cho Gemini (Key riêng). Vui lòng kiểm tra lại.`, type: 'error'});
    }
    setIsProcessingSave(false);
  };
  
  const providerOptions = [
    { value: 'geminiDefault', label: 'Gemini (Mặc định ứng dụng)', description: 'Sử dụng Gemini Flash. Khuyến nghị cho người mới.' },
    { value: 'geminiCustom', label: 'Gemini (Key riêng)', description: 'Sử dụng (các) API Key Gemini của riêng bạn.' },
  ];

  const renderGeminiKeyManagementSection = () => {
    const isCurrentProvider = selectedProvider === 'geminiCustom';
    let statusToDisplay: 'idle' | 'success' | 'error' = 'idle';

    if (settings.apiProvider === 'geminiCustom') {
        statusToDisplay = settings.apiKeyStatus === 'valid' ? 'success' : (settings.apiKeyStatus === 'invalid' && settings.geminiCustomApiKeys.length > 0 ? 'error' : 'idle');
    }
    if (isCurrentProvider && overallProviderStatus !== 'idle' && settings.apiProvider === selectedProvider) {
        statusToDisplay = overallProviderStatus;
    }

    return (
      <div className={`transition-all duration-300 ease-in-out ${!isCurrentProvider ? 'opacity-50 max-h-0 overflow-hidden pointer-events-none' : 'opacity-100 max-h-[1000px] pt-4 mt-3 border-t border-dashed'}`}>
        <h4 className="text-sm font-medium text-text-light dark:text-text-dark mb-2">Quản lý API Keys Gemini:</h4>
        <div className="flex items-start gap-2 mb-3">
          <Input
            label={`Thêm API Key Gemini:`}
            type="password"
            value={newGeminiKeyInput}
            onChange={(e) => setNewGeminiKeyInput(e.target.value)}
            placeholder="Dán API Key Gemini của bạn (ví dụ: AIza...)"
            disabled={isProcessingSave || !isCurrentProvider}
            leftIcon={<i className="fas fa-plus text-gray-400"></i>}
            wrapperClass="flex-grow !mb-0"
            onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleAddGeminiKeyToList();}}}
          />
          <Button onClick={handleAddGeminiKeyToList} disabled={isProcessingSave || !isCurrentProvider || !newGeminiKeyInput.trim()} size="md" className="mt-[26px] !px-3" title={`Thêm key Gemini`}>Thêm</Button>
        </div>
        
        {localGeminiKeys.length > 0 && (
          <div className="space-y-2 mb-3 max-h-40 overflow-y-auto custom-scrollbar pr-1">
            {localGeminiKeys.map((key, index) => (
              <ApiKeyItem key={`Gemini-${index}-${key.slice(-4)}`} apiKey={key} onRemove={() => handleRemoveGeminiKeyFromList(key)} isOnlyKey={localGeminiKeys.length === 1} />
            ))}
          </div>
        )}
        {localGeminiKeys.length === 0 && isCurrentProvider && (
            <p className="text-sm text-yellow-600 dark:text-yellow-400 my-2"><i className="fas fa-exclamation-circle mr-1"></i>Không có API key nào được cấu hình cho Gemini (Key riêng).</p>
        )}

        {statusToDisplay === 'success' && isCurrentProvider && <p className="text-sm text-green-600 dark:text-green-400 mt-1"><i className="fas fa-check-circle mr-1"></i>Ít nhất một Key Gemini hợp lệ và đã được lưu!</p>}
        {statusToDisplay === 'error' && isCurrentProvider && localGeminiKeys.length > 0 && <p className="text-sm text-red-600 dark:text-red-400 mt-1"><i className="fas fa-times-circle mr-1"></i>Tất cả Keys Gemini đều không hợp lệ. Vui lòng kiểm tra lại.</p>}
        {statusToDisplay === 'idle' && isCurrentProvider && localGeminiKeys.length > 0 && (
            <p className="text-sm text-blue-600 dark:text-blue-400 mt-1"><i className="fas fa-question-circle mr-1"></i>Trạng thái keys Gemini chưa rõ hoặc đã thay đổi. Hãy Lưu để kiểm tra.</p>
        )}
         <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
            Lấy API Key Gemini tại: <a href={GEMINI_API_KEY_URL} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline font-medium">{GEMINI_API_KEY_URL}</a>
        </p>
      </div>
    );
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Thiết Lập API Key" size="md"> {/* Changed size to md */}
      <div className="space-y-5">
        <RadioGroup
          label="Chọn nhà cung cấp API:"
          name="apiProvider"
          options={providerOptions}
          selectedValue={selectedProvider}
          onChange={handleProviderChange}
        />

        {selectedProvider === 'geminiDefault' && (
             <div className="p-3 bg-green-50 dark:bg-green-900/40 border border-green-200 dark:border-green-700/60 rounded-lg">
                <p className="text-sm text-green-700 dark:text-green-200">
                    <i className="fas fa-info-circle mr-1.5"></i>API Key mặc định (Gemini) của ứng dụng đang được sử dụng.
                </p>
             </div>
        )}
        
        {renderGeminiKeyManagementSection()}

      </div>
      <div className="mt-8 flex justify-end space-x-3">
        <Button variant="outline" onClick={onClose} size="md" disabled={isProcessingSave}>Hủy</Button>
        <Button 
            onClick={handleSaveSettings} 
            isLoading={isProcessingSave}
            disabled={isProcessingSave || 
                        (selectedProvider === 'geminiCustom' && localGeminiKeys.length === 0 && settings.apiKeyStatus !== 'invalid')
                     }
            size="md"
            variant="primary"
        >
          {isProcessingSave ? "Đang xử lý..." : "Lưu & Đóng"}
        </Button>
      </div>
    </Modal>
  );
};

export default ApiSettingsModal;
