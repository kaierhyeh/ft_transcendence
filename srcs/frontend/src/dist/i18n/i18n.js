import { translations } from './translations.js';
class I18n {
    constructor() {
        this.currentLanguage = 'en';
        this.translations = translations;
        // 從 localStorage 讀取語言設定，如果沒有的話使用瀏覽器語言
        try {
            const savedLanguage = localStorage.getItem('language');
            if (savedLanguage && savedLanguage in this.translations) {
                this.currentLanguage = savedLanguage;
            }
            else {
                // 檢測瀏覽器語言
                const browserLang = navigator.language.split('-')[0];
                if (browserLang in this.translations) {
                    this.currentLanguage = browserLang;
                }
            }
        }
        catch (error) {
            // localStorage 可能被禁用，使用默認語言
            console.warn('Failed to access localStorage, using default language', error);
        }
    }
    // 獲取翻譯
    t(key) {
        return this.translations[this.currentLanguage][key] || key;
    }
    // 切換語言
    setLanguage(language) {
        if (language in this.translations) {
            this.currentLanguage = language;
            try {
                localStorage.setItem('language', language);
            }
            catch (error) {
                console.warn('Failed to save language to localStorage', error);
            }
            this.updatePageTranslations();
            // 觸發自定義事件，通知其他組件語言已變更
            window.dispatchEvent(new CustomEvent('languageChanged', {
                detail: { language }
            }));
        }
    }
    // 獲取當前語言
    getCurrentLanguage() {
        return this.currentLanguage;
    }
    // 獲取所有可用語言
    getAvailableLanguages() {
        return [
            { code: 'en', name: this.translations.en.english },
            { code: 'zh', name: this.translations.zh.chinese },
            { code: 'fr', name: this.translations.fr.french }
        ];
    }
    // 更新頁面上的所有翻譯
    updatePageTranslations() {
        // 更新所有有 data-i18n 屬性的元素
        const elements = document.querySelectorAll('[data-i18n]');
        elements.forEach(element => {
            const key = element.getAttribute('data-i18n');
            if (key && element.textContent !== null) {
                element.textContent = this.t(key);
            }
        });
        // 更新所有有 data-i18n-placeholder 屬性的輸入框
        const inputs = document.querySelectorAll('[data-i18n-placeholder]');
        inputs.forEach(input => {
            const key = input.getAttribute('data-i18n-placeholder');
            if (key && input instanceof HTMLInputElement) {
                input.placeholder = this.t(key);
            }
        });
        // 更新所有有 data-i18n-title 屬性的元素
        const titledElements = document.querySelectorAll('[data-i18n-title]');
        titledElements.forEach(element => {
            const key = element.getAttribute('data-i18n-title');
            if (key) {
                element.setAttribute('title', this.t(key));
            }
        });
    }
    // 初始化頁面翻譯（需要在頁面載入後呼叫）
    initializePage() {
        this.updatePageTranslations();
    }
}
// 創建全域 i18n 實例
export const i18n = new I18n();
// 方便使用的全域函數
export const t = (key) => i18n.t(key);
export const setLanguage = (language) => i18n.setLanguage(language);
export const getCurrentLanguage = () => i18n.getCurrentLanguage();
export const getAvailableLanguages = () => i18n.getAvailableLanguages();
//# sourceMappingURL=i18n.js.map