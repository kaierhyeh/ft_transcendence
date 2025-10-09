// Device Detection Utility
// Detects device type and screen size for responsive handling

export interface DeviceInfo {
  type: 'mobile' | 'tablet' | 'desktop';
  screenWidth: number;
  screenHeight: number;
  isTouch: boolean;
  orientation: 'portrait' | 'landscape';
}

export function detectDevice(): DeviceInfo {
  const width = window.innerWidth;
  const height = window.innerHeight;
  
  let type: 'mobile' | 'tablet' | 'desktop';
  
  if (width < 768) {
    type = 'mobile';
  } else if (width < 1024) {
    type = 'tablet';
  } else {
    type = 'desktop';
  }

  const isTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
  const orientation = height > width ? 'portrait' : 'landscape';

  return {
    type,
    screenWidth: width,
    screenHeight: height,
    isTouch,
    orientation
  };
}

export function addDeviceClass(): void {
  const device = detectDevice();
  const bodyElement = document.body;
  
  // Remove existing device classes
  bodyElement.classList.remove('device-mobile', 'device-tablet', 'device-desktop');
  bodyElement.classList.remove('orientation-portrait', 'orientation-landscape');
  
  // Add current device class
  bodyElement.classList.add(`device-${device.type}`);
  bodyElement.classList.add(`orientation-${device.orientation}`);
  
  // Add touch class
  if (device.isTouch) {
    bodyElement.classList.add('is-touch');
  }
}

export function logDeviceInfo(): void {
  const device = detectDevice();
  console.log('📱 Device Info:', {
    type: device.type,
    screen: `${device.screenWidth}x${device.screenHeight}`,
    touch: device.isTouch ? '👆' : '🖱️',
    orientation: device.orientation === 'portrait' ? '📱' : '📲'
  });
}

// Update device classes on resize and orientation change
export function initDeviceDetection(): void {
  addDeviceClass();
  logDeviceInfo();
  
  window.addEventListener('resize', () => {
    addDeviceClass();
  });
  
  window.addEventListener('orientationchange', () => {
    setTimeout(() => {
      addDeviceClass();
      logDeviceInfo();
    }, 100);
  });
}

// Check if user is on mobile
export function isMobile(): boolean {
  return detectDevice().type === 'mobile';
}

// Check if user is on tablet
export function isTablet(): boolean {
  return detectDevice().type === 'tablet';
}

// Check if user is on desktop
export function isDesktop(): boolean {
  return detectDevice().type === 'desktop';
}

// Check if device supports touch
export function isTouchDevice(): boolean {
  return detectDevice().isTouch;
}
