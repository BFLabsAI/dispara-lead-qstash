/**
 * UTM Parameter Tracking
 * Extracts UTM parameters from the current URL
 */
export const getUTMParams = () => {
    const params = new URLSearchParams(window.location.search);
    return {
        utm_source: params.get('utm_source') || null,
        utm_medium: params.get('utm_medium') || null,
        utm_campaign: params.get('utm_campaign') || null,
        utm_term: params.get('utm_term') || null,
        utm_content: params.get('utm_content') || null,
    };
};

/**
 * Device Type Detection
 * Detects if the user is on web, android, or iphone
 */
export const getDeviceType = (): 'web' | 'android' | 'iphone' => {
    const ua = navigator.userAgent;
    if (/android/i.test(ua)) return 'android';
    if (/iPad|iPhone|iPod/.test(ua)) return 'iphone';
    return 'web';
};

/**
 * Get tracking metadata for lead capture
 */
export const getTrackingMetadata = () => {
    return {
        ...getUTMParams(),
        device_type: getDeviceType(),
        user_agent: navigator.userAgent,
        referrer: document.referrer || null,
        landing_page_url: window.location.href,
    };
};
