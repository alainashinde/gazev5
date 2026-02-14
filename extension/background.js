let lastTabId = null;
let lastNotified = 0;
let lastAttentionState = null;

const SERVER_URL = "http://127.0.0.1:5000/log_tab";
const STATUS_URL = "http://127.0.0.1:5000/status";

setInterval(() => chrome.runtime.getPlatformInfo(() => {}), 20000);

// Play sound using offscreen document
async function playSound() {
  const contexts = await chrome.runtime.getContexts({ contextTypes: ["OFFSCREEN_DOCUMENT"] });

  if (contexts.length === 0) {
    await chrome.offscreen.createDocument({
      url: "offscreen.html",
      reasons: ["AUDIO_PLAYBACK"],
      justification: "Play notification sound"
    });
  }

  chrome.runtime.sendMessage({ type: "play_sound" });
}

// Send tab events to server
async function sendEvent(eventType, url) {
  try {
    const res = await chrome.storage.local.get(null);
    const payload = {
      event: eventType,
      url,
      username: res.gaze_username || 'default_user',
      focus_domains: res.gaze_domains || [],
      blocked_domains: res.blocked_domains || []
    };
    await fetch(SERVER_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
  } catch (e) {
    console.error(e);
  }
}

// Notifications
async function notify(message, type) {
  const s = await chrome.storage.local.get(null);
  if (!s.gaze_enabled) return;

  const now = Date.now();

  // 5 sec cooldown for attention alerts
  if ((type === 'eyes_away' || type === 'face_missing') && now - lastNotified < 5000) return;

  // 2 sec cooldown for normal alerts
  if (now - lastNotified < 2000) return;

  chrome.notifications.create({
    type: 'basic',
    iconUrl: chrome.runtime.getURL('icons/bell.png'),
    title: 'Gaze',
    message
  });

  // Sound only for eyes/face
  if (s.notify_sound && (type === 'eyes_away' || type === 'face_missing')) {
    playSound();
  }

  lastNotified = now;
}

// Tab listeners
chrome.tabs.onActivated.addListener(async (info) => {
  const settings = await chrome.storage.local.get(null);
  if (settings.gaze_enabled === false) return;

  const tab = await chrome.tabs.get(info.tabId);
  if (!tab || !tab.url) return;

  const focus = settings.gaze_domains || [];
  const blocked = settings.blocked_domains || [];

  const isFocus = focus.some(d => tab.url.includes(d));
  const isBlocked = blocked.some(d => tab.url.includes(d));

  if (isBlocked && settings.notify_blocked_site) {
    sendEvent('blocked_site', tab.url);
    notify('Blocked site opened — focus back!', 'blocked');
  }

  if (lastTabId && lastTabId !== tab.id && !isFocus) {
    if (settings.notify_tab_switch) {
      sendEvent('tab_switch', tab.url);
      notify('You switched tabs', 'tab_switch');
    }
  }

  lastTabId = tab.id;
});

chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete' && tab.active) {
    sendEvent('tab_focus', tab.url);
  }
});

// Poll server for eye/face status
async function pollStatus() {
  try {
    const settings = await chrome.storage.local.get(null);
    if (!settings.gaze_enabled) return;

    const res = await fetch(STATUS_URL);
    const data = await res.json();

    if (!data || !data.detail) return;

    const detail = data.detail;

    if (detail === "Distracted - Eyes Away" && settings.notify_eyes_away) {
      if (lastAttentionState !== "eyes_away") {
        notify('Eyes away - refocus!', 'eyes_away');
        lastAttentionState = "eyes_away";
      }
    } else if (detail === "Face Not Detected" && settings.notify_face_missing) {
      if (lastAttentionState !== "face_missing") {
        notify('Face not detected — refocus!', 'face_missing');
        lastAttentionState = "face_missing";
      }
    } else if (detail === "Focused") {
      lastAttentionState = null;
    }
  } catch (e) {
    // silent
  }
}

setInterval(pollStatus, 2000);

// Default settings
chrome.runtime.onInstalled.addListener(() => {
  chrome.storage.local.set({
    gaze_username: 'default_user',
    gaze_domains: ['docs.google.com'],
    blocked_domains: ['youtube.com'],
    gaze_enabled: true,
    notify_tab_switch: true,
    notify_blocked_site: true,
    notify_eyes_away: true,
    notify_face_missing: true,
    notify_sound: true
  });
});
