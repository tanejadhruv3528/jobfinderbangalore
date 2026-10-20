import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Briefcase, Trash2, Calendar, MapPin, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';
import { fetchMyJobs, deleteJob } from '@/services/jobService';
import { useAuth } from '@/contexts/AuthContext';
import { Job } from '@/types';
import Header from '@/components/Header';

const MyJobCardSkeleton = () => (
  <Card className="overflow-hidden">
    <CardContent className="p-6">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0 space-y-3">
          <Skeleton className="h-6 w-48" />
          <div className="space-y-2">
            <Skeleton className="h-4 w-64" />
            <Skeleton className="h-4 w-32" />
          </div>
        </div>
        <Skeleton className="h-9 w-28 rounded-md" />
      </div>
    </CardContent>
  </Card>
);

const MyJobs = () => {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [deletingJobId, setDeletingJobId] = useState<string | null>(null);
  const { toast } = useToast();
  const { user } = useAuth();

  // Fetch jobs on mount (protected route ensures user is authenticated)
  useEffect(() => {
    if (!user) return;

    const loadJobs = async () => {
      setIsLoading(true);
      try {
        const data = await fetchMyJobs(user.id);
        setJobs(data);
      } catch (error) {
        console.error('Error fetching jobs:', error);
        toast({
          title: "Error",
          description: error instanceof Error ? error.message : "Failed to fetch jobs. Please try again.",
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
      }
    };

    loadJobs();
  }, [toast, user]);

  const handleDeleteJob = async (jobId: string) => {
    setDeletingJobId(jobId);

    try {
      await deleteJob(jobId);
      
      // Optimistically remove job from list
      setJobs(prev => prev.filter(job => job.id !== jobId));

      toast({
        title: "Job Deleted",
        description: "The job has been removed from the map.",
      });
    } catch (error) {
      console.error('Error deleting job:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to delete job. Please try again.",
        variant: "destructive",
      });
    } finally {
      setDeletingJobId(null);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-IN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main className="container mx-auto px-4 pt-24 pb-12">
        <div className="max-w-2xl mx-auto">
          {/* Page Header */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary/10 mb-4">
              <Briefcase className="w-8 h-8 text-primary" />
            </div>
            <h1 className="text-3xl font-bold text-foreground mb-2">My Jobs</h1>
            <p className="text-muted-foreground">
              View and manage the jobs you've posted
            </p>
          </div>

          {/* Jobs List */}
          <div className="space-y-4">
            {isLoading ? (
              <div className="space-y-4">
                <MyJobCardSkeleton />
                <MyJobCardSkeleton />
                <MyJobCardSkeleton />
              </div>
            ) : jobs.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <Briefcase className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-foreground mb-2">No jobs found</h3>
                  <p className="text-muted-foreground mb-6">
                    You haven't posted any jobs yet.
                  </p>
                  <Button asChild>
                    <Link to="/post-a-job">Post Your First Job</Link>
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <>
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-semibold text-foreground">
                    {jobs.length} {jobs.length === 1 ? 'Job' : 'Jobs'}
                  </h2>
                  <Button asChild size="sm">
                    <Link to="/post-a-job">Post New Job</Link>
                  </Button>
                </div>

                {jobs.map((job) => (
                  <Card key={job.id} className="overflow-hidden">
                    <CardContent className="p-6">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <h3 className="text-lg font-semibold text-foreground truncate">
                            {job.title}
                          </h3>
                          
                          <div className="mt-2 space-y-1.5">
                            {job.location && (
                              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                <MapPin className="w-4 h-4 shrink-0" />
                                <span className="truncate">
                                  {job.location.address || job.location.city}
                                </span>
                              </div>
                            )}
                            
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                              <Calendar className="w-4 h-4 shrink-0" />
                              <span>Posted {formatDate(job.createdAt)}</span>
                            </div>
                          </div>
                        </div>

                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button
                              variant="outline"
                              size="sm"
                              className="shrink-0 text-destructive hover:text-destructive hover:bg-destructive/10"
                              disabled={deletingJobId === job.id}
                            >
                              {deletingJobId === job.id ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                              ) : (
                                <>
                                  <Trash2 className="w-4 h-4 mr-2" />
                                  Delete Job
                                </>
                              )}
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Delete this job?</AlertDialogTitle>
                              <AlertDialogDescription>
                                This will permanently remove "{job.title}" from the job map. This action cannot be undone.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => handleDeleteJob(job.id)}
                                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                              >
                                Delete
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </>
            )}
          </div>
        </div>
      </main>
    </div>
  );
};

export default MyJobs;
