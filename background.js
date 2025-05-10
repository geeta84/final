// Keep the service worker alive
chrome.runtime.onInstalled.addListener(() => {
    console.log('Event Button Extension installed and service worker activated.');
    
    // Initialize Lu.ma API token if not already set
    chrome.storage.local.get(['luMaApiToken'], (result) => {
        if (!result.luMaApiToken) {
            // You should replace this with your actual API token
            // In production, this should be set through a secure configuration process
            chrome.storage.local.set({ 
                luMaApiToken: 'YOUR_LUMA_API_TOKEN'
            }, () => {
                console.log('Lu.ma API token initialized');
            });
        }
    });
});

// Function to fetch Lu.ma events
async function fetchLuMaEvents() {
    try {
        console.log('Debug: Fetching Lu.ma events from server');
        
        // Get the API token from storage
        const { luMaApiToken } = await chrome.storage.local.get(['luMaApiToken']);
        
        if (!luMaApiToken) {
            throw new Error('Lu.ma API token not found');
        }

        // First try to get events from the current tab
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        if (!tab) {
            throw new Error('No active tab found');
        }

        // Check if we're on a Lu.ma page
        if (tab.url.includes('lu.ma')) {
            console.log('Debug: On Lu.ma page, attempting to extract event data');
            
            try {
                // Send message to content script to get event data
                const response = await chrome.tabs.sendMessage(tab.id, { type: 'getEventData' });
                if (response && response.eventData) {
                    console.log('Debug: Received event data from content script:', response.eventData);
                    
                    // Store the event data
                    await chrome.storage.local.set({ 
                        luMaEvents: [response.eventData],
                        luMaEventsLastUpdated: new Date().toISOString()
                    });
                    
                    return [response.eventData];
                }
            } catch (contentScriptError) {
                console.warn('Debug: Failed to get data from content script:', contentScriptError);
                // Continue to API fallback
            }
        }

        // If not on Lu.ma page or couldn't get data from content script, try API
        console.log('Debug: Attempting to fetch from Lu.ma API');
        
        const response = await fetch("https://api.lu.ma/api/v1/events", {
            method: 'GET',
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${luMaApiToken}`,
                "Accept": "application/json",
                "Origin": chrome.runtime.getURL(""),
                "Access-Control-Allow-Origin": "*"
            },
            mode: "cors",
            credentials: "include"
        });
        
        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            const errorMessage = `Lu.ma API error: ${response.status} - ${errorData.message || response.statusText}`;
            console.error('Debug: API request failed:', {
                status: response.status,
                statusText: response.statusText,
                errorData,
                headers: Object.fromEntries(response.headers.entries())
            });
            throw new Error(errorMessage);
        }
        
        const data = await response.json();
        console.log('Debug: Lu.ma events fetched successfully:', data);
        
        // Store the events data with timestamp
        await chrome.storage.local.set({ 
            luMaEvents: data,
            luMaEventsLastUpdated: new Date().toISOString()
        });
        
        return data;
    } catch (error) {
        console.error('Debug: Error fetching Lu.ma events:', {
            message: error.message,
            stack: error.stack,
            name: error.name,
            timestamp: new Date().toISOString()
        });
        
        // Store detailed error information
        await chrome.storage.local.set({
            luMaEventsError: {
                message: error.message,
                name: error.name,
                stack: error.stack,
                timestamp: new Date().toISOString(),
                url: window.location.href
            }
        });

        // If we're on a Lu.ma page, try to get data from the page itself as a last resort
        try {
            const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
            if (tab && tab.url.includes('lu.ma')) {
                console.log('Debug: Attempting to get event data from page content as fallback');
                const response = await chrome.tabs.sendMessage(tab.id, { type: 'getEventData' });
                if (response && response.eventData) {
                    console.log('Debug: Retrieved event data from page content:', response.eventData);
                    return [response.eventData];
                }
            }
        } catch (pageError) {
            console.error('Debug: Error getting event data from page:', {
                message: pageError.message,
                stack: pageError.stack,
                name: pageError.name
            });
        }
        
        // If all attempts fail, throw the original error
        throw error;
    }
}

// Listen for messages from content script
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    console.log('Background script received message:', message);

    // Handle the message asynchronously
    (async () => {
        try {
            if (message.type === 'eventData') {
                // Store event data in Chrome storage
                await chrome.storage.local.set({
                    eventTitle: message.title,
                    eventImage: message.image,
                    eventDate: message.date,
                    eventLocation: message.location,
                    eventDescription: message.description,
                    eventUrl: message.url,
                    lastUpdated: new Date().toISOString()
                });

                console.log('Event data stored:', {
                    title: message.title,
                    image: message.image,
                    date: message.date,
                    location: message.location
                });
                
                sendResponse({ status: 'success' });
            } else if (message.type === 'fetchLuMaEvents') {
                const data = await fetchLuMaEvents();
                sendResponse({ status: 'success', data });
            } else if (message.type === 'setLuMaApiToken') {
                await chrome.storage.local.set({ 
                    luMaApiToken: message.token 
                });

                console.log('Lu.ma API token updated');
                sendResponse({ status: 'success' });
            }
        } catch (error) {
            console.error('Error handling message:', error);
            sendResponse({ 
                status: 'error', 
                error: error.message || 'Unknown error occurred'
            });
        }
    })();

    // Return true to indicate we will send a response asynchronously
    return true;
});

// Listen for tab updates to clear stored data when leaving event pages
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
    if (changeInfo.status === 'loading') {
        // Check if we're leaving an event page
        const isEventPage = (
            tab.url?.includes('lu.ma') ||
            tab.url?.includes('meetup.com/events/') ||
            tab.url?.includes('eventbrite.ca/e/') ||
            tab.url?.includes('allevents.in/')
        );

        if (!isEventPage) {
            // Clear stored event data when leaving event pages
            chrome.storage.local.remove([
                'eventTitle',
                'eventImage',
                'eventDate',
                'eventLocation',
                'eventDescription',
                'eventUrl',
                'lastUpdated'
            ], () => {
                console.log('Cleared event data for non-event page');
            });
        }
    }
});

// Periodic check to keep service worker alive and refresh Lu.ma events
setInterval(async () => {
    console.log('Service worker heartbeat');
    try {
        // Check if we need to refresh the events
        const { luMaEventsLastUpdated } = await chrome.storage.local.get(['luMaEventsLastUpdated']);
        const lastUpdate = luMaEventsLastUpdated ? new Date(luMaEventsLastUpdated) : null;
        const now = new Date();
        
        // Refresh if last update was more than 5 minutes ago or never
        if (!lastUpdate || (now - lastUpdate) > 5 * 60 * 1000) {
            await fetchLuMaEvents();
        }
    } catch (error) {
        console.error('Failed to refresh Lu.ma events:', error);
    }
}, 30000); // Check every 30 seconds
