const focusChoices = [
  'docs.google.com',
  'drive.google.com',
  'classroom.google.com',
  'canvas.instructure.com',
  'notion.so'
];

const blockedChoices = [
  'youtube.com',
  'netflix.com',
  'spotify.com',
  'tiktok.com',
  'instagram.com'
];

const defaultSettings = {
  gaze_enabled: true,
  notify_tab_switch: true,
  notify_blocked_site: true,
  notify_eyes_away: true,
  notify_face_missing: true,
  notify_sound: false
};

function makeChip(text){
  const el = document.createElement('div');
  el.className = 'chip';
  el.textContent = text;
  el.addEventListener('click', ()=> el.classList.toggle('active'));
  return el;
}

document.addEventListener('DOMContentLoaded', ()=>{
  const focusArea = document.getElementById('focusPresets');
  const blockedArea = document.getElementById('blockedPresets');

  focusChoices.forEach(c=> focusArea.appendChild(makeChip(c)));
  blockedChoices.forEach(c=> blockedArea.appendChild(makeChip(c)));

  const usernameInput = document.getElementById('username');
  const domainsInput = document.getElementById('domains');
  const blockedInput = document.getElementById('blocked');

  chrome.storage.local.get(null, (res)=>{

    usernameInput.value = res.gaze_username || '';

    domainsInput.value = (res.gaze_domains || []).join(', ');
    blockedInput.value = (res.blocked_domains || []).join(', ');

    document.getElementById('gaze_enabled').checked =
      res.gaze_enabled ?? defaultSettings.gaze_enabled;

    document.getElementById('notify_tab_switch').checked =
      res.notify_tab_switch ?? defaultSettings.notify_tab_switch;

    document.getElementById('notify_blocked_site').checked =
      res.notify_blocked_site ?? defaultSettings.notify_blocked_site;

    document.getElementById('notify_eyes_away').checked =
      res.notify_eyes_away ?? defaultSettings.notify_eyes_away;

    document.getElementById('notify_face_missing').checked =
      res.notify_face_missing ?? defaultSettings.notify_face_missing;

    document.getElementById('notify_sound').checked =
      res.notify_sound ?? defaultSettings.notify_sound;

    const focusArr = res.gaze_domains || [];
    const blockedArr = res.blocked_domains || [];

    Array.from(focusArea.children).forEach(chip=>{
      if(focusArr.includes(chip.textContent)) chip.classList.add('active');
    });

    Array.from(blockedArea.children).forEach(chip=>{
      if(blockedArr.includes(chip.textContent)) chip.classList.add('active');
    });
  });

  document.getElementById('save').addEventListener('click', ()=>{
    const username = usernameInput.value.trim() || 'default_user';

    const selectedFocus = Array.from(document.querySelectorAll('#focusPresets .chip.active')).map(c=>c.textContent);
    const selectedBlocked = Array.from(document.querySelectorAll('#blockedPresets .chip.active')).map(c=>c.textContent);

    const customFocus = domainsInput.value.split(',').map(s=>s.trim()).filter(Boolean);
    const customBlocked = blockedInput.value.split(',').map(s=>s.trim()).filter(Boolean);

    chrome.storage.local.set({
      gaze_username: username,
      gaze_domains: [...new Set([...selectedFocus,...customFocus])],
      blocked_domains: [...new Set([...selectedBlocked,...customBlocked])],
      gaze_enabled: document.getElementById('gaze_enabled').checked,
      notify_tab_switch: document.getElementById('notify_tab_switch').checked,
      notify_blocked_site: document.getElementById('notify_blocked_site').checked,
      notify_eyes_away: document.getElementById('notify_eyes_away').checked,
      notify_face_missing: document.getElementById('notify_face_missing').checked,
      notify_sound: document.getElementById('notify_sound').checked
    }, ()=>{
      alert('Saved.');
    });
  });

  document.getElementById('reset').addEventListener('click', ()=>{
    if(!confirm('Reset settings?')) return;

    chrome.storage.local.clear(()=>{
      alert('Reset complete. Reload extension.');
      location.reload();
    });
  });
});
