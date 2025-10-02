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
    setLanguage(target.value as Language);
  });
  
  container.appendChild(select);
  return container;
}

// 初始化語言切換器（可以添加到任何頁面）
export function initializeLanguageSwitcher(): void {
  addLanguageSwitcherToMenu();
}

function addLanguageSwitcherToMenu(): void {
  // 使用 requestAnimationFrame 確保 DOM 已經完全渲染
  requestAnimationFrame(() => {
    // 找到合適的位置插入語言切換器 - 添加到 menu-header-buttons 容器中
    const menuWindow = document.getElementById('menuWindow');
    
    if (menuWindow) {
      const menuHeaderButtons = menuWindow.querySelector('.menu-header-buttons');
      
      if (menuHeaderButtons) {
        // 檢查是否已經存在語言選擇器，避免重複添加
        const existingSwitcher = menuHeaderButtons.querySelector('.language-switcher');
        
        if (!existingSwitcher) {
          const switcher = createLanguageSwitcher();
          // 插入到按鈕容器的最前面（在 Back 和 Close 按鈕之前）
          menuHeaderButtons.insertBefore(switcher, menuHeaderButtons.firstChild);
        }
      }
    }
  });
}