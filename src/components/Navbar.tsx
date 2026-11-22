import { Link, useLocation } from "react-router-dom";
import { cn } from "../lib/utils";

export function Navbar() {
  const location = useLocation();

  const links = [
    { name: "Dashboard", href: "/dashboard" },
    { name: "Customers", href: "/customers" },
    { name: "Invoices", href: "/invoices" },
  ];

  return (
    <nav className="flex items-center gap-1 sm:gap-2">
      {links.map((link) => {
        const isActive = location.pathname.startsWith(link.href);
        return (
          <Link
            key={link.name}
            to={link.href}
            className={cn(
              "flex min-h-[44px] items-center rounded-md px-3 py-2 text-sm font-medium transition-colors",
              isActive
                ? "bg-slate-900 text-white"
                : "text-slate-600 hover:bg-slate-100 hover:text-slate-900",
            )}
          >
            {link.name}
          </Link>
        );
      })}
    </nav>
  );
}
