import { NavLink } from 'react-router-dom';

export interface SidebarNavItem {
  to: string;
  label: string;
  icon: string;
  end?: boolean;
}

interface SidebarProps {
  brand: string;
  items: SidebarNavItem[];
  show: boolean;
  onNavigate: () => void;
}

export function Sidebar({ brand, items, show, onNavigate }: SidebarProps) {
  return (
    <>
      <aside className={`ic-sidebar d-flex flex-column p-3 ${show ? 'show' : ''}`} aria-label="Primary navigation">
        <div className="d-flex align-items-center mb-4 px-1">
          <i className="bi bi-graph-up-arrow text-primary fs-4 me-2" aria-hidden="true" />
          <span className="fw-bold fs-5">{brand}</span>
        </div>
        <nav className="ic-sidebar-nav d-flex flex-column gap-1 overflow-auto flex-grow-1">
          {items.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              onClick={onNavigate}
              className={({ isActive }) => `nav-link d-flex align-items-center gap-2 ${isActive ? 'active' : ''}`}
            >
              <i className={`bi ${item.icon}`} aria-hidden="true" />
              <span>{item.label}</span>
            </NavLink>
          ))}
        </nav>
      </aside>
      {show && (
        <button
          type="button"
          aria-label="Close navigation"
          onClick={onNavigate}
          className="d-lg-none position-fixed top-0 start-0 w-100 h-100 border-0 bg-dark bg-opacity-50"
          style={{ zIndex: 1030 }}
        />
      )}
    </>
  );
}
