import { BrowserInfo, OSInfo, DeviceInfo } from '../types';

/**
 * Parse user agent to extract browser info
 */
export function getBrowserInfo(): BrowserInfo {
  const ua = navigator.userAgent;

  let name = 'Unknown';
  let version = 'Unknown';

  // Chrome
  if (ua.indexOf('Chrome') > -1) {
    name = 'Chrome';
    const match = ua.match(/Chrome\/(\d+)/);
    version = match ? match[1] : 'Unknown';
  }
  // Firefox
  else if (ua.indexOf('Firefox') > -1) {
    name = 'Firefox';
    const match = ua.match(/Firefox\/(\d+)/);
    version = match ? match[1] : 'Unknown';
  }
  // Safari
  else if (ua.indexOf('Safari') > -1 && ua.indexOf('Chrome') === -1) {
    name = 'Safari';
    const match = ua.match(/Version\/(\d+)/);
    version = match ? match[1] : 'Unknown';
  }
  // Edge
  else if (ua.indexOf('Edg') > -1) {
    name = 'Edge';
    const match = ua.match(/Edg\/(\d+)/);
    version = match ? match[1] : 'Unknown';
  }

  return {
    name,
    version,
    user_agent: ua,
  };
}

/**
 * Get OS information
 */
export function getOSInfo(): OSInfo {
  const ua = navigator.userAgent;
  let name = 'Unknown';
  let version = 'Unknown';

  if (ua.indexOf('Win') > -1) {
    name = 'Windows';
    if (ua.indexOf('Windows NT 10.0') > -1) version = '10';
    else if (ua.indexOf('Windows NT 6.3') > -1) version = '8.1';
    else if (ua.indexOf('Windows NT 6.2') > -1) version = '8';
    else if (ua.indexOf('Windows NT 6.1') > -1) version = '7';
  } else if (ua.indexOf('Mac') > -1) {
    name = 'macOS';
    const match = ua.match(/Mac OS X (\d+[._]\d+)/);
    version = match ? match[1].replace('_', '.') : 'Unknown';
  } else if (ua.indexOf('Linux') > -1) {
    name = 'Linux';
  } else if (ua.indexOf('Android') > -1) {
    name = 'Android';
    const match = ua.match(/Android (\d+)/);
    version = match ? match[1] : 'Unknown';
  } else if (ua.indexOf('iOS') > -1 || ua.indexOf('iPhone') > -1 || ua.indexOf('iPad') > -1) {
    name = 'iOS';
    const match = ua.match(/OS (\d+_\d+)/);
    version = match ? match[1].replace('_', '.') : 'Unknown';
  }

  return { name, version };
}

/**
 * Get device information
 */
export function getDeviceInfo(): DeviceInfo {
  return {
    screen_width: window.screen.width,
    screen_height: window.screen.height,
  };
}
