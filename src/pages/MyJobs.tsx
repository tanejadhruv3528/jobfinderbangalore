import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Calendar, Loader2, MapPin, Plus, Star, Trash2, ArrowUpRight, Briefcase } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
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
import CompanyAvatar from '@/components/CompanyAvatar';
import { JOB_TYPE_BADGE, JOB_TYPE_LABELS } from '@/lib/jobTypes';
import { formatDate, postedAgo } from '@/lib/format';

const Stat = ({ label, value }: { label: string; value: string | number }) => (
  <div className="rounded-2xl border border-border bg-card p-4 shadow-sm sm:p-5">
    <p className="text-sm text-muted-foreground">{label}</p>
    <p className="mt-1 font-display text-2xl font-bold sm:text-3xl">{value}</p>
  </div>
);

const RowSkeleton = () => (
  <div className="flex items-center gap-4 rounded-2xl border border-border bg-card p-4 sm:p-5">
    <Skeleton className="h-12 w-12 rounded-2xl" />
    <div className="flex-1 space-y-2">
      <Skeleton className="h-4 w-1/2" />
      <Skeleton className="h-3.5 w-1/3" />
    </div>
    <Skeleton className="hidden h-9 w-24 rounded-full sm:block" />
  </div>
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
        setJobs(await fetchMyJobs(user.id));
      } catch (error) {
        console.error('Error fetching jobs:', error);
        toast({
          title: 'Error',
          description: error instanceof Error ? error.message : 'Failed to fetch jobs. Please try again.',
          variant: 'destructive',
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
      setJobs((prev) => prev.filter((job) => job.id !== jobId));
      toast({ title: 'Job deleted', description: 'The job has been removed from the map.' });
    } catch (error) {
      console.error('Error deleting job:', error);
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to delete job. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setDeletingJobId(null);
    }
  };

  const companyName = user?.companyName || user?.email || '';

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <main className="mx-auto max-w-5xl px-4 pb-20 pt-10 md:px-6 md:pt-14">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.14em] text-primary">Employer dashboard</p>
            <h1 className="mt-3 text-4xl font-bold leading-[1.05] md:text-5xl">Your listings</h1>
            <p className="mt-2 text-muted-foreground">{companyName}</p>
          </div>
          <Button size="lg" asChild>
            <Link to="/post-a-job">
              <Plus />
              Post a job
            </Link>
          </Button>
        </div>

        <div className="mt-8 grid grid-cols-3 gap-3">
          <Stat label="Live jobs" value={isLoading ? '–' : jobs.length} />
          <Stat label="Featured" value={isLoading ? '–' : jobs.filter((j) => j.isFeatured).length} />
          <Stat label="Last posted" value={isLoading ? '–' : jobs[0] ? postedAgo(jobs[0].createdAt) : 'Never'} />
        </div>

        <div className="mt-8 space-y-3">
          {isLoading ? (
            <>
              <RowSkeleton />
              <RowSkeleton />
              <RowSkeleton />
            </>
          ) : jobs.length === 0 ? (
            <div className="bg-paper-grid rounded-3xl border border-dashed border-border px-6 py-16 text-center">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-card shadow-soft">
                <Briefcase className="h-6 w-6 text-primary" />
              </div>
              <h2 className="mt-5 text-2xl font-bold">No jobs pinned yet</h2>
              <p className="mx-auto mt-1.5 max-w-sm text-muted-foreground">
                Post your first job and it shows up on the map for people nearby straight away.
              </p>
              <Button className="mt-6" size="lg" asChild>
                <Link to="/post-a-job">
                  <Plus />
                  Post your first job
                </Link>
              </Button>
            </div>
          ) : (
            jobs.map((job) => (
              <article
                key={job.id}
                className="flex flex-col gap-4 rounded-2xl border border-border bg-card p-4 shadow-sm transition-shadow hover:shadow-soft sm:flex-row sm:items-center sm:p-5"
              >
                <div className="flex min-w-0 flex-1 items-start gap-4">
                  <CompanyAvatar name={job.company?.name || companyName} size="md" />
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="truncate font-sans text-base font-semibold">{job.title}</h3>
                      {job.isFeatured && (
                        <Badge variant="featured">
                          <Star className="h-3 w-3 fill-current" />
                          Featured
                        </Badge>
                      )}
                    </div>
                    <div className="mt-1.5 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
                      <Badge variant={JOB_TYPE_BADGE[job.jobType] ?? 'secondary'}>{JOB_TYPE_LABELS[job.jobType]}</Badge>
                      {job.location && (
                        <span className="flex items-center gap-1.5">
                          <MapPin className="h-3.5 w-3.5" />
                          {job.location.address || job.location.city}
                        </span>
                      )}
                      <span className="flex items-center gap-1.5">
                        <Calendar className="h-3.5 w-3.5" />
                        Posted {formatDate(job.createdAt)}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex shrink-0 items-center gap-2 sm:justify-end">
                  <Button variant="outline" size="sm" className="flex-1 sm:flex-none" asChild>
                    <Link to={`/?job=${job.id}`}>
                      View on map
                      <ArrowUpRight />
                    </Link>
                  </Button>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                        disabled={deletingJobId === job.id}
                        aria-label={`Delete ${job.title}`}
                      >
                        {deletingJobId === job.id ? <Loader2 className="animate-spin" /> : <Trash2 />}
                        Delete
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent className="rounded-3xl">
                      <AlertDialogHeader>
                        <AlertDialogTitle className="font-display text-2xl">Delete this job?</AlertDialogTitle>
                        <AlertDialogDescription>
                          This permanently removes "{job.title}" from the map. It can't be undone.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel className="rounded-full">Keep it</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={() => handleDeleteJob(job.id)}
                          className="rounded-full bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                          Delete job
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </article>
            ))
          )}
        </div>
      </main>
    </div>
  );
};

export default MyJobs;
