import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useNavigate } from "react-router-dom";
import Header from "@/components/Header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { createJob } from "@/services/jobService";
import { extractLatLngFromGoogleMaps } from "@/lib/maps";
import { useAuth } from "@/contexts/AuthContext";
import { MapPin, CheckCircle, Loader2 } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { JOB_TYPES, JOB_TYPE_LABELS } from "@/lib/jobTypes";

const formSchema = z.object({
  title: z.string().trim().min(1, "Job title is required").max(100, "Job title must be less than 100 characters"),
  description: z.string().trim().min(1, "Job description is required").max(5000, "Job description must be less than 5000 characters"),
  maps_url: z
    .string()
    .trim()
    .min(1, "Google Maps link is required")
    .refine((url) => extractLatLngFromGoogleMaps(url) !== null, {
      message: "Couldn't find a location in this link. Open the place in Google Maps on a computer and copy the full URL from the address bar.",
    }),
  apply_url: z.string().trim().url("Please enter a valid URL").refine((url) => /^https?:\/\//i.test(url), "Link must start with http:// or https://"),
  area: z.string().trim().max(120, "Keep the area under 120 characters").optional(),
  job_type: z.enum(["full-time", "part-time", "contract", "internship"]),
  salary: z.string().trim().max(60, "Keep salary under 60 characters").optional(),
  experience: z.string().trim().max(60, "Keep experience under 60 characters").optional(),
});

type FormData = z.infer<typeof formSchema>;

const PostAJob = () => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();
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

  const onSubmit = async (data: FormData) => {
    const coords = extractLatLngFromGoogleMaps(data.maps_url);
    if (!user || !coords) return;

    setIsSubmitting(true);

    try {
      await createJob({
        employerId: user.id,
        companyName: user.companyName || user.email,
        title: data.title,
        description: data.description,
        latitude: coords.latitude,
        longitude: coords.longitude,
        applyUrl: data.apply_url,
        area: data.area,
        jobType: data.job_type,
        salary: data.salary,
        experience: data.experience,
      });

      setIsSuccess(true);
      reset();
    } catch (error) {
      console.error('Error posting job:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to post job. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Success state
  if (isSuccess) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="container max-w-2xl mx-auto px-4 py-16">
          <Card className="border-0 shadow-lg">
            <CardContent className="pt-12 pb-12 text-center">
              <div className="flex justify-center mb-6">
                <CheckCircle className="h-16 w-16 text-success" />
              </div>
              <h2 className="text-2xl font-semibold text-foreground mb-3">
                Job posted successfully.
              </h2>
              <p className="text-muted-foreground mb-8">
                It is now live on the map.
              </p>
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <Button onClick={() => navigate("/")} variant="outline">
                  View Job Map
                </Button>
                <Button onClick={() => setIsSuccess(false)}>
                  Post Another Job
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <div className="container max-w-2xl mx-auto px-4 py-12">
        {/* Hero Section */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center gap-2 mb-4">
            <MapPin className="h-6 w-6 text-primary" />
          </div>
          <h1 className="text-3xl font-bold text-foreground mb-3">
            Post a Job
          </h1>
          <p className="text-lg text-muted-foreground">
            Your job will appear instantly on the Bangalore job map.
          </p>
        </div>

        {/* Form Card */}
        <Card className="border-0 shadow-lg">
          <CardHeader className="pb-2">
            <p className="text-sm text-muted-foreground">
              Fields marked optional can be left blank
            </p>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
              {/* Job Title */}
              <div className="space-y-2">
                <Label htmlFor="title">Job Title</Label>
                <Input
                  id="title"
                  placeholder="e.g., Senior Software Engineer"
                  {...register("title")}
                  className={errors.title ? "border-destructive" : ""}
                />
                {errors.title && (
                  <p className="text-sm text-destructive">{errors.title.message}</p>
                )}
              </div>

              {/* Job Description */}
              <div className="space-y-2">
                <Label htmlFor="description">Job Description</Label>
                <Textarea
                  id="description"
                  placeholder="Describe the role, responsibilities, and requirements..."
                  rows={6}
                  {...register("description")}
                  className={errors.description ? "border-destructive" : ""}
                />
                {errors.description && (
                  <p className="text-sm text-destructive">{errors.description.message}</p>
                )}
              </div>

              {/* Google Maps Location Link */}
              <div className="space-y-2">
                <Label htmlFor="maps_url">Google Maps Location Link</Label>
                <Input
                  id="maps_url"
                  placeholder="https://maps.google.com/..."
                  {...register("maps_url")}
                  className={errors.maps_url ? "border-destructive" : ""}
                />
                <p className="text-xs text-muted-foreground">
                  Paste the Google Maps link of your office or workplace location.
                </p>
                {errors.maps_url && (
                  <p className="text-sm text-destructive">{errors.maps_url.message}</p>
                )}
              </div>

              {/* Area + job type */}
              <div className="grid gap-6 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="area">Area</Label>
                  <Input id="area" placeholder="e.g., HSR Layout" {...register("area")} />
                  {errors.area && <p className="text-sm text-destructive">{errors.area.message}</p>}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="job_type">Job Type</Label>
                  <Select
                    value={watch("job_type")}
                    onValueChange={(value) => setValue("job_type", value as FormData["job_type"])}
                  >
                    <SelectTrigger id="job_type">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {JOB_TYPES.map((type) => (
                        <SelectItem key={type} value={type}>
                          {JOB_TYPE_LABELS[type]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Salary + experience */}
              <div className="grid gap-6 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="salary">Salary <span className="text-muted-foreground font-normal">(optional)</span></Label>
                  <Input id="salary" placeholder="e.g., 4-6 LPA" {...register("salary")} />
                  {errors.salary && <p className="text-sm text-destructive">{errors.salary.message}</p>}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="experience">Experience <span className="text-muted-foreground font-normal">(optional)</span></Label>
                  <Input id="experience" placeholder="e.g., 1-3 years" {...register("experience")} />
                  {errors.experience && <p className="text-sm text-destructive">{errors.experience.message}</p>}
                </div>
              </div>

              {/* Apply URL */}
              <div className="space-y-2">
                <Label htmlFor="apply_url">Apply URL</Label>
                <Input
                  id="apply_url"
                  type="url"
                  placeholder="https://yourcompany.com/careers/apply"
                  {...register("apply_url")}
                  className={errors.apply_url ? "border-destructive" : ""}
                />
                {errors.apply_url && (
                  <p className="text-sm text-destructive">{errors.apply_url.message}</p>
                )}
              </div>

              {/* Submit Button */}
              <Button
                type="submit"
                className="w-full"
                size="lg"
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Posting Job...
                  </>
                ) : (
                  "Post Job"
                )}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Footer Note */}
        <p className="text-center text-sm text-muted-foreground mt-8">
          By posting, you agree that this is a legitimate job opportunity in Bangalore.
        </p>
      </div>
    </div>
  );
};

export default PostAJob;
