import { NavLink } from "react-router-dom";
import logoImg from "../assets/logo.png";

export default function Sidebar({ isOpen, onToggle }) {
    const getNavClass = ({ isActive }) => `nav-item ${isActive ? "active" : ""}`;

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

                <nav className="sidebar-nav" aria-label="Primary navigation">
                    <NavLink to="/" end className={getNavClass}>
                        Dashboard
                    </NavLink>
                    <NavLink to="/flashcards" className={getNavClass}>
                        Flashcards
                    </NavLink>
                    <NavLink to="/timer" className={getNavClass}>
                        Timer
                    </NavLink>
                </nav>

                <div className="sidebar-footer">
                    <p>Small steps everyday lead to big results</p>
                    <div className="footer-star">★</div>
                </div>
            </aside>
        </>
    );
}