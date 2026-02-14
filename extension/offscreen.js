chrome.runtime.onMessage.addListener((msg) => {
  if (msg.type === "play_sound") {
    const audio = new Audio(chrome.runtime.getURL("ding.mp3"));
    audio.volume = 0.4;
    audio.play().catch(err => console.error('[Gaze] audio play failed', err));
  }
});
