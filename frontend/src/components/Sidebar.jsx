import logoImg from "../assets/logo.png";

export default function Sidebar({
                                    isOpen,
                                    onToggle,
                                    activeTab,
                                    onSelectTab,
                                }) {
    return (
        <>
            <button
                className="sidebar-toggle-floating"
                onClick={onToggle}
                title="Toggle Sidebar"
                aria-label="Toggle Sidebar"
            >
                ☰
            </button>

            <aside className={`sidebar ${isOpen ? "open" : "closed"}`}>
                <div className="sidebar-brand">
                    <img src={logoImg} alt="StudyBuddy Logo" className="brand-logo-img" />
                </div>

                <nav className="sidebar-nav">
                    <button
                        className={`nav-item ${activeTab === "dashboard" ? "active" : ""}`}
                        onClick={() => onSelectTab("dashboard")}
                    >
                        Dashboard
                    </button>
                    <button
                        className={`nav-item ${activeTab === "flashcards" ? "active" : ""}`}
                        onClick={() => onSelectTab("flashcards")}
                    >
                        Flashcards
                    </button>
                    <button
                        className={`nav-item ${activeTab === "timer" ? "active" : ""}`}
                        onClick={() => onSelectTab("timer")}
                    >
                        Timer
                    </button>
                </nav>

                <div className="sidebar-footer">
                    <p>Small steps everyday lead to big results</p>
                    <div className="footer-star">★</div>
                </div>
            </aside>
        </>
    );
}