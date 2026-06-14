import axios from 'axios';

const API = process.env.REACT_APP_BACKEND_URL;
let eventQueue = [];
let flushTimer = null;

export function trackEvent(event, properties = {}) {
  const route = window.location.pathname;
  eventQueue.push({
    event,
    properties: { ...properties, route },
    timestamp: new Date().toISOString()
  });

  // Flush every 3 seconds or when queue hits 10
  if (eventQueue.length >= 10) {
    flushEvents();
  } else if (!flushTimer) {
    flushTimer = setTimeout(flushEvents, 3000);
  }
}

async function flushEvents() {
  if (flushTimer) { clearTimeout(flushTimer); flushTimer = null; }
  if (eventQueue.length === 0) return;

  const batch = [...eventQueue];
  eventQueue = [];

  try {
    await axios.post(`${API}/api/events/track-batch`, { events: batch }, { withCredentials: true });
  } catch {
    // Re-queue on failure (max 100)
    eventQueue = [...batch.slice(-50), ...eventQueue].slice(0, 100);
  }
}

// Flush on page unload
if (typeof window !== 'undefined') {
  window.addEventListener('beforeunload', flushEvents);
}
