* {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
  font-family: system-ui, sans-serif;
}

body {
  background: #000;
  overflow: hidden;
  color: #eee;
}

#gameCanvas {
  position: fixed;
  inset: 0;
  display: block;
}

/* UI overlay */
#ui {
  position: fixed;
  top: 10px;
  left: 10px;
  z-index: 10;
  background: rgba(0, 0, 0, 0.6);
  padding: 10px 14px;
  border-radius: 6px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  backdrop-filter: blur(4px);
  min-width: 220px;
}

.stat {
  font-size: 14px;
  margin-bottom: 4px;
}

.buttons {
  margin-top: 8px;
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
}

button {
  background: #222;
  color: #eee;
  border: 1px solid #555;
  padding: 4px 8px;
  border-radius: 4px;
  cursor: pointer;
  font-size: 12px;
}

button:hover {
  background: #333;
}

/* Center overlay for start / game over */
#overlay {
  position: fixed;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  background: radial-gradient(circle at top, #111 0, #000 60%);
  color: #eee;
  z-index: 20;
}

#title {
  font-size: 40px;
  letter-spacing: 4px;
  margin-bottom: 10px;
  text-transform: uppercase;
}

#subtitle {
  font-size: 16px;
  margin-bottom: 20px;
  opacity: 0.8;
}

#overlay button {
  font-size: 16px;
  padding: 8px 16px;
}

/* Message text (warnings, game over, etc.) */
#message {
  margin-top: 6px;
  font-size: 12px;
  min-height: 16px;
  color: #f66;
}
