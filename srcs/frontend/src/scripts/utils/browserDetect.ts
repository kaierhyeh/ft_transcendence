// Browser Detection Utility
// Detects browser type and version for compatibility handling

export interface BrowserInfo {
  name: string;
  version: string;
  isSupported: boolean;
  isMobile: boolean;
}

export function detectBrowser(): BrowserInfo {
  const userAgent = navigator.userAgent;
  let browserName = 'Unknown';
  let browserVersion = 'Unknown';
  let isSupported = false;

  // Detect browser
  if (userAgent.includes('Firefox/')) {
    browserName = 'Firefox';
    browserVersion = userAgent.match(/Firefox\/(\d+)/)?.[1] || 'Unknown';
    isSupported = parseInt(browserVersion) >= 100; // Firefox 100+
  } else if (userAgent.includes('Edg/')) {
    browserName = 'Edge';
    browserVersion = userAgent.match(/Edg\/(\d+)/)?.[1] || 'Unknown';
    isSupported = parseInt(browserVersion) >= 90; // Edge 90+
  } else if (userAgent.includes('Chrome/') && !userAgent.includes('Edg/')) {
    browserName = 'Chrome';
    browserVersion = userAgent.match(/Chrome\/(\d+)/)?.[1] || 'Unknown';
    isSupported = parseInt(browserVersion) >= 90; // Chrome 90+
  } else if (userAgent.includes('Safari/') && !userAgent.includes('Chrome')) {
    browserName = 'Safari';
    browserVersion = userAgent.match(/Version\/(\d+)/)?.[1] || 'Unknown';
    isSupported = parseInt(browserVersion) >= 14; // Safari 14+
  }

  // Detect mobile
  const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(userAgent);

  return {
    name: browserName,
    version: browserVersion,
    isSupported,
    isMobile
  };
}

export function getBrowserName(): string {
  return detectBrowser().name;
}

export function isBrowserSupported(): boolean {
  return detectBrowser().isSupported;
}

export function addBrowserClass(): void {
  const browser = detectBrowser();
  const bodyElement = document.body;
  
  // Add browser-specific class
  bodyElement.classList.add(`browser-${browser.name.toLowerCase()}`);
  
  // Add mobile class if needed
  if (browser.isMobile) {
    bodyElement.classList.add('is-mobile');
  }
  
  // Add unsupported class if needed
  if (!browser.isSupported) {
    bodyElement.classList.add('browser-unsupported');
  }
}

export function showBrowserWarning(): void {
  const browser = detectBrowser();
  
  if (!browser.isSupported) {
    const warning = document.createElement('div');
    warning.className = 'browser-warning';
    warning.innerHTML = `
      <div class="browser-warning-content">
        <h3>⚠️ Browser Not Fully Supported</h3>
        <p>You are using ${browser.name} ${browser.version}. For the best experience, please use:</p>
        <ul>
          <li>Chrome 90+</li>
          <li>Firefox 100+</li>
          <li>Safari 14+</li>
          <li>Edge 90+</li>
        </ul>
        <button onclick="this.parentElement.parentElement.remove()">Continue Anyway</button>
      </div>
    `;
    document.body.appendChild(warning);
  }
}

// Log browser info to console
export function logBrowserInfo(): void {
  const browser = detectBrowser();
  console.log('🌐 Browser Info:', {
    name: browser.name,
    version: browser.version,
    supported: browser.isSupported ? '✅' : '❌',
    mobile: browser.isMobile ? '📱' : '💻'
  });
}
