import { i18n, setLanguage, getAvailableLanguages } from './i18n.js';
import { Language } from './translations.js';

// 建立語言切換器UI
export function createLanguageSwitcher(): HTMLElement {
  const container = document.createElement('div');
  container.className = 'language-switcher';
  
  const select = document.createElement('select');
  select.id = 'language-select';
  select.className = 'language-select';
  
  // 創建選項
  getAvailableLanguages().forEach(lang => {
    const option = document.createElement('option');
    option.value = lang.code;
    option.textContent = lang.name;
    option.selected = i18n.getCurrentLanguage() === lang.code;
    select.appendChild(option);
  });
  
  // 添加事件監聽器
  select.addEventListener('change', (e) => {
    const target = e.target as HTMLSelectElement;
	console.log('Language changed to:', target.value);
    setLanguage(target.value as Language);
  });
  
  container.appendChild(select);
  return container;
}

// 初始化語言切換器（可以添加到任何頁面）
export function initLanguages(): void {
  addLanguageSwitcher();
}

function addLanguageSwitcher(): void {
  requestAnimationFrame(() => {
    const languagesSwitcher = document.getElementById('languagesSwitcher');

    if (languagesSwitcher) {
        const existingSwitcher = languagesSwitcher.querySelector('.language-switcher');
        if (!existingSwitcher) {
          const switcher = createLanguageSwitcher();
          languagesSwitcher.innerHTML = switcher.outerHTML;
        }
    }
  });
}
