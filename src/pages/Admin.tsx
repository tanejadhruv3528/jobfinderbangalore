import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { 
  Building2, MapPin, Briefcase, Plus, LayoutDashboard, 
  Settings, LogOut, ChevronRight, Star, Eye, Loader2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import Header from '@/components/Header';
import { useAuth } from '@/contexts/AuthContext';
import { useQuery } from '@tanstack/react-query';
import { fetchCompanies, fetchUserJobs, fetchLocations } from '@/services/jobService';
import { mockCompanies, mockJobs, mockLocations } from '@/data/mockData';

const Admin = () => {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'companies' | 'jobs'>('dashboard');
  const { user, loading: authLoading, signOut } = useAuth();
  const navigate = useNavigate();

  // Redirect to auth if not logged in
  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/auth', { state: { from: { pathname: '/admin' } } });
    }
  }, [user, authLoading, navigate]);

  // Fetch user's companies
  const { data: companies = [], isLoading: companiesLoading } = useQuery({
    queryKey: ['companies', user?.id],
    queryFn: () => fetchCompanies(user?.id),
    enabled: !!user,
  });

  // Fetch user's jobs
  const { data: jobs = [], isLoading: jobsLoading } = useQuery({
    queryKey: ['userJobs', user?.id],
    queryFn: () => fetchUserJobs(user!.id),
    enabled: !!user,
  });

  // Fetch all locations for user's companies
  const { data: locations = [] } = useQuery({
    queryKey: ['locations', user?.id],
    queryFn: async () => {
      const allLocations = await Promise.all(
        companies.map(c => fetchLocations(c.id))
      );
      return allLocations.flat();
    },
    enabled: companies.length > 0,
  });

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  // Show loading state
  if (authLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  // Use mock data if no real data
  const displayCompanies = companies.length > 0 ? companies : mockCompanies;
  const displayJobs = jobs.length > 0 ? jobs : mockJobs;
  const displayLocations = locations.length > 0 ? locations : mockLocations;

  const featuredCount = displayJobs.filter(j => j.isFeatured).length;

  const stats = [
    { label: 'Total Jobs', value: displayJobs.length, icon: Briefcase, color: 'text-primary' },
    { label: 'Companies', value: displayCompanies.length, icon: Building2, color: 'text-job-parttime' },
    { label: 'Locations', value: displayLocations.length, icon: MapPin, color: 'text-job-contract' },
    { label: 'Featured', value: featuredCount, icon: Star, color: 'text-job-featured' },
  ];

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <div className="pt-16 flex">
        {/* Sidebar */}
        <aside className="w-64 h-[calc(100vh-4rem)] bg-card border-r border-border fixed left-0 top-16">
          <div className="p-4">
            <div className="flex items-center gap-3 mb-8 p-3 bg-accent/50 rounded-xl">
              <div className="w-10 h-10 gradient-primary rounded-lg flex items-center justify-center">
                <Building2 className="w-5 h-5 text-primary-foreground" />
              </div>
              <div className="min-w-0">
                <p className="font-semibold text-sm truncate">{user?.email || 'Employer'}</p>
                <p className="text-xs text-muted-foreground">Employer</p>
              </div>
            </div>

            <nav className="space-y-1">
              <button
                onClick={() => setActiveTab('dashboard')}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  activeTab === 'dashboard' 
                    ? 'bg-primary text-primary-foreground' 
                    : 'text-muted-foreground hover:bg-accent hover:text-foreground'
                }`}
              >
                <LayoutDashboard className="w-4 h-4" />
                Dashboard
              </button>
              <button
                onClick={() => setActiveTab('companies')}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  activeTab === 'companies' 
                    ? 'bg-primary text-primary-foreground' 
                    : 'text-muted-foreground hover:bg-accent hover:text-foreground'
                }`}
              >
                <Building2 className="w-4 h-4" />
                Companies
              </button>
              <button
                onClick={() => setActiveTab('jobs')}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  activeTab === 'jobs' 
                    ? 'bg-primary text-primary-foreground' 
                    : 'text-muted-foreground hover:bg-accent hover:text-foreground'
                }`}
              >
                <Briefcase className="w-4 h-4" />
                Job Postings
              </button>
            </nav>

            <div className="absolute bottom-4 left-4 right-4 space-y-1">
              <button className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-muted-foreground hover:bg-accent hover:text-foreground transition-colors">
                <Settings className="w-4 h-4" />
                Settings
              </button>
              <button 
                onClick={handleSignOut}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
              >
                <LogOut className="w-4 h-4" />
                Sign Out
              </button>
            </div>
          </div>
        </aside>

        {/* Main content */}
        <main className="flex-1 ml-64 p-8">
          {activeTab === 'dashboard' && (
            <div className="space-y-8 animate-fade-in">
              <div className="flex items-center justify-between">
                <div>
                  <h1 className="text-2xl font-bold">Dashboard</h1>
                  <p className="text-muted-foreground">Welcome back! Here's an overview of your activity.</p>
                </div>
                <Button variant="hero">
                  <Plus className="w-4 h-4" />
                  Post New Job
                </Button>
              </div>

              {/* Stats */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {stats.map((stat) => (
                  <Card key={stat.label} className="hover:shadow-lg transition-shadow">
                    <CardContent className="pt-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm text-muted-foreground">{stat.label}</p>
                          <p className="text-3xl font-bold mt-1">{stat.value}</p>
                        </div>
                        <div className={`w-12 h-12 rounded-xl bg-accent flex items-center justify-center ${stat.color}`}>
                          <stat.icon className="w-6 h-6" />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>

              {/* Recent Jobs */}
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle>Recent Job Postings</CardTitle>
                      <CardDescription>Your latest job listings</CardDescription>
                    </div>
                    <Button variant="ghost" size="sm" onClick={() => setActiveTab('jobs')}>
                      View All
                      <ChevronRight className="w-4 h-4" />
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  {jobsLoading ? (
                    <div className="flex items-center justify-center py-8">
                      <Loader2 className="w-6 h-6 animate-spin text-primary" />
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {displayJobs.slice(0, 5).map((job) => (
                        <div key={job.id} className="flex items-center justify-between p-4 bg-muted/30 rounded-xl hover:bg-muted/50 transition-colors">
                          <div className="flex items-center gap-4">
                            <div className="w-10 h-10 bg-accent rounded-lg flex items-center justify-center">
                              <Briefcase className="w-5 h-5 text-accent-foreground" />
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <p className="font-medium">{job.title}</p>
                                {job.isFeatured && (
                                  <Badge variant="featured" className="text-xs">
                                    <Star className="w-3 h-3 mr-1" />
                                    Featured
                                  </Badge>
                                )}
                              </div>
                              <p className="text-sm text-muted-foreground">{job.role} • {job.jobType}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-4">
                            <div className="text-right">
                              <div className="flex items-center gap-1 text-sm text-muted-foreground">
                                <Eye className="w-4 h-4" />
                                <span>--</span>
                              </div>
                            </div>
                            <Button variant="ghost" size="sm">
                              <ChevronRight className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          )}

          {activeTab === 'companies' && (
            <div className="space-y-8 animate-fade-in">
              <div className="flex items-center justify-between">
                <div>
                  <h1 className="text-2xl font-bold">Companies</h1>
                  <p className="text-muted-foreground">Manage your company profiles and locations</p>
                </div>
                <Button variant="hero">
                  <Plus className="w-4 h-4" />
                  Add Company
                </Button>
              </div>

              {companiesLoading ? (
                <div className="flex items-center justify-center py-16">
                  <Loader2 className="w-8 h-8 animate-spin text-primary" />
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {displayCompanies.map((company) => (
                    <Card key={company.id} variant="job">
                      <CardContent className="pt-6">
                        <div className="flex items-start gap-4">
                          {company.logo ? (
                            <img 
                              src={company.logo} 
                              alt={company.name}
                              className="w-14 h-14 rounded-xl object-cover"
                            />
                          ) : (
                            <div className="w-14 h-14 gradient-primary rounded-xl flex items-center justify-center">
                              <Building2 className="w-7 h-7 text-primary-foreground" />
                            </div>
                          )}
                          <div className="flex-1">
                            <h3 className="font-semibold">{company.name}</h3>
                            <p className="text-sm text-muted-foreground">{company.industry}</p>
                            <div className="flex items-center gap-2 mt-2">
                              <Badge variant="secondary">
                                <MapPin className="w-3 h-3 mr-1" />
                                {displayLocations.filter(l => l.companyId === company.id).length} locations
                              </Badge>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'jobs' && (
            <div className="space-y-8 animate-fade-in">
              <div className="flex items-center justify-between">
                <div>
                  <h1 className="text-2xl font-bold">Job Postings</h1>
                  <p className="text-muted-foreground">Manage and create job listings</p>
                </div>
                <Button variant="hero">
                  <Plus className="w-4 h-4" />
                  Post New Job
                </Button>
              </div>

              {jobsLoading ? (
                <div className="flex items-center justify-center py-16">
                  <Loader2 className="w-8 h-8 animate-spin text-primary" />
                </div>
              ) : (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  {displayJobs.map((job) => {
                    const company = displayCompanies.find(c => c.id === job.companyId);
                    const location = displayLocations.find(l => l.id === job.locationId);
                    
                    return (
                      <Card key={job.id} variant={job.isFeatured ? 'featured' : 'job'}>
                        <CardContent className="pt-6">
                          <div className="flex items-start gap-4">
                            {company?.logo ? (
                              <img 
                                src={company.logo} 
                                alt={company?.name}
                                className="w-12 h-12 rounded-lg object-cover"
                              />
                            ) : (
                              <div className="w-12 h-12 gradient-primary rounded-lg flex items-center justify-center">
                                <Briefcase className="w-6 h-6 text-primary-foreground" />
                              </div>
                            )}
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <h3 className="font-semibold">{job.title}</h3>
                                {job.isFeatured && (
                                  <Badge variant="featured">
                                    <Star className="w-3 h-3 mr-1" />
                                    Featured
                                  </Badge>
                                )}
                              </div>
                              <p className="text-sm text-muted-foreground">{company?.name}</p>
                              <div className="flex items-center gap-3 mt-2 text-sm text-muted-foreground">
                                <span className="flex items-center gap-1">
                                  <MapPin className="w-3 h-3" />
                                  {location?.city || job.location?.city}
                                </span>
                                <Badge variant="secondary">{job.jobType}</Badge>
                              </div>
                            </div>
                            <Button variant="ghost" size="icon">
                              <ChevronRight className="w-4 h-4" />
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </main>
      </div>
    </div>
  );
};

export default Admin;
