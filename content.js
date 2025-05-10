// Add styles for the popup
const popupStyles = `
    .popin_iframe_container {
        position: fixed !important;
        z-index: 999999 !important;
        right: 20px !important;
        width: 560px !important;
        height: 800px !important;
        top: 50% !important;
        transform: translateY(-50%) !important;
        background-color: white !important;
        border: 1px solid #ccc !important;
        border-radius: 16px !important;
        box-shadow: 0 12px 32px rgba(0,0,0,0.25) !important;
    }
    @media (max-width: 768px) {
        .popin_iframe_container {
            right: 4px !important;
            width: calc(100vw - 8px) !important;
            height: 400px !important;
            top: auto !important;
            bottom: 20px !important;
            transform: translateY(0) !important;
        }
    }
`;

// Add styles to document head
const styleSheet = document.createElement('style');
styleSheet.textContent = popupStyles;
document.head.appendChild(styleSheet);

// Function to handle image preloading
function handleImagePreload(imageUrl) {
    if (!imageUrl) return;

    try {
        // Remove any existing preload links for this image
        const existingPreloads = document.querySelectorAll(`link[rel="preload"][href="${imageUrl}"]`);
        existingPreloads.forEach(preload => preload.remove());

        // Create new preload link with proper attributes
        const preloadLink = document.createElement('link');
        preloadLink.rel = 'preload';
        preloadLink.as = 'image';
        preloadLink.href = imageUrl;
        preloadLink.type = 'image/png'; // Default to PNG, adjust if needed
        preloadLink.crossOrigin = 'anonymous';
        preloadLink.fetchPriority = 'high';

        // Add to document head
        document.head.appendChild(preloadLink);
        console.log('Debug: Added image preload:', imageUrl);

        // Create and preload the image
        const img = new Image();
        img.src = imageUrl;
        img.crossOrigin = 'anonymous';
        img.decoding = 'async';
        img.loading = 'eager';
        
        // Handle load and error events
        img.onload = () => {
            console.log('Debug: Image preloaded successfully:', imageUrl);
            // Remove preload link after successful load
            preloadLink.remove();
        };
        
        img.onerror = (error) => {
            console.warn('Debug: Failed to preload image:', imageUrl, error);
            // Remove preload link on error
            preloadLink.remove();
        };

        return img; // Return the image element for use
    } catch (error) {
        console.warn('Debug: Error handling image preload:', error);
        return null;
    }
}

// Function to normalize image URL
function normalizeImageUrl(url) {
    if (!url || typeof url !== 'string') {
        console.warn('Debug: Invalid image URL for normalization:', url);
        return url;
    }

    try {
        // Handle lu.ma CDN images
        if (url.includes('lumacdn.com')) {
            // Extract the base image path
            const basePath = url.split('/event-covers/')[1];
            if (basePath) {
                // Clean up any additional parameters
                const cleanPath = basePath.split('&')[0];
                // Construct the direct image URL without CDN transformations
                const directUrl = `https://images.lumacdn.com/event-covers/${cleanPath}`;
                console.log('Debug: Normalized lu.ma image URL:', {
                    original: url,
                    normalized: directUrl
                });
                return directUrl;
            }
        }

        // Handle lu.ma social image URLs
        if (url.includes('social-images.lu.ma')) {
            // Extract the base image path from the URL
            const imgParam = url.split('img=')[1];
            if (imgParam) {
                const decodedUrl = decodeURIComponent(imgParam);
                // Clean up any additional parameters
                const cleanUrl = decodedUrl.split('&')[0];
                console.log('Debug: Normalized lu.ma image URL:', {
                    original: url,
                    normalized: cleanUrl
                });
                return cleanUrl;
            }
        }

        // Remove any CDN transformations
        if (url.includes('cdn-cgi/image')) {
            // Extract the base URL before any transformations
            const baseUrl = url.split('cdn-cgi/image')[0];
            console.log('Debug: Normalized CDN image URL:', {
                original: url,
                normalized: baseUrl
            });
            return baseUrl;
        }

        // Handle relative URLs
        if (url.startsWith('/')) {
            const baseUrl = window.location.origin;
            const fullUrl = baseUrl + url;
            console.log('Debug: Normalized relative image URL:', {
                original: url,
                normalized: fullUrl
            });
            return fullUrl;
        }

        // Keep the original URL if no transformations needed
        console.log('Debug: Using original image URL:', url);
        return url;
    } catch (error) {
        console.warn('Debug: Error normalizing image URL:', error);
        return url;
    }
}

// Function to create and show the popup
function createPopup(eventData) {
    console.log('Debug: Creating popup with event data:', eventData);
    
    // Remove existing popup if any
    const existingPopup = document.querySelector('.popin_iframe_container');
    if (existingPopup) {
        existingPopup.remove();
    }

    // Create popup container
    const popupContainer = document.createElement('div');
    popupContainer.className = 'popin_iframe_container';
    
    // Create iframe
    const iframe = document.createElement('iframe');
    iframe.style.cssText = `
        width: 100%;
        height: 100%;
        border: none;
        border-radius: 16px;
    `;
    
    // Add minimal security attributes
    iframe.setAttribute('sandbox', 'allow-scripts allow-forms allow-same-origin allow-popups');
    iframe.setAttribute('referrerpolicy', 'no-referrer');

    // Ensure event data is properly formatted
    const formattedEventData = {
        name: eventData.name || document.title || 'Untitled Event',
        image: eventData.image || '',
        startDate: eventData.startDate || new Date().toISOString(),
        location: typeof eventData.location === 'object' ? 
            eventData.location.name || 'Unknown Location' : 
            eventData.location || 'Unknown Location'
    };

    // Construct URL with minimal parameters
    const params = new URLSearchParams({
        title: formattedEventData.name,
        image: formattedEventData.image,
        date: formattedEventData.startDate,
        location: formattedEventData.location,
        source: window.location.href,
        sourceType: window.location.hostname.includes('lu.ma') ? 'luma' :
                   window.location.hostname.includes('meetup.com') ? 'meetup' :
                   window.location.hostname.includes('eventbrite.ca') ? 'eventbrite' :
                   window.location.hostname.includes('allevents.in') ? 'allevents' : 'other'
    });

    // Set iframe source
    iframe.src = `https://beta.popin.site?${params.toString()}`;
    
    // Add iframe to container
    popupContainer.appendChild(iframe);
    
    // Add container to body
    document.body.appendChild(popupContainer);
    
    console.log('Debug: Popup created with data:', formattedEventData);
    
    // Set up message listener for iframe communication
    window.addEventListener('message', (event) => {
        if (event.origin === 'https://beta.popin.site') {
            console.log('Debug: Received message from popin.site:', event.data);
            
            if (event.data.type === 'closePopup') {
                popupContainer.remove();
            }
        }
    });
}

// Function to generate event ID
function generateEventId(eventData) {
    try {
        console.log('Debug: Generating event ID for:', eventData);
        
        // Get date digits from start date
        const dateDigits = eventData.startDate ? 
            new Date(eventData.startDate).toISOString().split('T')[0].replace(/-/g, '') : 
            new Date().toISOString().split('T')[0].replace(/-/g, '');
        
        // Clean title (first 10 chars, alphanumeric only)
        const cleanTitle = (eventData.name || 'event')
            .toLowerCase()
            .replace(/[^a-z0-9]/g, '')
            .substring(0, 10);
        
        // Clean location (first 5 chars, alphanumeric only)
        const locationName = typeof eventData.location === 'object' ? 
            eventData.location.name : 
            String(eventData.location || '');
        const cleanLocation = locationName
            .toLowerCase()
            .replace(/[^a-z0-9]/g, '')
            .substring(0, 5);
        
        // Combine to create unique ID
        const eventId = `${cleanTitle}${cleanLocation}${dateDigits}`;
        
        console.log('Debug: Generated event ID:', {
            eventId,
            cleanTitle,
            cleanLocation,
            dateDigits
        });
        
        return eventId;
    } catch (error) {
        console.error('Debug: Error generating event ID:', error);
        // Return a fallback ID if generation fails
        return `event${Date.now()}`;
    }
}

// Debug: Log when content script starts
console.log("Content script loaded for URL:", window.location.href);

// Global event info object
let eventInfo = {
    title: "Default Event Title",
    startDate: new Date().toISOString(),
    endDate: new Date().toISOString(),
    location: {
        name: "Online",
        city: "Unknown City",
        province: "Unknown Province",
        country: "Unknown Country",
        streetAddress: "Unknown Street Address"
    },
    description: "Event description goes here.",
    googleEventId: "",
    googleEventName: "",
    linkedinEventId: "",
    linkedinEventName: ""
};

// Helper function to extract first letters of words
function Extract(text) {
    if (!text) return '';
    return text
        .split(/\s+/)
        .map(word => word.charAt(0).toUpperCase())
        .join('');
}

// Function to check if we're on a supported page
function isSupportedPage() {
    const url = window.location.href;
    console.log('Debug: Checking if page is supported:', url);
    const isSupported = (
        url.includes('lu.ma') ||
        url.includes('meetup.com/events/') ||
        url.includes('eventbrite.ca/e/') ||
        url.includes('allevents.in/')
    );
    console.log('Debug: Is page supported?', isSupported);
    return isSupported;
}

// Function to wait for an element to be present in the DOM
function waitForElement(selector) {
    let observer;
    return new Promise((resolve, reject) => {
        console.log(`Debug: Starting waitForElement for selector: ${selector}`, {
            documentState: {
                readyState: document.readyState,
                bodyExists: !!document.body,
                headExists: !!document.head
            },
            timestamp: new Date().toISOString(),
            url: window.location.href
        });
        
        // Check if element already exists
        const existingElement = document.querySelector(selector);
        if (existingElement) {
            console.log(`Debug: Element already exists for selector: ${selector}`, {
                id: existingElement.id,
                className: existingElement.className,
                tagName: existingElement.tagName,
                isVisible: window.getComputedStyle(existingElement).display !== 'none',
                parentElement: existingElement.parentElement ? {
                    id: existingElement.parentElement.id,
                    className: existingElement.parentElement.className,
                    tagName: existingElement.parentElement.tagName
                } : 'No parent',
                timestamp: new Date().toISOString()
            });
            return resolve(existingElement);
        }

        console.log(`Debug: Setting up observer for selector: ${selector}`, {
            timestamp: new Date().toISOString(),
            documentState: {
                readyState: document.readyState,
                bodyExists: !!document.body,
                headExists: !!document.head
            }
        });

        observer = new MutationObserver((mutations) => {
            console.log(`Debug: Mutation observed for selector: ${selector}`, {
                mutationsCount: mutations.length,
                addedNodes: mutations.some(m => m.addedNodes.length > 0),
                removedNodes: mutations.some(m => m.removedNodes.length > 0),
                documentState: {
                    readyState: document.readyState,
                    bodyExists: !!document.body,
                    headExists: !!document.head
                },
                timestamp: new Date().toISOString(),
                // Enhanced mutation details
                mutations: mutations.map(mutation => ({
                    type: mutation.type,
                    target: {
                        tagName: mutation.target.tagName,
                        id: mutation.target.id,
                        className: mutation.target.className
                    },
                    addedNodes: Array.from(mutation.addedNodes)
                        .filter(node => node.nodeType === Node.ELEMENT_NODE)
                        .map(node => ({
                            tagName: node.tagName,
                            id: node.id,
                            className: node.className,
                            isVisible: window.getComputedStyle(node).display !== 'none'
                        })),
                    removedNodes: Array.from(mutation.removedNodes)
                        .filter(node => node.nodeType === Node.ELEMENT_NODE)
                        .map(node => ({
                            tagName: node.tagName,
                            id: node.id,
                            className: node.className
                        })),
                    attributeName: mutation.attributeName,
                    oldValue: mutation.oldValue
                })),
                // Enhanced element finding logic
                foundElements: mutations.flatMap(mutation => {
                    // Check in the mutation target
                    const targetElement = mutation.target.querySelector(selector);
                    if (targetElement) {
                        console.log(`Debug: Found element in mutation target:`, {
                            element: {
                                tagName: targetElement.tagName,
                                id: targetElement.id,
                                className: targetElement.className,
                                isVisible: window.getComputedStyle(targetElement).display !== 'none'
                            },
                            mutationTarget: {
                                tagName: mutation.target.tagName,
                                id: mutation.target.id,
                                className: mutation.target.className
                            }
                        });
                        return [targetElement];
                    }

                    // Check in added nodes
                    return Array.from(mutation.addedNodes)
                        .filter(node => node.nodeType === Node.ELEMENT_NODE)
                        .flatMap(node => {
                            const element = node.querySelector(selector);
                            if (element) {
                                console.log(`Debug: Found element in added node:`, {
                                    element: {
                                        tagName: element.tagName,
                                        id: element.id,
                                        className: element.className,
                                        isVisible: window.getComputedStyle(element).display !== 'none'
                                    },
                                    parentNode: {
                                        tagName: node.tagName,
                                        id: node.id,
                                        className: node.className
                                    }
                                });
                                return [element];
                            }
                            return [];
                        });
                })
            });
            
            // Check for element after mutations
            const element = document.querySelector(selector);
            if (element) {
                console.log(`Debug: Element found after mutations for selector: ${selector}`, {
                    id: element.id,
                    className: element.className,
                    tagName: element.tagName,
                    isVisible: window.getComputedStyle(element).display !== 'none',
                    parentElement: element.parentElement ? {
                        id: element.parentElement.id,
                        className: element.parentElement.className,
                        tagName: element.parentElement.tagName
                    } : 'No parent',
                    timestamp: new Date().toISOString()
                });
                observer.disconnect();
                resolve(element);
            }
        });

        try {
            // Enhanced container selection with site-specific selectors
            const siteSpecificSelectors = {
                'lu.ma': [
                    // Primary selectors (jsx- prefixed)
                    '[class*="jsx-"][class*="event-theme"]',
                    '[class*="jsx-"][class*="event-content"]',
                    '[class*="jsx-"][class*="event-details"]',
                    '[class*="jsx-"][class*="event-info"]',
                    '[class*="jsx-"][class*="event-header"]',
                    // Fallback selectors
                    '[class*="event-theme"]',
                    '[class*="event-content"]',
                    '[class*="event-details"]',
                    '[class*="event-info"]',
                    '[class*="event-header"]',
                    // Additional selectors
                    '[class*="jsx-"][class*="content"]',
                    '[class*="jsx-"][class*="main"]',
                    '[class*="jsx-"][class*="body"]',
                    '[class*="jsx-"][class*="container"]',
                    // Generic selectors
                    'div[class*="event"]',
                    'div[class*="content"]',
                    'div[class*="main"]',
                    'div[class*="body"]',
                    'div[class*="container"]',
                    'main',
                    'article',
                    'section'
                ],
                'meetup.com': [
                    '[data-testid="event-details"]',
                    '[class*="event-details"]',
                    '[class*="event-content"]',
                    '[class*="event-body"]'
                ],
                'eventbrite.ca': [
                    '[data-testid="event-details"]',
                    '[class*="event-details"]',
                    '[class*="event-content"]',
                    '[class*="event-body"]'
                ],
                'allevents.in': [
                    '[class*="event-details"]',
                    '[class*="event-content"]',
                    '[class*="event-body"]'
                ]
            };

            // Get current site
            const currentSite = Object.keys(siteSpecificSelectors).find(site => 
                window.location.hostname.includes(site)
            );

            // For lu.ma, try to find the event container first
            if (currentSite === 'lu.ma') {
                console.log('Debug: Detected lu.ma site, using specialized container finding');
                
                // First try to find any lu.ma specific container
                const luMaSelectors = [
                    // Primary selectors (jsx- prefixed)
                    '[class*="jsx-"][class*="event-theme"]',
                    '[class*="jsx-"][class*="event-content"]',
                    '[class*="jsx-"][class*="event-details"]',
                    '[class*="jsx-"][class*="event-info"]',
                    '[class*="jsx-"][class*="event-header"]',
                    // Fallback selectors
                    '[class*="event-theme"]',
                    '[class*="event-content"]',
                    '[class*="event-details"]',
                    '[class*="event-info"]',
                    '[class*="event-header"]',
                    // Additional selectors
                    '[class*="jsx-"][class*="content"]',
                    '[class*="jsx-"][class*="main"]',
                    '[class*="jsx-"][class*="body"]',
                    '[class*="jsx-"][class*="container"]',
                    // Generic selectors
                    'div[class*="event"]',
                    'div[class*="content"]',
                    'div[class*="main"]',
                    'div[class*="body"]',
                    'div[class*="container"]',
                    'main',
                    'article',
                    'section'
                ];
                
                for (const selector of luMaSelectors) {
                    try {
                        console.log(`Debug: Trying lu.ma selector: ${selector}`);
                        const containers = document.querySelectorAll(selector);
                        console.log(`Debug: Found ${containers.length} elements for selector: ${selector}`);
                        
                        for (const container of containers) {
                            if (isValidContainer(container)) {
                                console.log(`Debug: Found valid lu.ma container with selector: ${selector}`, {
                                    id: container.id,
                                    className: container.className,
                                    tagName: container.tagName,
                                    dimensions: container.getBoundingClientRect(),
                                    isVisible: window.getComputedStyle(container).display !== 'none',
                                    hasContent: container.textContent.trim().length > 0
                                });

                                // Set up observer on this container
                                observer.observe(container, {
                                    childList: true,
                                    subtree: true,
                                    attributes: true,
                                    attributeFilter: ['class', 'id', 'style'],
                                    characterData: true,
                                    attributeOldValue: true,
                                    characterDataOldValue: true
                                });

                                console.log(`Debug: Observer started for lu.ma container:`, {
                                    timestamp: new Date().toISOString(),
                                    selector: selector,
                                    container: {
                                        id: container.id,
                                        className: container.className,
                                        tagName: container.tagName,
                                        isVisible: window.getComputedStyle(container).display !== 'none',
                                        hasContent: container.textContent.trim().length > 0
                                    }
                                });

                                // Check for event details immediately
                                const eventDetailsSelectors = [
                                    '[class*="jsx-"][class*="event-details"]',
                                    '[class*="event-details"]',
                                    '[class*="jsx-"][class*="event-info"]',
                                    '[class*="event-info"]',
                                    '[class*="jsx-"][class*="event-content"]',
                                    '[class*="event-content"]'
                                ];

                                for (const detailsSelector of eventDetailsSelectors) {
                                    const eventDetails = container.querySelector(detailsSelector);
                                    if (eventDetails) {
                                        console.log('Debug: Found event details in container:', {
                                            selector: detailsSelector,
                                            id: eventDetails.id,
                                            className: eventDetails.className,
                                            tagName: eventDetails.tagName,
                                            isVisible: window.getComputedStyle(eventDetails).display !== 'none',
                                            hasContent: eventDetails.textContent.trim().length > 0,
                                            children: eventDetails.children.length
                                        });

                                        // Check if the event details are actually loaded
                                        if (eventDetails.textContent.trim().length > 0 || eventDetails.children.length > 0) {
                                            console.log('Debug: Event details are loaded and valid');
                                            observer.disconnect();
                                            resolve(eventDetails);
                                            return;
                                        } else {
                                            console.log('Debug: Event details found but appear to be empty');
                                        }
                                    }
                                }

                                // If we found a valid container but no event details yet, keep observing
                                return;
                            }
                        }
                    } catch (error) {
                        console.warn(`Debug: Error checking lu.ma selector ${selector}:`, error);
                    }
                }
            }

            // Fallback to general container finding
            const selectors = [
                ...(currentSite ? siteSpecificSelectors[currentSite] : []),
                'main',
                'article',
                '[class*="content"]',
                '[class*="main"]',
                '[class*="event"]',
                '[class*="details"]'
            ];

            // Try to find the most specific container
            const potentialContainers = selectors
                .map(selector => document.querySelector(selector))
                .filter(Boolean);

            const targetNode = potentialContainers[0] || document.body;
            
            console.log(`Debug: Using target node for observation:`, {
                tagName: targetNode.tagName,
                id: targetNode.id,
                className: targetNode.className,
                isBody: targetNode === document.body,
                site: currentSite || 'unknown',
                selector: selectors[potentialContainers.indexOf(targetNode)] || 'body'
            });

            observer.observe(targetNode, {
                childList: true,
                subtree: true,
                attributes: true,
                attributeFilter: ['class', 'id', 'style'],
                characterData: true,
                attributeOldValue: true,
                characterDataOldValue: true
            });

            console.log(`Debug: Observer started for selector: ${selector}`, {
                timestamp: new Date().toISOString(),
                documentState: {
                    readyState: document.readyState,
                    bodyExists: !!document.body,
                    headExists: !!document.head
                },
                observerConfig: {
                    childList: true,
                    subtree: true,
                    attributes: true,
                    attributeFilter: ['class', 'id', 'style'],
                    characterData: true,
                    attributeOldValue: true,
                    characterDataOldValue: true
                },
                targetNode: {
                    tagName: targetNode.tagName,
                    id: targetNode.id,
                    className: targetNode.className,
                    isBody: targetNode === document.body,
                    site: currentSite || 'unknown',
                    selector: selectors[potentialContainers.indexOf(targetNode)] || 'body'
                }
            });
        } catch (error) {
            console.error(`Debug: Error setting up observer for selector: ${selector}`, {
                error: error.message,
                stack: error.stack,
                documentState: {
                    readyState: document.readyState,
                    bodyExists: !!document.body,
                    headExists: !!document.head
                },
                timestamp: new Date().toISOString()
            });
            reject(error);
        }
    });
}

// Helper function to validate if a container is suitable for button placement
function isValidContainer(container) {
    if (!container) {
        console.log('Debug: Container is null or undefined');
        return false;
    }

    try {
        // Check if container is in the DOM
        if (!document.body.contains(container)) {
            console.log('Debug: Container not in DOM:', {
                id: container.id,
                className: container.className,
                tagName: container.tagName
            });
            return false;
        }

        // Check if container is visible
        const style = window.getComputedStyle(container);
        const isVisible = style.display !== 'none' && 
                         style.visibility !== 'hidden' && 
                         style.opacity !== '0';

        if (!isVisible) {
            console.log('Debug: Container not visible:', {
                display: style.display,
                visibility: style.visibility,
                opacity: style.opacity
            });
            return false;
        }

        // Check container dimensions (more lenient)
        const rect = container.getBoundingClientRect();
        const isLargeEnough = rect.width >= 30 && rect.height >= 30; // Further reduced minimum size
        const isInViewport = rect.top <= window.innerHeight && 
                            rect.bottom >= 0 && 
                            rect.left <= window.innerWidth && 
                            rect.right >= 0;

        if (!isLargeEnough || !isInViewport) {
            console.log('Debug: Container dimensions invalid:', {
                width: rect.width,
                height: rect.height,
                top: rect.top,
                bottom: rect.bottom,
                left: rect.left,
                right: rect.right
            });
            return false;
        }

        return true;
    } catch (error) {
        console.error('Debug: Error validating container:', {
            error: error.message,
            container: container ? {
                id: container.id,
                className: container.className,
                tagName: container.tagName
            } : 'No container'
        });
        return false;
    }
}

// Site-specific selectors
const siteSelectors = {
    'lu.ma': [
        // Primary selectors (jsx- prefixed)
        '[class*="jsx-"][class*="event-theme"]',
        '[class*="jsx-"][class*="event-content"]',
        '[class*="jsx-"][class*="event-details"]',
        '[class*="jsx-"][class*="event-info"]',
        '[class*="jsx-"][class*="event-header"]',
        // Fallback selectors
        '[class*="event-theme"]',
        '[class*="event-content"]',
        '[class*="event-details"]',
        '[class*="event-info"]',
        '[class*="event-header"]',
        // Additional selectors
        '[class*="jsx-"][class*="content"]',
        '[class*="jsx-"][class*="main"]',
        '[class*="jsx-"][class*="body"]',
        '[class*="jsx-"][class*="container"]',
        // Generic selectors
        'div[class*="event"]',
        'div[class*="content"]',
        'div[class*="main"]',
        'div[class*="body"]',
        'div[class*="container"]',
        'main',
        'article',
        'section'
    ],
    'meetup.com': [
        '[data-testid="event-details"]',
        '[class*="event-details"]',
        '[class*="event-content"]',
        '[class*="event-body"]'
    ],
    'eventbrite.ca': [
        '[data-testid="event-details"]',
        '[class*="event-details"]',
        '[class*="event-content"]',
        '[class*="event-body"]'
    ],
    'allevents.in': [
        '[class*="event-details"]',
        '[class*="event-content"]',
        '[class*="event-body"]'
    ]
};

// Common selectors that might contain event details
const commonSelectors = [
    'div[class*="event"]',
    'div[class*="details"]',
    'div[class*="content"]',
    'div[class*="main"]',
    'div[class*="body"]',
    'div[class*="container"]',
    'div[class*="section"]',
    'article',
    'main',
    'section'
];

// Function to find the appropriate container based on the site
async function findContainer(retryCount = 0) {
    const currentUrl = window.location.href;
    console.log('Debug: Finding container for URL:', currentUrl);

    try {
        // Special handling for lu.ma
        if (currentUrl.includes('lu.ma')) {
            console.log('Debug: Detected lu.ma site, using specialized container finding');
            
            // First try to find any lu.ma specific container
            const luMaSelectors = [
                // Primary selectors (jsx- prefixed)
                '[class*="jsx-"][class*="event-theme"]',
                '[class*="jsx-"][class*="event-content"]',
                '[class*="jsx-"][class*="event-details"]',
                '[class*="jsx-"][class*="event-info"]',
                '[class*="jsx-"][class*="event-header"]',
                // Fallback selectors
                '[class*="event-theme"]',
                '[class*="event-content"]',
                '[class*="event-details"]',
                '[class*="event-info"]',
                '[class*="event-header"]',
                // Additional selectors
                '[class*="jsx-"][class*="content"]',
                '[class*="jsx-"][class*="main"]',
                '[class*="jsx-"][class*="body"]',
                '[class*="jsx-"][class*="container"]',
                // Generic selectors
                'div[class*="event"]',
                'div[class*="content"]',
                'div[class*="main"]',
                'div[class*="body"]',
                'div[class*="container"]',
                'main',
                'article',
                'section'
            ];
            
            for (const selector of luMaSelectors) {
                try {
                    console.log(`Debug: Trying lu.ma selector: ${selector}`);
                    const containers = document.querySelectorAll(selector);
                    console.log(`Debug: Found ${containers.length} elements for selector: ${selector}`);
                    
                    for (const container of containers) {
                        if (isValidContainer(container)) {
                            console.log(`Debug: Found valid lu.ma container with selector: ${selector}`, {
                                id: container.id,
                                className: container.className,
                                tagName: container.tagName,
                                dimensions: container.getBoundingClientRect(),
                                isVisible: window.getComputedStyle(container).display !== 'none',
                                hasContent: container.textContent.trim().length > 0
                            });

                            // Set up observer on this container
                            observer.observe(container, {
                                childList: true,
                                subtree: true,
                                attributes: true,
                                attributeFilter: ['class', 'id', 'style'],
                                characterData: true,
                                attributeOldValue: true,
                                characterDataOldValue: true
                            });

                            console.log(`Debug: Observer started for lu.ma container:`, {
                                timestamp: new Date().toISOString(),
                                selector: selector,
                                container: {
                                    id: container.id,
                                    className: container.className,
                                    tagName: container.tagName,
                                    isVisible: window.getComputedStyle(container).display !== 'none',
                                    hasContent: container.textContent.trim().length > 0
                                }
                            });

                            // Check for event details immediately
                            const eventDetailsSelectors = [
                                '[class*="jsx-"][class*="event-details"]',
                                '[class*="event-details"]',
                                '[class*="jsx-"][class*="event-info"]',
                                '[class*="event-info"]',
                                '[class*="jsx-"][class*="event-content"]',
                                '[class*="event-content"]'
                            ];

                            for (const detailsSelector of eventDetailsSelectors) {
                                const eventDetails = container.querySelector(detailsSelector);
                                if (eventDetails) {
                                    console.log('Debug: Found event details in container:', {
                                        selector: detailsSelector,
                                        id: eventDetails.id,
                                        className: eventDetails.className,
                                        tagName: eventDetails.tagName,
                                        isVisible: window.getComputedStyle(eventDetails).display !== 'none',
                                        hasContent: eventDetails.textContent.trim().length > 0,
                                        children: eventDetails.children.length
                                    });

                                    // Check if the event details are actually loaded
                                    if (eventDetails.textContent.trim().length > 0 || eventDetails.children.length > 0) {
                                        console.log('Debug: Event details are loaded and valid');
                                        observer.disconnect();
                                        resolve(eventDetails);
                                        return;
                                    } else {
                                        console.log('Debug: Event details found but appear to be empty');
                                    }
                                }
                            }

                            // If we found a valid container but no event details yet, keep observing
                            return;
                        }
                    }
                } catch (error) {
                    console.warn(`Debug: Error checking lu.ma selector ${selector}:`, error);
                }
            }

            // If no specific container found, try to find any suitable container
            console.log('Debug: No specific lu.ma container found, trying general containers');
            const generalSelectors = [
                'main',
                'article',
                'section',
                'div[class*="content"]',
                'div[class*="main"]',
                'div[class*="body"]',
                'div[class*="container"]',
                'div[class*="event"]',
                'div[class*="details"]'
            ];

            for (const selector of generalSelectors) {
                try {
                    console.log(`Debug: Trying general selector: ${selector}`);
                    const containers = document.querySelectorAll(selector);
                    console.log(`Debug: Found ${containers.length} elements for selector: ${selector}`);
                    
                    for (const container of containers) {
                        if (isValidContainer(container)) {
                            console.log(`Debug: Found valid general container with selector: ${selector}`, {
                                id: container.id,
                                className: container.className,
                                tagName: container.tagName,
                                dimensions: container.getBoundingClientRect()
                            });
                            return container;
                        }
                    }
                } catch (error) {
                    console.warn(`Debug: Error checking general selector ${selector}:`, error);
                }
            }

            // If still no container found, try document.body
            console.log('Debug: No specific or general container found, using document.body');
            if (isValidContainer(document.body)) {
                return document.body;
            }
        }

        // Rest of the container finding logic
        const currentSite = Object.keys(siteSelectors).find(site => currentUrl.includes(site));
        if (currentSite && siteSelectors[currentSite]) {
            console.log('Trying site-specific selectors for:', currentSite);
            for (const selector of siteSelectors[currentSite]) {
                try {
                    const container = document.querySelector(selector);
                    if (isValidContainer(container)) {
                        console.log('Found valid container using site-specific selector');
                        return container;
                    }
                } catch (error) {
                    console.warn('Error checking site-specific selector:', error);
                }
            }
        }

        // Try common selectors
        console.log('Trying common selectors');
        for (const selector of commonSelectors) {
            try {
                const containers = document.querySelectorAll(selector);
                for (const container of containers) {
                    if (isValidContainer(container)) {
                        console.log('Found valid container using common selector');
                        return container;
                    }
                }
            } catch (error) {
                console.warn('Error checking common selector:', error);
            }
        }

        // If no container found and we haven't retried too many times, wait and try again
        if (retryCount < 3) {
            console.log(`Retrying container search (attempt ${retryCount + 1} of 3)`);
            await new Promise(resolve => setTimeout(resolve, 1000));
            return findContainer(retryCount + 1);
        }

        console.warn('No suitable container found after retries, using document.body');
        return document.body;
    } catch (error) {
        console.error('Debug: Error finding container:', error);
        return document.body;
    }
}

// Function to extract event data from page
function extractEventDataFromPage() {
    console.log('Debug: Starting extractEventDataFromPage');
    const data = {
        name: '',
        image: '',
        startDate: '',
        endDate: '',
        location: {
            name: '',
            city: '',
            province: '',
            country: ''
        }
    };

    try {
        const currentUrl = window.location.href;
        console.log('Debug: Current URL:', currentUrl);

        // Extract meta tag data first
        const metaData = extractEventDataFromMetaTags();
        console.log('Debug: Extracted meta data:', metaData);

        // Merge meta data with existing data
        if (metaData.title) data.name = metaData.title;
        if (metaData.image) data.image = metaData.image;
        if (metaData.date) data.startDate = metaData.date;
        if (metaData.location) data.location.name = metaData.location;

        // If no name found, try to get it from the page title
        if (!data.name) {
            data.name = document.title || 'Untitled Event';
        }

        // If no image found, try to find it in the page
        if (!data.image) {
            const ogImage = document.querySelector('meta[property="og:image"]')?.content;
            const twitterImage = document.querySelector('meta[name="twitter:image"]')?.content;
            const firstImage = document.querySelector('img')?.src;
            data.image = ogImage || twitterImage || firstImage || '';
        }

        // If no date found, try to find it in the page
        if (!data.startDate) {
            const dateElement = document.querySelector('time[datetime]')?.getAttribute('datetime') ||
                              document.querySelector('[class*="date"]')?.textContent ||
                              document.querySelector('[class*="time"]')?.textContent;
            data.startDate = dateElement || new Date().toISOString();
        }

        // If no location found, try to find it in the page
        if (!data.location.name) {
            const locationElement = document.querySelector('[class*="location"]')?.textContent ||
                                  document.querySelector('[class*="venue"]')?.textContent ||
                                  document.querySelector('[class*="address"]')?.textContent;
            data.location.name = locationElement || 'Unknown Location';
        }

        console.log('Debug: Final extracted data:', data);
        return data;
    } catch (error) {
        console.error('Debug: Error in extractEventDataFromPage:', error);
        throw error;
    }
}

// Function to generate event data
async function generateEventData(site) {
    console.log('Debug: Starting generateEventData for site:', site);
    
    try {
        // First try to get data from the page itself
        let pageData;
        try {
            pageData = extractEventDataFromPage();
            console.log('Debug: Extracted page data:', pageData);
        } catch (error) {
            console.warn('Debug: Failed to extract page data, using defaults:', error);
            pageData = {
                name: document.title || 'Untitled Event',
                image: '',
                startDate: new Date().toISOString(),
                endDate: new Date().toISOString(),
                location: {
                    name: 'Unknown Location',
                    city: 'Unknown City',
                    province: 'Unknown Province',
                    country: 'Canada'
                }
            };
        }

        // Create event data object with validated page data
        const eventData = {
            title: (pageData.name || document.title || 'Untitled Event').trim(),
            image: (pageData.image || '').trim(),
            startDate: pageData.startDate ? pageData.startDate.trim() : new Date().toISOString(),
            endDate: pageData.endDate ? pageData.endDate.trim() : new Date().toISOString(),
            location: {
                name: (pageData.location?.name || 'Unknown Location').trim(),
                city: (pageData.location?.city || 'Unknown City').trim(),
                province: (pageData.location?.province || 'Unknown Province').trim(),
                country: (pageData.location?.country || 'Canada').trim()
            }
        };

        // Generate event ID
        const dateDigits = new Date(eventData.startDate).toISOString().split('T')[0].replace(/-/g, '');
        const cleanTitle = eventData.title.toLowerCase().replace(/[^a-z0-9]/g, '').substring(0, 10);
        const cleanLocation = eventData.location.name.toLowerCase().replace(/[^a-z0-9]/g, '').substring(0, 5);
        const eventId = `${cleanTitle}${cleanLocation}${dateDigits}`;

        console.log('Debug: Generated event data:', {
            eventId,
            eventData,
            cleanTitle,
            cleanLocation,
            dateDigits
        });

        return { eventData, eventId };
    } catch (error) {
        console.error('Debug: Error in generateEventData:', error);
        throw error;
    }
}

// Function to format location
function formatLocation(location) {
    if (!location) return '';
    
    try {
        // Remove any HTML tags
        location = location.replace(/<[^>]*>/g, '');
        
        // Remove extra whitespace
        location = location.trim().replace(/\s+/g, ' ');
        
        // Remove common prefixes
        location = location.replace(/^location:?\s*/i, '');
        location = location.replace(/^venue:?\s*/i, '');
        location = location.replace(/^address:?\s*/i, '');
        
        // Remove any trailing punctuation
        location = location.replace(/[.,;:]$/, '');
        
        console.log('Debug: Formatted location:', location);
        return location;
    } catch (error) {
        console.error('Debug: Error formatting location:', error);
        return location;
    }
}

// Function to show error message
function showError(message) {
    console.error('Debug: Error:', message);
    
    // Create error element if it doesn't exist
    let errorElement = document.getElementById('popin-error-message');
    if (!errorElement) {
        errorElement = document.createElement('div');
        errorElement.id = 'popin-error-message';
        errorElement.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: #dc3545;
            color: white;
            padding: 10px 20px;
            border-radius: 4px;
            z-index: 999999;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            font-size: 14px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.2);
        `;
        document.body.appendChild(errorElement);
    }
    
    // Update error message
    errorElement.textContent = message;
    
    // Remove error message after 5 seconds
    setTimeout(() => {
        if (errorElement && errorElement.parentNode) {
            errorElement.parentNode.removeChild(errorElement);
        }
    }, 5000);
}

// Function to extract event data from meta tags
function extractEventDataFromMetaTags() {
    console.log('Debug: Extracting event data from meta tags');
    
    // Extract basic event data
    const title = document.querySelector('meta[property="og:title"]')?.content;
    const img = document.querySelector('meta[property="og:image"]')?.content;
    const eventDescription = document.querySelector('meta[property="og:description"]')?.content;
    const eventUrl = document.querySelector('meta[property="og:url"]')?.content;

    // Extract additional meta data with more comprehensive selectors
    const eventDate = document.querySelector('meta[property="og:start_time"]')?.content ||
                     document.querySelector('meta[property="event:start_time"]')?.content ||
                     document.querySelector('meta[property="article:published_time"]')?.content ||
                     document.querySelector('time[datetime]')?.getAttribute('datetime');

    // Try to find location from various meta tags
    const eventLocation = document.querySelector('meta[property="og:street-address"]')?.content ||
                         document.querySelector('meta[property="og:locality"]')?.content ||
                         document.querySelector('meta[property="og:region"]')?.content ||
                         document.querySelector('meta[property="og:country-name"]')?.content ||
                         document.querySelector('[class*="location"]')?.textContent ||
                         document.querySelector('[class*="venue"]')?.textContent ||
                         document.querySelector('[class*="address"]')?.textContent;

    // Lu.ma specific selectors
    let luMaDate = eventDate;
    let luMaLocation = eventLocation;
    
    if (window.location.hostname.includes('lu.ma')) {
        console.log('Debug: Detected Lu.ma site, using specific selectors');
        
        // Try to find date from Lu.ma's structure
        const dateSelectors = [
            // Primary selectors
            '[class*="jsx-"][class*="event-date"]',
            '[class*="event-date"]',
            '[class*="date"]',
            // Additional selectors
            '[class*="jsx-"][class*="date-time"]',
            '[class*="date-time"]',
            '[class*="jsx-"][class*="event-time"]',
            '[class*="event-time"]',
            // Time elements
            'time[datetime]',
            '[class*="jsx-"][class*="time"]',
            '[class*="time"]'
        ];

        for (const selector of dateSelectors) {
            const elements = document.querySelectorAll(selector);
            for (const element of elements) {
                const dateText = element.textContent.trim();
                console.log(`Debug: Checking date element with selector ${selector}:`, dateText);
                
                // Try to parse the date text
                if (dateText) {
                    // Look for common date patterns
                    const datePatterns = [
                        /(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]* \d{1,2}(?:st|nd|rd|th)?,? \d{4}/i,
                        /\d{1,2}(?:st|nd|rd|th)? (?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*,? \d{4}/i,
                        /\d{4}-\d{2}-\d{2}/,
                        /\d{1,2}\/\d{1,2}\/\d{4}/
                    ];

                    for (const pattern of datePatterns) {
                        const match = dateText.match(pattern);
                        if (match) {
                            luMaDate = match[0];
                            console.log('Debug: Found date match:', luMaDate);
                            break;
                        }
                    }

                    if (luMaDate) break;
                }
            }
            if (luMaDate) break;
        }

        // Try to find location from Lu.ma's structure
        const locationSelectors = [
            // Primary selectors
            '[class*="jsx-"][class*="event-location"]',
            '[class*="event-location"]',
            '[class*="location"]',
            // Additional selectors
            '[class*="jsx-"][class*="venue"]',
            '[class*="venue"]',
            '[class*="jsx-"][class*="address"]',
            '[class*="address"]',
            // Event details
            '[class*="jsx-"][class*="event-details"]',
            '[class*="event-details"]'
        ];

        for (const selector of locationSelectors) {
            const elements = document.querySelectorAll(selector);
            for (const element of elements) {
                const locationText = element.textContent.trim();
                console.log(`Debug: Checking location element with selector ${selector}:`, locationText);
                
                if (locationText) {
                    // Look for common location patterns
                    const locationPatterns = [
                        // Major Canadian cities
                        /(?:Toronto|Vancouver|Montreal|Calgary|Ottawa|Edmonton|Halifax|Victoria|Winnipeg|Quebec City|Hamilton|Kitchener|London|Mississauga|Brampton|Surrey|Burnaby|Richmond|Vaughan|Markham|Oakville|Burlington|Oshawa|Barrie|Guelph|Cambridge|Waterloo|Kingston|St. Catharines|Niagara Falls|Windsor|Saskatoon|Regina|St. John's|Charlottetown|Fredericton|Moncton|Saint John|Yellowknife|Whitehorse|Iqaluit)/i,
                        // Address patterns
                        /\d+\s+[A-Za-z\s]+(?:Street|St|Avenue|Ave|Road|Rd|Boulevard|Blvd|Drive|Dr|Lane|Ln|Court|Ct|Circle|Cir|Place|Pl|Square|Sq|Terrace|Ter|Way|Highway|Hwy|Parkway|Pkwy)/i,
                        // Postal code pattern
                        /[A-Z]\d[A-Z]\s?\d[A-Z]\d/i
                    ];

                    for (const pattern of locationPatterns) {
                        const match = locationText.match(pattern);
                        if (match) {
                            luMaLocation = match[0];
                            console.log('Debug: Found location match:', luMaLocation);
                            break;
                        }
                    }

                    if (luMaLocation) break;
                }
            }
            if (luMaLocation) break;
        }

        // If we still don't have a location, try to find it in the event details
        if (!luMaLocation) {
            const eventDetails = document.querySelector('[class*="jsx-"][class*="event-details"]') ||
                               document.querySelector('[class*="event-details"]');
            if (eventDetails) {
                const locationText = eventDetails.textContent;
                console.log('Debug: Checking event details for location:', locationText);
                
                // Look for location indicators
                const locationIndicators = [
                    'Location:',
                    'Venue:',
                    'Address:',
                    'Where:',
                    'Place:'
                ];

                for (const indicator of locationIndicators) {
                    const index = locationText.indexOf(indicator);
                    if (index !== -1) {
                        const afterIndicator = locationText.slice(index + indicator.length);
                        const endOfLine = afterIndicator.indexOf('\n');
                        const location = endOfLine !== -1 ? 
                            afterIndicator.slice(0, endOfLine).trim() : 
                            afterIndicator.trim();
                        
                        if (location) {
                            luMaLocation = location;
                            console.log('Debug: Found location after indicator:', luMaLocation);
                            break;
                        }
                    }
                }
            }
        }
    }

    // Try to find date from page content if not in meta tags
    let pageDate = luMaDate || eventDate;
    if (!pageDate) {
        const dateElements = document.querySelectorAll('[class*="date"], [class*="time"], time');
        for (const element of dateElements) {
            const dateText = element.textContent.trim();
            if (dateText && /20\d{2}/.test(dateText)) { // Look for years in 2000s
                pageDate = dateText;
                break;
            }
        }
    }

    // Try to find location from page content if not in meta tags
    let pageLocation = luMaLocation || eventLocation;
    if (!pageLocation) {
        const locationElements = document.querySelectorAll('[class*="location"], [class*="venue"], [class*="address"]');
        for (const element of locationElements) {
            const locationText = element.textContent.trim();
            if (locationText && locationText.length > 0) {
                pageLocation = locationText;
                break;
            }
        }
    }

    // Log extracted data
    console.log('Debug: Extracted meta data:', {
        title,
        img,
        description: eventDescription,
        url: eventUrl,
        date: pageDate,
        location: pageLocation
    });

    // Send data to extension
    if (title || img) {
        chrome.runtime.sendMessage({
            type: "eventData",
            title,
            image: img,
            description: eventDescription,
            url: eventUrl,
            date: pageDate,
            location: pageLocation
        }, response => {
            console.log('Debug: Event data sent to extension:', response);
        });
    }

    return {
        title,
        image: img,
        description: eventDescription,
        url: eventUrl,
        date: pageDate,
        location: pageLocation
    };
}

// Function to initialize extension
async function initializeExtension() {
    try {
        console.log('Debug: Initializing extension');
        
        // Extract event data
        const eventData = await extractEventDataFromPage();
        console.log('Debug: Extracted event data:', eventData);
        
        if (!eventData) {
            showError('No event data found on this page');
            return;
        }
        
        // Generate event ID using the generateEventId function
        const eventId = generateEventId(eventData);
        console.log('Debug: Generated event ID:', eventId);
        
        // Format location if it exists
        if (eventData.location) {
            // Handle location formatting
            let locationString = '';
            if (typeof eventData.location === 'object' && eventData.location !== null) {
                // If location is an object, combine its properties
                const parts = [
                    eventData.location.name,
                    eventData.location.city,
                    eventData.location.province,
                    eventData.location.country
                ].filter(Boolean);
                locationString = parts.join(', ');
            } else {
                // If location is a string, use it directly
                locationString = String(eventData.location);
            }
            
            // Clean up the location string
            locationString = locationString
                .replace(/<[^>]*>/g, '') // Remove HTML tags
                .trim()
                .replace(/\s+/g, ' ') // Remove extra whitespace
                .replace(/^location:?\s*/i, '') // Remove common prefixes
                .replace(/^venue:?\s*/i, '')
                .replace(/^address:?\s*/i, '')
                .replace(/[.,;:]$/, ''); // Remove trailing punctuation
            
            eventData.location = locationString;
            console.log('Debug: Formatted location:', locationString);
        }
        
        // Store event data
        const dataToStore = {
            eventData,
            eventId,
            lastUpdated: new Date().toISOString()
        };
        
        console.log('Debug: Storing event data:', dataToStore);
        
        // Send data to background script
        chrome.runtime.sendMessage({
            type: 'eventData',
            title: eventData.name,
            image: eventData.image,
            date: eventData.startDate,
            location: eventData.location,
            description: eventData.description,
            url: eventData.url
        }, response => {
            if (chrome.runtime.lastError) {
                console.error('Debug: Error storing event data:', chrome.runtime.lastError);
                showError('Failed to store event data');
                return;
            }
            
            if (response && response.status === 'success') {
                console.log('Debug: Event data stored successfully');
                // Create popup after successful data storage
                createPopup(eventData);
            } else {
                console.error('Debug: Failed to store event data');
                showError('Failed to store event data');
            }
        });
        
    } catch (error) {
        console.error('Debug: Error in initializeExtension:', error);
        showError('Failed to initialize extension');
    }
}

// Start the extension
console.log('Debug: Starting extension');
initializeExtension().catch(error => {
    console.error('Debug: Error starting extension:', error);
    showError('Failed to start extension. Please try again.');
});

// Also try to initialize after a short delay
setTimeout(() => {
    console.log('Debug: Attempting delayed initialization');
    initializeExtension().catch(error => {
        console.error('Debug: Error in delayed initialization:', error);
    });
}, 2000);

// Test function to set sample event data
function setTestEventData() {
    console.log("Setting test event data...");
    chrome.storage.local.set({ 
        eventTitle: "Test Event", 
        eventImage: "https://via.placeholder.com/300",
        eventDate: new Date().toISOString(),
        eventLocation: "Test Location, Test City, Test Province"
    }, () => {
        console.log("Test event data saved successfully");
        // Verify the data was saved
        chrome.storage.local.get(['eventTitle', 'eventImage'], (data) => {
            console.log("Retrieved test data:", data);
        });
    });
}

// Call test function when content script loads
setTestEventData();

// Function to send message to parent window
function sendMessageToParent(message) {
    try {
        // Get the extension ID from the current URL
        const extensionId = chrome.runtime.id;
        const targetOrigin = `chrome-extension://${extensionId}`;
        
        console.log("Sending message to parent:", {
            message,
            targetOrigin
        });
        
        window.parent.postMessage(message, targetOrigin);
    } catch (error) {
        console.error("Error sending message to parent:", error);
    }
}

// Add message event listener for Popin iframe communication
window.addEventListener('message', (event) => {
    if (event.origin === "https://beta.popin.site") {
        console.log("Received data from popin.site:", event.data);
        
        // Handle different message types
        if (event.data.type === 'eventUpdate') {
            // Update stored event data
            chrome.storage.local.set({
                eventTitle: event.data.title,
                eventImage: event.data.image,
                eventDate: event.data.date,
                eventLocation: event.data.location
            }, () => {
                console.log("Updated event data from Popin:", event.data);
                // Send confirmation back to Popin
                sendMessageToParent({ 
                    type: 'eventUpdateConfirmation',
                    status: 'success'
                });
            });
        } else if (event.data.type === 'closePopup') {
            // Handle popup close request
            const popup = document.querySelector('.popin_iframe_container');
            if (popup) {
                popup.remove();
            }
            // Send confirmation back to Popin
            sendMessageToParent({ 
                type: 'closePopupConfirmation',
                status: 'success'
            });
        } else if (event.data.type === 'auth') {
            // Handle authentication status
            sendMessageToParent({ 
                type: 'auth',
                status: 'auth-success'
            });
        }
    }
});

// Also set up a MutationObserver to watch for dynamic meta tag changes
const observer = new MutationObserver(mutations => {
    mutations.forEach(mutation => {
        if (mutation.type === 'childList' && 
            mutation.addedNodes.length > 0 && 
            mutation.addedNodes[0].tagName === 'META') {
            console.log('Debug: Meta tags changed, re-extracting data');
            extractEventDataFromMetaTags();
        }
    });
});

// Start observing the document head for meta tag changes
observer.observe(document.head, {
    childList: true,
    subtree: true
});
