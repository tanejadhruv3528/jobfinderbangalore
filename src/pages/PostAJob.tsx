import { lazy, Suspense, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Link } from "react-router-dom";
import Header from "@/components/Header";
import JobCard from "@/components/JobCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { createJob } from "@/services/jobService";
import { extractLatLngFromGoogleMaps } from "@/lib/maps";
import { useAuth } from "@/contexts/AuthContext";
import { ArrowRight, Check, CircleAlert, Crosshair, Eye, Loader2, Map as MapIcon, MapPin, PartyPopper } from "lucide-react";
import { JOB_TYPES, JOB_TYPE_LABELS } from "@/lib/jobTypes";
import { Job } from "@/types";
import { cn } from "@/lib/utils";
import { friendlyDataError } from "@/lib/errors";
import { BANGALORE_CENTER, calculateDistance } from "@/lib/distance";

// mapbox-gl only loads if the employer opens the picker
const LocationPicker = lazy(() => import("@/components/LocationPicker"));

// Bangalore and its outskirts (Hoskote, Electronic City, Devanahalli airport…)
const MAX_KM_FROM_CENTER = 60;

const toMapsUrl = (latitude: number, longitude: number) =>
  `https://www.google.com/maps?q=${latitude.toFixed(6)},${longitude.toFixed(6)}`;

const GEO_ERRORS: Record<number, string> = {
  1: "Location access is blocked. Allow it in your browser settings, or pick the spot on the map.",
  2: "We couldn't get your location. Try again outdoors, or pick the spot on the map.",
  3: "Getting your location took too long. Try again, or pick the spot on the map.",
};

const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_TOKEN || 'pk.eyJ1IjoidGFuZWphLWRocnV2IiwiYSI6ImNtdmpjZm14czBjaWEyeXNieXoyNHJ2b2sifQ.8NGZ41t_T45oLpYR4ee0Hg';

const formSchema = z.object({
  title: z.string().trim().min(1, "Job title is required").max(100, "Job title must be less than 100 characters"),
  description: z.string().trim().min(1, "Job description is required").max(5000, "Job description must be less than 5000 characters"),
  maps_url: z
    .string()
    .trim()
    .min(1, "Google Maps link is required")
    .refine((url) => !/goo\.gl|maps\.app/i.test(url), {
      message: "Short share links don't include the location. Use \"Use my current location\" or \"Pick on the map\" below, or copy the full URL from Google Maps on a computer.",
    })
    .refine((url) => extractLatLngFromGoogleMaps(url) !== null, {
      message: "Couldn't find a location in this link. Use one of the buttons below, or copy the full URL from the address bar in Google Maps.",
    })
    .refine(
      (url) => {
        const point = extractLatLngFromGoogleMaps(url);
        return !point || calculateDistance(point.latitude, point.longitude, BANGALORE_CENTER.lat, BANGALORE_CENTER.lng) <= MAX_KM_FROM_CENTER;
      },
      { message: "This location is outside Bangalore. JobPins only lists jobs in and around Bangalore." },
    ),
  apply_url: z.string().trim().url("Please enter a valid URL").refine((url) => /^https?:\/\//i.test(url), "Link must start with http:// or https://"),
  area: z.string().trim().max(120, "Keep the area under 120 characters").optional(),
  job_type: z.enum(["full-time", "part-time", "contract", "internship"]),
  salary: z.string().trim().max(60, "Keep salary under 60 characters").optional(),
  experience: z.string().trim().max(60, "Keep experience under 60 characters").optional(),
});

type FormData = z.infer<typeof formSchema>;

const Section = ({ step, title, hint, children }: { step: number; title: string; hint?: string; children: React.ReactNode }) => (
  <section className="grid grid-cols-[minmax(0,1fr)] gap-4 border-t border-border pt-7 sm:grid-cols-[56px_minmax(0,1fr)]">
    <span className="num font-display text-[34px] font-bold leading-none text-primary" aria-hidden="true">
      {step}
    </span>
    <div className="min-w-0">
      <h2 className="text-2xl font-bold leading-tight">{title}</h2>
      {hint && <p className="mt-1 text-sm text-muted-foreground">{hint}</p>}
      <div className="mt-6 space-y-5">{children}</div>
    </div>
  </section>
);

const FieldError = ({ message }: { message?: string }) =>
  message ? (
    <p className="flex items-start gap-1.5 text-sm text-destructive">
      <CircleAlert className="mt-0.5 h-3.5 w-3.5 shrink-0" />
      {message}
    </p>
  ) : null;

const Optional = () => <span className="font-normal text-muted-foreground">(optional)</span>;

const PostAJob = () => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [postedTitle, setPostedTitle] = useState<string | null>(null);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [locating, setLocating] = useState(false);
  const [geoError, setGeoError] = useState<string | null>(null);
  const { toast } = useToast();
  const { user } = useAuth();

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    setValue,
    watch,
  } = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: { job_type: "full-time" },
  });

  const values = watch();
  const coords = values.maps_url ? extractLatLngFromGoogleMaps(values.maps_url) : null;
  const companyName = user?.companyName || user?.email || 'Your company';

  const previewJob: Job = {
    id: 'preview',
    companyId: '',
    locationId: 'preview',
    title: values.title?.trim() || 'Your job title',
    role: 'General',
    experience: values.experience?.trim() || '',
    salary: values.salary?.trim() || '',
    jobType: values.job_type,
    description: values.description || '',
    applyUrl: '',
    isFeatured: false,
    createdAt: new Date().toISOString(),
    company: { id: '', name: companyName, industry: '', website: '' },
    location: {
      id: 'preview',
      companyId: null,
      address: values.area?.trim() || 'Bangalore',
      city: 'Bangalore',
      latitude: coords?.latitude ?? 0,
      longitude: coords?.longitude ?? 0,
    },
  };

  const setLocation = (latitude: number, longitude: number) => {
    setGeoError(null);
    setValue("maps_url", toMapsUrl(latitude, longitude), { shouldValidate: true, shouldDirty: true });
  };

  const locateMe = () => {
    if (!("geolocation" in navigator)) {
      setGeoError("Your browser can't share its location. Pick the spot on the map instead.");
      return;
    }
    setLocating(true);
    setGeoError(null);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocating(false);
        setLocation(pos.coords.latitude, pos.coords.longitude);
      },
      (err) => {
        setLocating(false);
        setGeoError(GEO_ERRORS[err.code] ?? GEO_ERRORS[2]);
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 60000 },
    );
  };

  const onSubmit = async (data: FormData) => {
    const location = extractLatLngFromGoogleMaps(data.maps_url);
    if (!user || !location) return;

    setIsSubmitting(true);

    try {
      await createJob({
        employerId: user.id,
        companyName: user.companyName || user.email,
        title: data.title,
        description: data.description,
        latitude: location.latitude,
        longitude: location.longitude,
        applyUrl: data.apply_url,
        area: data.area,
        jobType: data.job_type,
        salary: data.salary,
        experience: data.experience,
      });

      setPostedTitle(data.title);
      reset();
      window.scrollTo({ top: 0 });
    } catch (error) {
      console.error('Error posting job:', error);
      toast({
        title: "Couldn't post your job",
        description: friendlyDataError(error, "post"),
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (postedTitle) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="flex min-h-[calc(100dvh-4rem)] items-center justify-center px-4 py-16">
          <div className="w-full max-w-md rounded-3xl border border-border bg-card p-8 text-center shadow-lift sm:p-10">
            <PartyPopper className="mx-auto h-8 w-8 text-primary" aria-hidden="true" />
            <h1 className="mx-auto mt-5 text-3xl font-bold leading-tight">Your job is live</h1>
            <p className="mt-2 text-muted-foreground">
              <span className="font-semibold text-foreground">{postedTitle}</span> is now pinned on the map for people nearby.
            </p>
            <div className="mt-8 flex flex-col gap-2.5">
              <Button size="lg" asChild>
                <Link to="/">
                  See it on the map
                  <ArrowRight />
                </Link>
              </Button>
              <Button size="lg" variant="outline" onClick={() => setPostedTitle(null)}>
                Post another job
              </Button>
              <Button variant="link" asChild>
                <Link to="/my-jobs">Manage my listings</Link>
              </Button>
            </div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="mx-auto max-w-6xl px-4 pb-20 pt-10 md:px-6 md:pt-14">
        <div className="max-w-2xl">
          <h1 className="text-4xl font-bold leading-[1.05] md:text-5xl">Put your job on the map</h1>
          <p className="mt-3 text-lg text-muted-foreground">
            It takes about two minutes and goes live instantly for people nearby.
          </p>
        </div>

        <div className="mt-10 grid grid-cols-[minmax(0,1fr)] gap-8 lg:grid-cols-[minmax(0,1fr)_360px] lg:gap-10">
          <form onSubmit={handleSubmit(onSubmit)} className="min-w-0 space-y-10" noValidate>
            <Section step={1} title="The role" hint="What you're hiring for">
              <div className="space-y-2">
                <Label htmlFor="title">Job title</Label>
                <Input
                  id="title"
                  placeholder="e.g. Store Manager, Delivery Partner, React Developer"
                  {...register("title")}
                  aria-invalid={!!errors.title}
                  className={cn(errors.title && "border-destructive")}
                />
                <FieldError message={errors.title?.message} />
              </div>

              <div className="space-y-2">
                <Label>Job type</Label>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                  {JOB_TYPES.map((type) => (
                    <button
                      key={type}
                      type="button"
                      onClick={() => setValue("job_type", type)}
                      aria-pressed={values.job_type === type}
                      className={cn(
                        "h-11 rounded-xl border text-sm font-semibold transition-colors duration-150 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
                        values.job_type === type
                          ? "border-ink bg-ink text-ink-foreground"
                          : "border-input bg-card text-foreground/80 hover:border-foreground/30",
                      )}
                    >
                      {JOB_TYPE_LABELS[type]}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  placeholder="What will they do day to day? What do you need from them? Timings, perks, how to reach the office…"
                  rows={8}
                  {...register("description")}
                  aria-invalid={!!errors.description}
                  className={cn(errors.description && "border-destructive")}
                />
                <div className="flex justify-between gap-3">
                  <FieldError message={errors.description?.message} />
                  <span className="ml-auto text-xs text-muted-foreground">{(values.description || '').length}/5000</span>
                </div>
              </div>
            </Section>

            <Section step={2} title="Where it is" hint="This is where your pin goes on the map">
              <div className="space-y-2">
                <Label htmlFor="maps_url">Google Maps link</Label>
                <div className="relative">
                  <MapPin className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="maps_url"
                    placeholder="https://www.google.com/maps/place/…"
                    {...register("maps_url")}
                    aria-invalid={!!errors.maps_url}
                    className={cn("pl-10 pr-10", errors.maps_url && "border-destructive")}
                  />
                  {coords && (
                    <Check className="pointer-events-none absolute right-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-success" />
                  )}
                </div>
                {coords ? (
                  <p className="text-sm font-medium text-success">
                    Location found ({coords.latitude.toFixed(4)}, {coords.longitude.toFixed(4)})
                  </p>
                ) : (
                  <p className="text-xs text-muted-foreground">
                    Paste a Google Maps link, or use one of the options below.
                  </p>
                )}
                <FieldError message={errors.maps_url?.message} />
                <div className="flex flex-col gap-2 pt-1 sm:flex-row">
                  <Button type="button" variant="outline" onClick={locateMe} disabled={locating}>
                    {locating ? <Loader2 className="animate-spin" /> : <Crosshair />}
                    {locating ? "Finding you…" : "Use my current location"}
                  </Button>
                  <Button type="button" variant="outline" onClick={() => setPickerOpen(true)}>
                    <MapIcon />
                    Pick on the map
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">Only use your current location if you’re at the workplace right now.</p>
                <FieldError message={geoError ?? undefined} />
              </div>

              <div className="space-y-2">
                <Label htmlFor="area">
                  Area name <Optional />
                </Label>
                <Input id="area" placeholder="e.g. HSR Layout, Whitefield" {...register("area")} />
                <FieldError message={errors.area?.message} />
              </div>
            </Section>

            <Section step={3} title="Pay and experience" hint="Jobs that show pay get more applicants">
              <div className="grid gap-5 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="salary">
                    Salary <Optional />
                  </Label>
                  <Input id="salary" placeholder="e.g. ₹25,000/month or 4–6 LPA" {...register("salary")} />
                  <FieldError message={errors.salary?.message} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="experience">
                    Experience <Optional />
                  </Label>
                  <Input id="experience" placeholder="e.g. Freshers welcome, 1–3 years" {...register("experience")} />
                  <FieldError message={errors.experience?.message} />
                </div>
              </div>
            </Section>

            <Section step={4} title="How to apply" hint="Candidates are sent straight to this link">
              <div className="space-y-2">
                <Label htmlFor="apply_url">Application link</Label>
                <Input
                  id="apply_url"
                  type="url"
                  placeholder="https://yourcompany.com/careers or a Google Form"
                  {...register("apply_url")}
                  aria-invalid={!!errors.apply_url}
                  className={cn(errors.apply_url && "border-destructive")}
                />
                <FieldError message={errors.apply_url?.message} />
              </div>
            </Section>

            <div className="flex flex-col-reverse items-center gap-4 border-t border-border pt-7 sm:flex-row sm:justify-between">
              <p className="text-center text-sm text-muted-foreground sm:text-left">
                By posting you confirm this is a genuine job in Bangalore.
              </p>
              <Button type="submit" size="lg" className="w-full sm:w-auto" disabled={isSubmitting}>
                {isSubmitting ? (
                  <>
                    <Loader2 className="animate-spin" />
                    Publishing…
                  </>
                ) : (
                  <>
                    Publish job
                    <ArrowRight />
                  </>
                )}
              </Button>
            </div>
          </form>

          {/* Live preview */}
          <aside>
            <div className="lg:sticky lg:top-24">
              <p className="mb-3 flex items-center gap-2 text-sm font-semibold text-muted-foreground">
                <Eye className="h-4 w-4" />
                Live preview
              </p>
              <div className="overflow-hidden rounded-3xl border border-border bg-card shadow-lift">
                <div className="relative h-44 bg-secondary">
                  {coords ? (
                    <img
                      src={`https://api.mapbox.com/styles/v1/mapbox/dark-v11/static/${coords.longitude},${coords.latitude},14.5,0/720x352@2x?attribution=false&logo=false&access_token=${MAPBOX_TOKEN}`}
                      alt="Map preview of the job location"
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="flex h-full flex-col items-center justify-center gap-1 text-center">
                      <p className="text-sm font-semibold text-foreground/70">Your pin appears here</p>
                      <p className="text-xs text-muted-foreground">Paste a Google Maps link in step 2</p>
                    </div>
                  )}
                  {coords && (
                  <svg
                    viewBox="0 0 34 42"
                    className="absolute left-1/2 top-1/2 h-12 w-10 -translate-x-1/2 -translate-y-full drop-shadow-lg"
                    aria-hidden="true"
                  >
                    <path
                      d="M17 1.5C8.4 1.5 1.5 8.3 1.5 16.8c0 10.6 13.2 22 14.4 23a1.7 1.7 0 0 0 2.2 0c1.2-1 14.4-12.4 14.4-23C32.5 8.3 25.6 1.5 17 1.5Z"
                      fill="var(--color-accent)"
                      stroke="var(--color-mark)"
                      strokeWidth="2.5"
                    />
                    <circle cx="17" cy="16.5" r="5" fill="var(--color-mark)" />
                  </svg>
                  )}
                </div>
                <div className="p-3">
                  <JobCard job={previewJob} />
                </div>
              </div>
              <p className="mt-3 hidden text-xs text-muted-foreground lg:block">
                This is how job seekers will see your listing in the list and on the map.
              </p>
            </div>
          </aside>
        </div>
      </main>
      {pickerOpen && (
        <Suspense fallback={<div className="fixed inset-0 z-50 bg-background/80" />}>
          <LocationPicker
            initial={coords}
            onClose={() => setPickerOpen(false)}
            onPick={(p) => {
              setPickerOpen(false);
              setLocation(p.latitude, p.longitude);
            }}
          />
        </Suspense>
      )}
    </div>
  );
};

export default PostAJob;
