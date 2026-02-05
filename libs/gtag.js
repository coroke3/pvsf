export const GA_MEASUREMENT_ID = process.env.NEXT_PUBLIC_GA_ID;
export const pageview = (url) => {
    if (typeof window !== 'undefined' && window.gtag && GA_MEASUREMENT_ID) {
        try {
            window.gtag("config", GA_MEASUREMENT_ID, { page_path: url });
        } catch (e) {
            console.warn('gtag pageview failed:', e);
        }
    }
};