// Popup script for Popin Chrome Extension

document.addEventListener('DOMContentLoaded', () => {
    try {
        // Get event data from storage
        chrome.storage.local.get(['eventTitle', 'eventImage', 'eventDate', 'eventLocation', 'googleEventId', 'linkedinEventId'], data => {
            const eventInfo = document.querySelector('.event-info');
            if (!eventInfo) return;

            // Clear loading state
            const status = document.getElementById('status');
            if (status) {
                status.textContent = data.eventTitle ? 'Event data loaded' : 'No event data found';
            }

            // Update event title
            const titleElement = document.getElementById('event-title');
            if (titleElement) {
                titleElement.textContent = data.eventTitle || 'No event title available';
            }

            // Update event date
            const dateElement = document.getElementById('event-date');
            if (dateElement) {
                dateElement.textContent = data.eventDate || 'No date available';
            }

            // Update event location
            const locationElement = document.getElementById('event-location');
            if (locationElement) {
                locationElement.textContent = data.eventLocation || 'No location available';
            }

            // Add event image if available
            if (data.eventImage) {
                const img = document.createElement('img');
                img.src = data.eventImage;
                img.style.cssText = `
                    width: 100%;
                    height: 200px;
                    object-fit: cover;
                    border-radius: 8px;
                    margin-bottom: 15px;
                `;
                eventInfo.insertBefore(img, eventInfo.firstChild);
            }

            // Enable open button if we have event data
            const openButton = document.getElementById('open-button');
            if (openButton) {
                openButton.disabled = !data.eventTitle;
            }
        });

        // Set up button event listeners
        const openButton = document.getElementById('open-button');
        const closeButton = document.getElementById('close-button');

        if (openButton) {
            openButton.addEventListener('click', () => {
                // Get current event data
                chrome.storage.local.get([
                    'eventTitle', 
                    'eventImage', 
                    'eventDate', 
                    'eventLocation',
                    'googleEventId',
                    'linkedinEventId'
                ], data => {
                    if (data.eventTitle) {
                        // Get current tab URL for source tracking
                        chrome.tabs.query({active: true, currentWindow: true}, tabs => {
                            const sourceUrl = tabs[0]?.url || '';
                            
                            // Construct URL with event data
                            const params = new URLSearchParams({
                                title: data.eventTitle,
                                img: data.eventImage || '',
                                date: data.eventDate || '',
                                location: data.eventLocation || '',
                                source: sourceUrl,
                                googleEventId: data.googleEventId || '',
                                linkedinEventId: data.linkedinEventId || '',
                                timestamp: new Date().toISOString(),
                                sourceType: sourceUrl.includes('lu.ma') ? 'luma' :
                                          sourceUrl.includes('meetup.com') ? 'meetup' :
                                          sourceUrl.includes('eventbrite.ca') ? 'eventbrite' :
                                          sourceUrl.includes('allevents.in') ? 'allevents' : 'other'
                            });

                            // Add auth parameters
                            params.append('skipAuthSession', 'true');
                            params.append('isIframe', 'false');
                            params.append('authMode', 'none');

                            // Open new tab with Popin
                            chrome.tabs.create({
                                url: `https://beta.popin.site?${params.toString()}`
                            }, () => {
                                // Close the popup after opening the new tab
                                window.close();
                            });
                        });
                    }
                });
            });
        }

        if (closeButton) {
            closeButton.addEventListener('click', () => {
                window.close();
            });
        }

    } catch (e) {
        console.error('Popup error:', e);
        const status = document.getElementById('status');
        if (status) {
            status.textContent = 'Error loading event data';
            status.style.color = '#f44336';
        }
    }
}); 
