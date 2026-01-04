import { MapPin, Briefcase, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Link, useLocation } from 'react-router-dom';

const Header = () => {
  const location = useLocation();
  const isAdmin = location.pathname.startsWith('/admin') || location.pathname.startsWith('/auth');

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-card/80 backdrop-blur-lg border-b border-border">
      <div className="container mx-auto px-4 h-16 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2 group">
          <div className="w-10 h-10 gradient-primary rounded-xl flex items-center justify-center shadow-glow transition-transform group-hover:scale-105">
            <MapPin className="w-5 h-5 text-primary-foreground" />
          </div>
          <span className="text-xl font-bold text-foreground">
            Nearby<span className="text-primary">Jobs</span>
          </span>
        </Link>

        <nav className="hidden md:flex items-center gap-6">
          <Link 
            to="/" 
            className={`text-sm font-medium transition-colors hover:text-primary ${
              location.pathname === '/' ? 'text-primary' : 'text-muted-foreground'
            }`}
          >
            Find Jobs
          </Link>
          <Link 
            to="/admin" 
            className={`text-sm font-medium transition-colors hover:text-primary ${
              isAdmin ? 'text-primary' : 'text-muted-foreground'
            }`}
          >
            For Employers
          </Link>
        </nav>

        <div className="flex items-center gap-3">
          {!isAdmin ? (
            <Link to="/auth">
              <Button variant="outline" size="sm" className="hidden sm:flex">
                <User className="w-4 h-4 mr-2" />
                Employer Login
              </Button>
            </Link>
          ) : (
            <Link to="/">
              <Button variant="outline" size="sm">
                <Briefcase className="w-4 h-4 mr-2" />
                Browse Jobs
              </Button>
            </Link>
          )}
        </div>
      </div>
    </header>
  );
};

export default Header;
