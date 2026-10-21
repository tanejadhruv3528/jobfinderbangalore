import { useState } from 'react';
import { Link, NavLink, useLocation } from 'react-router-dom';
import { LogOut, Menu, Plus, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Logo from '@/components/brand/Logo';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';

const navLinkClass = ({ isActive }: { isActive: boolean }) =>
  cn(
    'rounded-full px-3.5 py-2 text-sm font-medium transition-colors',
    isActive ? 'bg-secondary text-foreground' : 'text-muted-foreground hover:text-foreground',
  );

const Header = () => {
  const { user, signOut } = useAuth();
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);
  const onAuthPage = location.pathname.startsWith('/auth');

  const links = [
    { to: '/', label: 'Find jobs', end: true },
    ...(user ? [{ to: '/my-jobs', label: 'My listings', end: false }] : []),
  ];

  return (
    <header className="sticky top-0 z-50 border-b border-border/80 bg-background/85 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-[1600px] items-center justify-between gap-4 px-4 md:px-6">
        <div className="flex items-center gap-6">
          <Logo />
          <nav className="hidden items-center gap-1 md:flex">
            {links.map((link) => (
              <NavLink key={link.to} to={link.to} end={link.end} className={navLinkClass}>
                {link.label}
              </NavLink>
            ))}
          </nav>
        </div>

        <div className="hidden items-center gap-2 md:flex">
          {user ? (
            <>
              <span className="mr-1 max-w-[180px] truncate text-sm text-muted-foreground" title={user.email}>
                {user.companyName || user.email}
              </span>
              <Button variant="ghost" size="sm" onClick={signOut}>
                <LogOut />
                Sign out
              </Button>
            </>
          ) : (
            !onAuthPage && (
              <Button variant="ghost" size="sm" asChild>
                <Link to="/auth">Employer sign in</Link>
              </Button>
            )
          )}
          <Button variant="ink" size="sm" asChild>
            <Link to="/post-a-job">
              <Plus />
              Post a job
            </Link>
          </Button>
        </div>

        <button
          type="button"
          className="-mr-2 flex h-10 w-10 items-center justify-center rounded-full text-foreground hover:bg-secondary md:hidden"
          onClick={() => setMenuOpen((open) => !open)}
          aria-label={menuOpen ? 'Close menu' : 'Open menu'}
          aria-expanded={menuOpen}
        >
          {menuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      {menuOpen && (
        <div className="animate-fade-up border-t border-border bg-background px-4 pb-5 pt-3 md:hidden">
          <nav className="flex flex-col gap-1">
            {links.map((link) => (
              <NavLink
                key={link.to}
                to={link.to}
                end={link.end}
                onClick={() => setMenuOpen(false)}
                className={({ isActive }) =>
                  cn('rounded-xl px-3 py-3 text-base font-medium', isActive ? 'bg-secondary' : 'text-foreground/80')
                }
              >
                {link.label}
              </NavLink>
            ))}
            {!user && (
              <NavLink
                to="/auth"
                onClick={() => setMenuOpen(false)}
                className="rounded-xl px-3 py-3 text-base font-medium text-foreground/80"
              >
                Employer sign in
              </NavLink>
            )}
          </nav>
          <div className="mt-3 flex flex-col gap-2">
            <Button variant="ink" size="lg" asChild onClick={() => setMenuOpen(false)}>
              <Link to="/post-a-job">
                <Plus />
                Post a job
              </Link>
            </Button>
            {user && (
              <Button
                variant="outline"
                size="lg"
                onClick={() => {
                  setMenuOpen(false);
                  signOut();
                }}
              >
                <LogOut />
                Sign out
              </Button>
            )}
          </div>
        </div>
      )}
    </header>
  );
};

export default Header;
