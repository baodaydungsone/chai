import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { Settings, Theme, NSFWPreferences, UserProfile, ChatBackgroundSettings, ApiProvider, ThemePalette, CustomThemeColors } from '../types';
import { 
  LOCAL_STORAGE_SETTINGS_KEY, LOCAL_STORAGE_NSFW_KEY, 
  LOCAL_STORAGE_GEMINI_CUSTOM_API_KEYS, 
  LOCAL_STORAGE_USER_PROFILE_KEY, DEFAULT_USER_NAME, 
  DEFAULT_USER_BIO, DEFAULT_CHAT_BACKGROUND_SETTINGS,
  THEME_PALETTES, DEFAULT_CUSTOM_THEME_COLORS
} from '../constants';
import { validateApiKey as validateGeminiSingleKey } from '../services/GeminiService'; 

// --- Color Manipulation Helpers ---
const hexToRgb = (hex: string): { r: number; g: number; b: number } | null => {
    if (!hex) return null;
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result
      ? {
          r: parseInt(result[1], 16),
          g: parseInt(result[2], 16),
          b: parseInt(result[3], 16),
        }
      : null;
};
const clamp = (num: number, min: number, max: number) => Math.min(Math.max(num, min), max);

const changeColorLightness = (hex: string, percent: number): string => {
    if (!hex || !hex.startsWith('#')) return hex;
    const rgb = hexToRgb(hex);
    if (!rgb) return hex;
    
    let { r, g, b } = rgb;
    const factor = 1 + percent / 100;
    r = clamp(Math.round(r * factor), 0, 255);
    g = clamp(Math.round(g * factor), 0, 255);
    b = clamp(Math.round(b * factor), 0, 255);

    const toHex = (c: number) => ('00' + c.toString(16)).slice(-2);
    
    return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
};

interface SettingsContextProps {
  settings: Settings;
  setSettings: React.Dispatch<React.SetStateAction<Settings>>;
  nsfwSettings: NSFWPreferences;
  setNsfwSettings: React.Dispatch<React.SetStateAction<NSFWPreferences>>;
  
  addApiKey: (provider: 'gemini', key: string) => void;
  removeApiKey: (provider: 'gemini', keyToRemove: string) => void;
  setApiKeys: (provider: 'gemini', keys: string[]) => void;
  
  validateAndSaveGeminiKeys: (keys: string[]) => Promise<boolean>;

  userProfile: UserProfile; 
  setUserProfile: React.Dispatch<React.SetStateAction<UserProfile>>; 
}

const defaultSettings: Settings = {
  theme: Theme.Dark,
  themePalette: 'blue',
  customThemeColors: DEFAULT_CUSTOM_THEME_COLORS,
  apiProvider: 'geminiDefault',
  apiKeyStatus: 'default', 
  language: 'vi',
  fontSize: 16,
  useDefaultAPI: true, 
  chatBackground: DEFAULT_CHAT_BACKGROUND_SETTINGS,
  geminiCustomApiKeys: [],
  enableWebSearch: false,
  enableMemory: true, 
  enableEmotions: true, 
  allowUnlimitedGroupMembers: false,
  enableGroupMemory: false,
  enableTimeAwareness: true,
  enableDateAwareness: true,
  aiNotifications: {
    enabled: false,
    interval: 6, // Default to 6 hours
  },
};

const defaultNSFWPrefs: NSFWPreferences = {
  enabled: false,
  eroticaLevel: 'none',
  violenceLevel: 'none',
  darkContentLevel: 'none',
  customPrompt: '', 
};

const defaultUserProfile: UserProfile = { 
  name: DEFAULT_USER_NAME,
  avatarUrl: '', 
  bio: DEFAULT_USER_BIO,
};

const SettingsContext = createContext<SettingsContextProps | undefined>(undefined);

export const SettingsProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [settings, setSettings] = useState<Settings>(() => {
    const savedSettingsJson = localStorage.getItem(LOCAL_STORAGE_SETTINGS_KEY);
    const loadedSettings = { ...defaultSettings }; // Start with defaults

    if (savedSettingsJson) {
        try {
            const parsed = JSON.parse(savedSettingsJson);
            if (typeof parsed === 'object' && parsed !== null) {
                loadedSettings.theme = [Theme.Light, Theme.Dark, Theme.System].includes(parsed.theme) ? parsed.theme : defaultSettings.theme;
                loadedSettings.themePalette = parsed.themePalette || defaultSettings.themePalette;
                loadedSettings.customThemeColors = { ...defaultSettings.customThemeColors, ...(parsed.customThemeColors || {}) };
                loadedSettings.apiProvider = ['geminiDefault', 'geminiCustom'].includes(parsed.apiProvider) ? parsed.apiProvider : defaultSettings.apiProvider;
                loadedSettings.apiKeyStatus = ['unknown', 'valid', 'invalid', 'default'].includes(parsed.apiKeyStatus) ? parsed.apiKeyStatus : defaultSettings.apiKeyStatus;
                loadedSettings.language = parsed.language || defaultSettings.language;
                loadedSettings.fontSize = typeof parsed.fontSize === 'number' ? parsed.fontSize : defaultSettings.fontSize;
                loadedSettings.chatBackground = { ...defaultSettings.chatBackground, ...(parsed.chatBackground || {}) };
                
                const geminiKeys = Array.isArray(parsed.geminiCustomApiKeys) ? parsed.geminiCustomApiKeys : (typeof parsed.userApiKey === 'string' && parsed.userApiKey ? [parsed.userApiKey] : []);
                loadedSettings.geminiCustomApiKeys = geminiKeys.filter(k => typeof k === 'string' && k.trim() !== '');
                
                loadedSettings.enableWebSearch = typeof parsed.enableWebSearch === 'boolean' ? parsed.enableWebSearch : defaultSettings.enableWebSearch;
                loadedSettings.enableMemory = typeof parsed.enableMemory === 'boolean' ? parsed.enableMemory : defaultSettings.enableMemory;
                loadedSettings.enableEmotions = typeof parsed.enableEmotions === 'boolean' ? parsed.enableEmotions : defaultSettings.enableEmotions;
                loadedSettings.allowUnlimitedGroupMembers = typeof parsed.allowUnlimitedGroupMembers === 'boolean' ? parsed.allowUnlimitedGroupMembers : defaultSettings.allowUnlimitedGroupMembers;
                loadedSettings.enableGroupMemory = typeof parsed.enableGroupMemory === 'boolean' ? parsed.enableGroupMemory : defaultSettings.enableGroupMemory;
                loadedSettings.enableTimeAwareness = typeof parsed.enableTimeAwareness === 'boolean' ? parsed.enableTimeAwareness : defaultSettings.enableTimeAwareness;
                loadedSettings.enableDateAwareness = typeof parsed.enableDateAwareness === 'boolean' ? parsed.enableDateAwareness : defaultSettings.enableDateAwareness;

                if (typeof parsed.aiNotifications === 'object' && parsed.aiNotifications !== null) {
                    loadedSettings.aiNotifications = {
                        enabled: typeof parsed.aiNotifications.enabled === 'boolean' ? parsed.aiNotifications.enabled : defaultSettings.aiNotifications.enabled,
                        interval: typeof parsed.aiNotifications.interval === 'number' ? parsed.aiNotifications.interval : defaultSettings.aiNotifications.interval,
                    };
                }
            }
        } catch (e) {
            console.error("Failed to parse settings from localStorage, using defaults.", e);
        }
    }

      if (loadedSettings.geminiCustomApiKeys.length === 0) {
        const legacyGeminiKeysJson = localStorage.getItem(LOCAL_STORAGE_GEMINI_CUSTOM_API_KEYS);
        if (legacyGeminiKeysJson) try { 
            const keys = JSON.parse(legacyGeminiKeysJson);
            if(Array.isArray(keys)) loadedSettings.geminiCustomApiKeys = keys.filter(k => typeof k === 'string' && k.trim() !== ''); 
        } catch {}
      }

      if (loadedSettings.apiProvider === 'geminiDefault') {
          loadedSettings.useDefaultAPI = true;
          loadedSettings.apiKeyStatus = 'default';
      } else {
          loadedSettings.useDefaultAPI = false;
          if (loadedSettings.apiProvider === 'geminiCustom') {
              loadedSettings.apiKeyStatus = loadedSettings.geminiCustomApiKeys.length > 0 ? loadedSettings.apiKeyStatus : 'invalid';
              if (loadedSettings.apiKeyStatus === 'default') loadedSettings.apiKeyStatus = 'unknown'; 
          }
      }
    return loadedSettings;
  });

  const [nsfwSettings, setNsfwSettings] = useState<NSFWPreferences>(() => {
    const savedNSFW = localStorage.getItem(LOCAL_STORAGE_NSFW_KEY);
    if (savedNSFW) {
        try {
          const parsed = JSON.parse(savedNSFW);
          return { ...defaultNSFWPrefs, ...parsed };
        } catch { /* return default */ }
    }
    return defaultNSFWPrefs;
  });

  const [userProfile, setUserProfile] = useState<UserProfile>(() => { 
    const savedUserProfile = localStorage.getItem(LOCAL_STORAGE_USER_PROFILE_KEY);
    if (savedUserProfile) {
      try {
        const parsed = JSON.parse(savedUserProfile);
        return { ...defaultUserProfile, ...parsed };
      } catch (e) {
        console.error("Failed to parse user profile from localStorage", e);
        return defaultUserProfile;
      }
    }
    return defaultUserProfile;
  });

  useEffect(() => {
    const { deepSeekApiKeys, chatGptApiKeys, deepSeekApiKeyStatus, chatGptApiKeyStatus, userApiKey, ...settingsToSave } = settings as any;
    localStorage.setItem(LOCAL_STORAGE_SETTINGS_KEY, JSON.stringify(settingsToSave));
    localStorage.setItem(LOCAL_STORAGE_GEMINI_CUSTOM_API_KEYS, JSON.stringify(settings.geminiCustomApiKeys));
  }, [settings]);

  useEffect(() => {
    localStorage.setItem(LOCAL_STORAGE_NSFW_KEY, JSON.stringify(nsfwSettings));
  }, [nsfwSettings]);

  useEffect(() => { 
    localStorage.setItem(LOCAL_STORAGE_USER_PROFILE_KEY, JSON.stringify(userProfile));
  }, [userProfile]);

  useEffect(() => {
    const root = document.documentElement;
    let primaryColor: string, secondaryColor: string;
    
    if (settings.themePalette === 'custom') {
        primaryColor = settings.customThemeColors.primary;
        secondaryColor = settings.customThemeColors.secondary;
    } else {
        const palette = THEME_PALETTES[settings.themePalette] || THEME_PALETTES.blue;
        primaryColor = palette.primary;
        secondaryColor = palette.secondary;
    }

    const primaryLight = changeColorLightness(primaryColor, 15);
    const primaryDark = changeColorLightness(primaryColor, -10);
    const secondaryLight = changeColorLightness(secondaryColor, 15);
    const secondaryDark = changeColorLightness(secondaryColor, -10);

    const primaryRgb = hexToRgb(primaryColor);
    const primaryLightRgb = hexToRgb(primaryLight);
    const primaryDarkRgb = hexToRgb(primaryDark);
    const secondaryRgb = hexToRgb(secondaryColor);
    const secondaryLightRgb = hexToRgb(secondaryLight);
    const secondaryDarkRgb = hexToRgb(secondaryDark);

    if (primaryRgb) root.style.setProperty('--color-primary-DEFAULT', `${primaryRgb.r} ${primaryRgb.g} ${primaryRgb.b}`);
    if (primaryLightRgb) root.style.setProperty('--color-primary-light', `${primaryLightRgb.r} ${primaryLightRgb.g} ${primaryLightRgb.b}`);
    if (primaryDarkRgb) root.style.setProperty('--color-primary-dark', `${primaryDarkRgb.r} ${primaryDarkRgb.g} ${primaryDarkRgb.b}`);
    
    if (secondaryRgb) root.style.setProperty('--color-secondary-DEFAULT', `${secondaryRgb.r} ${secondaryRgb.g} ${secondaryRgb.b}`);
    if (secondaryLightRgb) root.style.setProperty('--color-secondary-light', `${secondaryLightRgb.r} ${secondaryLightRgb.g} ${secondaryLightRgb.b}`);
    if (secondaryDarkRgb) root.style.setProperty('--color-secondary-dark', `${secondaryDarkRgb.r} ${secondaryDarkRgb.g} ${secondaryDarkRgb.b}`);
    
  }, [settings.themePalette, settings.customThemeColors]);


  useEffect(() => {
    setSettings(currentSettings => {
      let newUseDefaultAPI = currentSettings.useDefaultAPI;
      let newApiKeyStatus = currentSettings.apiKeyStatus;

      if (currentSettings.apiProvider === 'geminiDefault') {
        newUseDefaultAPI = true;
        newApiKeyStatus = 'default';
      } else { // geminiCustom
        newUseDefaultAPI = false; 
        if (newApiKeyStatus === 'default') newApiKeyStatus = 'unknown'; 
        if (currentSettings.geminiCustomApiKeys.length === 0 && newApiKeyStatus !== 'invalid') newApiKeyStatus = 'invalid';
      }
      
      if (newUseDefaultAPI !== currentSettings.useDefaultAPI ||
          newApiKeyStatus !== currentSettings.apiKeyStatus) {
        return { 
            ...currentSettings, 
            useDefaultAPI: newUseDefaultAPI,
            apiKeyStatus: newApiKeyStatus,
        };
      }
      return currentSettings; 
    });
  }, [settings.apiProvider, settings.geminiCustomApiKeys.length]);


  const addApiKey = useCallback((provider: 'gemini', key: string) => {
    const trimmedKey = key.trim();
    if (!trimmedKey) return;

    setSettings(s => {
      if (provider === 'gemini') {
        if (s.geminiCustomApiKeys.includes(trimmedKey)) return s; 
        const updatedKeys = [...s.geminiCustomApiKeys, trimmedKey];
        return { ...s, geminiCustomApiKeys: updatedKeys, apiKeyStatus: 'unknown', apiProvider: 'geminiCustom', useDefaultAPI: false };
      }
      return s;
    });
  }, []);

  const removeApiKey = useCallback((provider: 'gemini', keyToRemove: string) => {
    setSettings(s => {
      if (provider === 'gemini') {
        const newKeys = s.geminiCustomApiKeys.filter(k => k !== keyToRemove);
        return { ...s, geminiCustomApiKeys: newKeys, apiKeyStatus: newKeys.length > 0 ? 'unknown' : 'invalid' };
      }
      return s;
    });
  }, []);
  
  const setApiKeys = useCallback((provider: 'gemini', keys: string[]) => {
     const uniqueKeys = [...new Set(keys.map(k => k.trim()).filter(k => k))]; 
     setSettings(s => {
      if (provider === 'gemini') {
        return { ...s, geminiCustomApiKeys: uniqueKeys, apiKeyStatus: uniqueKeys.length > 0 ? 'unknown' : 'invalid', apiProvider: 'geminiCustom', useDefaultAPI: false };
      }
      return s;
    });
  }, []);

  const validateAndSaveGeminiKeys = async (keys: string[]): Promise<boolean> => {
    const uniqueKeys = [...new Set(keys.map(k => k.trim()).filter(k => k))];
    let overallStatus: 'valid' | 'invalid' = 'invalid'; 
    let oneKeyIsValid = false;

    if (uniqueKeys.length === 0) {
      overallStatus = 'invalid';
    } else {
      for (const key of uniqueKeys) {
        if (!key.trim()) continue; 
        
        let isValidSingleKey = await validateGeminiSingleKey(key);
        
        if (isValidSingleKey) {
          oneKeyIsValid = true;
        }
      }
      overallStatus = oneKeyIsValid ? 'valid' : 'invalid';
    }

    setSettings(s => {
      return { ...s, geminiCustomApiKeys: uniqueKeys, apiKeyStatus: overallStatus, apiProvider: 'geminiCustom', useDefaultAPI: false };
    });
    return oneKeyIsValid;
  };
  

  return (
    <SettingsContext.Provider value={{ 
      settings, setSettings, 
      nsfwSettings, setNsfwSettings, 
      addApiKey, removeApiKey, setApiKeys,
      validateAndSaveGeminiKeys,
      userProfile, setUserProfile 
    }}>
      {children}
    </SettingsContext.Provider>
  );
};

export const useSettings = () => {
  const context = useContext(SettingsContext);
  if (context === undefined) {
    throw new Error('useSettings must be used within a SettingsProvider');
  }
  const { settings, ...rest } = context;
  return { 
    settings,
    ...rest 
  };
};