import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom/client';
import './popup.css';

function App() {
  const [isEnabled, setIsEnabled] = useState(false);
  const [showFullForm, setShowFullForm] = useState(false);  // New state for controlling form visibility

  useEffect(() => {
    // Load saved state
    chrome.storage.sync.get(['isBlockingEnabled'], (result) => {
      setIsEnabled(result.isBlockingEnabled || false);
    });
  }, []);

  const handleToggle = async () => {
    const newState = !isEnabled;
    setIsEnabled(newState);
    
    console.log('Toggle clicked, new state:', newState); // Debug log
    
    // Save state
    await chrome.storage.sync.set({ isBlockingEnabled: newState });

    // Send message to content script
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0]?.id) {
        console.log('Sending message to tab:', tabs[0].id); // Debug log
        chrome.tabs.sendMessage(tabs[0].id, {
          action: 'toggleBlocking',
          isEnabled: newState
        }, (response) => {
          console.log('Response received:', response); // Debug log
        });
      }
    });

    // Close popup after toggle
    window.close();
  };

  const handleSubmit = () => {
    // Trigger the blocking effect immediately
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0]?.id) {
        chrome.tabs.sendMessage(tabs[0].id, {
          action: 'toggleBlocking',
          isEnabled: isEnabled
        });
      }
    });
    // Close popup after submit
    window.close();
  };

  // Simple toggle-only view
  if (!showFullForm) {
    return (
      <div className="popup popup-simple">
        <div className="popup-header">
          <img src="/icons/bearLogo.png" alt="Focus Bear Logo" className="popup-logo" />
          <div className="popup-title">YouTube</div>
        </div>
        
        <div className="toggle-container">
          Block Distractions
          <div className={`toggle ${isEnabled ? 'enabled' : ''}`} onClick={handleToggle}>
            <div className="toggle-slider"></div>
          </div>
        </div>
        
        <div className="popup-status">
          {isEnabled ? 'Blocking Enabled' : 'Blocking Disabled'}
        </div>
      </div>
    );
  }

  // Full form view (kept for future use)
  return (
    <div className="popup">
      {/* Header with logo + "YouTube" text */}
      <div className="popup-header">
        <img src="/icons/bearLogo.png" alt="Focus Bear Logo" className="popup-logo" />
        <div className="popup-title">YouTube</div>
      </div>

      {/* Body content */}
      <div className="popup-body">
        <label htmlFor="intention">What is your intention here?</label>
        <input type="text" id="intention" placeholder="Enter your intention..." />

        <label htmlFor="minutes">Question 2: How long do you want to stay?</label>
        <div className="popup-duration-row">
          <span>Custom:</span>
          <input
            type="number"
            id="minutes"
            placeholder="minutes"
            className="popup-duration-input"
          />
        </div>

        <label className="toggle-container">
          Block Distractions
          <div className={`toggle ${isEnabled ? 'enabled' : ''}`} onClick={handleToggle}>
            <div className="toggle-slider"></div>
          </div>
        </label>

        <div className="popup-status">
          {isEnabled ? 'Blocking Enabled' : 'Blocking Disabled'}
        </div>
      </div>

      {/* Submit button */}
      <button className="popup-submit" onClick={handleSubmit}>Submit</button>
    </div>
  );
}

// Renders the App component into #root
const rootElement = document.getElementById('root');
if (rootElement) {
  const root = ReactDOM.createRoot(rootElement);
  root.render(<App />);
} else {
  console.error("Root element not found!");
}
