(() => {
  // Prevent double injection
  if (document.getElementById("focusbear-tts-button")) return;

  let isSpeaking = false;
  let isPaused = false;

  // ─── Create floating button ───────────────────────────────────────────────
  const btn = document.createElement("button");
  btn.id = "focusbear-tts-button";
  btn.title = "Read selected text aloud";
  btn.innerHTML = `
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24"
      fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/>
      <path d="M19.07 4.93a10 10 0 0 1 0 14.14"/>
      <path d="M15.54 8.46a5 5 0 0 1 0 7.07"/>
    </svg>`;

  Object.assign(btn.style, {
    position: "fixed",
    bottom: "80px",
    right: "20px",
    zIndex: "2147483647",
    width: "48px",
    height: "48px",
    borderRadius: "50%",
    border: "none",
    backgroundColor: "#4A90D9",
    color: "#ffffff",
    cursor: "pointer",
    boxShadow: "0 4px 12px rgba(0,0,0,0.25)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    transition: "background-color 0.2s ease, transform 0.1s ease",
    outline: "none",
  });

  // ─── Create stop button ───────────────────────────────────────────────────
  const stopBtn = document.createElement("button");
  stopBtn.id = "focusbear-tts-stop";
  stopBtn.title = "Stop reading";
  stopBtn.innerHTML = `
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24"
      fill="currentColor">
      <rect x="4" y="4" width="16" height="16" rx="2"/>
    </svg>`;

  Object.assign(stopBtn.style, {
    position: "fixed",
    bottom: "80px",
    right: "76px",
    zIndex: "2147483647",
    width: "40px",
    height: "40px",
    borderRadius: "50%",
    border: "none",
    backgroundColor: "#e74c3c",
    color: "#ffffff",
    cursor: "pointer",
    boxShadow: "0 4px 12px rgba(0,0,0,0.25)",
    display: "none",
    alignItems: "center",
    justifyContent: "center",
    transition: "background-color 0.2s ease",
    outline: "none",
  });

  // ─── Create status tooltip ────────────────────────────────────────────────
  const tooltip = document.createElement("div");
  tooltip.id = "focusbear-tts-tooltip";

  Object.assign(tooltip.style, {
    position: "fixed",
    bottom: "136px",
    right: "20px",
    zIndex: "2147483647",
    backgroundColor: "rgba(0,0,0,0.75)",
    color: "#fff",
    padding: "4px 10px",
    borderRadius: "12px",
    fontSize: "12px",
    fontFamily: "sans-serif",
    pointerEvents: "none",
    display: "none",
    whiteSpace: "nowrap",
  });

  document.body.appendChild(tooltip);
  document.body.appendChild(stopBtn);
  document.body.appendChild(btn);

  // ─── Helpers ──────────────────────────────────────────────────────────────
  const showTooltip = (text: string, durationMs = 2000) => {
    tooltip.textContent = text;
    tooltip.style.display = "block";
    setTimeout(() => (tooltip.style.display = "none"), durationMs);
  };

  const setReadingState = (reading: boolean) => {
    isSpeaking = reading;
    btn.style.backgroundColor = reading ? "#e67e22" : "#4A90D9";
    btn.title = reading ? "Pause reading" : "Read selected text aloud";
    stopBtn.style.display = reading ? "flex" : "none";

    // swap icon: pause or speaker
    if (reading) {
      btn.innerHTML = `
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24"
          fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/>
        </svg>`;
    } else {
      isPaused = false;
      btn.innerHTML = `
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24"
          fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/>
          <path d="M19.07 4.93a10 10 0 0 1 0 14.14"/>
          <path d="M15.54 8.46a5 5 0 0 1 0 7.07"/>
        </svg>`;
    }
  };

  const getTextToRead = (): string => {
    const selected = window.getSelection()?.toString().trim();
    if (selected && selected.length > 0) return selected;

    // Fall back to main content area
    const selectors = ["article", "main", "[role='main']", ".article-body", "#content", "body"];
    for (const sel of selectors) {
      const el = document.querySelector(sel);
      if (el) {
        const text = (el as HTMLElement).innerText?.trim();
        if (text && text.length > 20) return text;
      }
    }
    return "";
  };

  const speak = (text: string) => {
    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 1;
    utterance.pitch = 1;
    utterance.volume = 1;

    utterance.onstart = () => setReadingState(true);
    utterance.onend = () => setReadingState(false);
    utterance.onerror = (e) => {
      if (e.error !== "interrupted") {
        showTooltip("Speech error. Try again.");
      }
      setReadingState(false);
    };

    window.speechSynthesis.speak(utterance);
  };

  // ─── Button click: play / pause / resume ─────────────────────────────────
  btn.addEventListener("click", () => {
    btn.style.transform = "scale(0.9)";
    setTimeout(() => (btn.style.transform = "scale(1)"), 100);

    if (isSpeaking) {
      // Pause
      window.speechSynthesis.pause();
      isPaused = true;
      isSpeaking = false;
      btn.style.backgroundColor = "#27ae60";
      btn.title = "Resume reading";
      btn.innerHTML = `
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24"
          fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <polygon points="5 3 19 12 5 21 5 3"/>
        </svg>`;
      showTooltip("Paused");
      return;
    }

    if (isPaused) {
      // Resume
      window.speechSynthesis.resume();
      setReadingState(true);
      showTooltip("Resumed");
      return;
    }

    // Fresh read
    const text = getTextToRead();
    if (!text) {
      showTooltip("Nothing to read. Select some text first.");
      return;
    }

    showTooltip("Reading...", 1500);
    speak(text);
  });

  // ─── Stop button ──────────────────────────────────────────────────────────
  stopBtn.addEventListener("click", () => {
    window.speechSynthesis.cancel();
    setReadingState(false);
    showTooltip("Stopped");
  });

  // ─── Stop speech when navigating away ────────────────────────────────────
  window.addEventListener("beforeunload", () => {
    window.speechSynthesis.cancel();
  });

  // ─── Hover effects ────────────────────────────────────────────────────────
  btn.addEventListener("mouseenter", () => {
    btn.style.filter = "brightness(1.15)";
  });
  btn.addEventListener("mouseleave", () => {
    btn.style.filter = "brightness(1)";
  });
  stopBtn.addEventListener("mouseenter", () => {
    stopBtn.style.filter = "brightness(1.15)";
  });
  stopBtn.addEventListener("mouseleave", () => {
    stopBtn.style.filter = "brightness(1)";
  });
})();

