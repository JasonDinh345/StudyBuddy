export default function PomodoroTimer({
                                          timerState,
                                          onToggle,
                                          onReset,
                                          isFullscreen = false,
                                      }) {
    const minutes = Math.floor(timerState.timeLeft / 60);
    const seconds = timerState.timeLeft % 60;
    const formattedTime = `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
    const showSeconds = 30;

    let timerWarning = "";
    if (timerState.isRunning && timerState.mode === "study") {
        if (timerState.timeLeft <= 900 && timerState.timeLeft > 900 - showSeconds) {
            timerWarning = "15 MINUTES REMAINING!";
        } else if (timerState.timeLeft <= 600 && timerState.timeLeft > 600 - showSeconds) {
            timerWarning = "10 MINUTES REMAINING!";
        } else if (timerState.timeLeft <= 300 && timerState.timeLeft > 300 - showSeconds) {
            timerWarning = "5 MINUTES REMAINING!";
        }
    }

    if (isFullscreen) {
        return (
            <div className="fullscreen-timer">
                <h2>Focus Timer</h2>
                <div className="big-timer-display">{formattedTime}</div>
                <div className="timer-warning-slot big">
                    {timerWarning && (
                        <span key={timerWarning} className="timer-warning">
              {timerWarning}
            </span>
                    )}
                </div>
                <div className="timer-controls big-controls">
                    <button onClick={onToggle} className="primary-btn">
                        {timerState.isRunning ? "Pause" : "Start"}
                    </button>
                    <button onClick={() => onReset(25)} className="nav-action-btn">
                        Reset (25m)
                    </button>
                    <button onClick={() => onReset(5)} className="nav-action-btn">
                        Rest (5m)
                    </button>
                </div>
            </div>
        );
    }

    return (
        <section className="card-box timer-card">
            <h3>Timer</h3>
            <div className="timer-display">{formattedTime}</div>
            <div className="timer-warning-slot">
                {timerWarning && (
                    <span key={timerWarning} className="timer-warning">
            {timerWarning}
          </span>
                )}
            </div>
            <div className="timer-controls">
                <button onClick={onToggle} className="icon-btn" aria-label="Start or Pause Timer">
                    {timerState.isRunning ? "❚❚" : "▶"}
                </button>
                <button
                    onClick={() => onReset(timerState.mode === "study" ? 25 : 5)}
                    className="icon-btn"
                    aria-label="Reset Timer"
                >
                    ↻
                </button>
            </div>
            <div className="timer-mode-buttons">
                <button
                    onClick={() => onReset(25)}
                    className={`mode-btn ${timerState.mode === "study" ? "active-mode" : ""}`}
                >
                    Study (25m)
                </button>
                <button
                    onClick={() => onReset(5)}
                    className={`mode-btn ${timerState.mode === "rest" ? "active-mode" : ""}`}
                >
                    Rest (5m)
                </button>
            </div>
        </section>
    );
}