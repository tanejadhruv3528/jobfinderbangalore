import { MapPin, Briefcase, User, LogOut, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';

const Header = () => {
  const location = useLocation();
  const { user, signOut } = useAuth();
  const isEmployerSection = location.pathname.startsWith('/my-jobs') || 
                            location.pathname.startsWith('/auth') || 
                            location.pathname.startsWith('/post-a-job');

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
          <span className="hidden sm:inline-flex ml-2 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide bg-muted text-muted-foreground rounded-full border border-border">
            Beta
          </span>
        </Link>

        <nav className="hidden md:flex items-center gap-6">
          <Link 
            to="/" 
            className={`text-sm font-medium transition-colors hover:text-primary ${
              location.pathname === '/' ? 'text-primary' : 'text-muted-foreground'
            }`}
          >
            Browse Jobs
          </Link>
          {user && (
            <>
              <Link 
                to="/post-a-job" 
                className={`text-sm font-medium transition-colors hover:text-primary ${
                  location.pathname === '/post-a-job' ? 'text-primary' : 'text-muted-foreground'
                }`}
              >
                Post a Job
              </Link>
              <Link 
                to="/my-jobs" 
                className={`text-sm font-medium transition-colors hover:text-primary ${
                  location.pathname === '/my-jobs' ? 'text-primary' : 'text-muted-foreground'
                }`}
              >
                My Jobs
              </Link>
            </>
          )}
        </nav>

        <div className="flex items-center gap-3">
          {user ? (
            <>
              <Link to="/post-a-job" className="hidden sm:block">
                <Button variant="hero" size="sm">
                  <Plus className="w-4 h-4 mr-2" />
                  Post Job
                </Button>
              </Link>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={signOut}
                className="text-muted-foreground hover:text-foreground"
              >
                <LogOut className="w-4 h-4 mr-2" />
                Logout
              </Button>
            </>
          ) : (
            <>
              {!isEmployerSection ? (
                <>
                  <Link to="/">
                    <Button variant="hero" size="sm" className="hidden sm:flex">
                      <Briefcase className="w-4 h-4 mr-2" />
                      Browse Jobs
                    </Button>
                  </Link>
                  <Link to="/auth">
                    <Button variant="ghost" size="sm" className="hidden sm:flex text-muted-foreground hover:text-foreground">
                      <User className="w-4 h-4 mr-2" />
                      Employer Login
                    </Button>
                  </Link>
                </>
              ) : (
                <Link to="/">
                  <Button variant="hero" size="sm">
                    <Briefcase className="w-4 h-4 mr-2" />
                    Browse Jobs
                  </Button>
                </Link>
              )}
            </>
          )}
        </div>
      </div>
    </header>
  );
};

export default Header;
