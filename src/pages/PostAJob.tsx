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
import { createJob } from "@/services/apiJobService";
import { MapPin, CheckCircle, Loader2 } from "lucide-react";

const formSchema = z.object({
  title: z.string().trim().min(1, "Job title is required").max(100, "Job title must be less than 100 characters"),
  description: z.string().trim().min(1, "Job description is required").max(5000, "Job description must be less than 5000 characters"),
  maps_url: z.string().trim().min(1, "Google Maps link is required"),
  apply_url: z.string().trim().url("Please enter a valid URL"),
});

type FormData = z.infer<typeof formSchema>;

const PostAJob = () => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<FormData>({
    resolver: zodResolver(formSchema),
  });

  const onSubmit = async (data: FormData) => {
    setIsSubmitting(true);

    try {
      await createJob({
        title: data.title,
        description: data.description,
        maps_url: data.maps_url,
        apply_url: data.apply_url,
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
              All fields are required
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
