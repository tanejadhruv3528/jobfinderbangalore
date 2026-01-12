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
import { supabase } from "@/integrations/supabase/client";
import { MapPin, CheckCircle, Loader2 } from "lucide-react";

const formSchema = z.object({
  companyName: z.string().trim().min(1, "Company name is required").max(100, "Company name must be less than 100 characters"),
  jobTitle: z.string().trim().min(1, "Job title is required").max(100, "Job title must be less than 100 characters"),
  jobDescription: z.string().trim().min(1, "Job description is required").max(5000, "Job description must be less than 5000 characters"),
  jobLocation: z.string().trim().min(1, "Job location is required").max(200, "Job location must be less than 200 characters"),
  applyUrl: z.string().trim().url("Please enter a valid URL"),
  contactEmail: z.string().trim().email("Please enter a valid email address"),
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
      const { data: result, error } = await supabase.functions.invoke('post-job', {
        body: {
          companyName: data.companyName,
          jobTitle: data.jobTitle,
          jobDescription: data.jobDescription,
          jobLocation: data.jobLocation,
          applyUrl: data.applyUrl,
          contactEmail: data.contactEmail,
        },
      });

      if (error) {
        throw new Error(error.message || 'Failed to post job');
      }

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

  if (isSuccess) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="container max-w-2xl mx-auto px-4 py-16">
          <Card className="border-0 shadow-lg">
            <CardContent className="pt-12 pb-12 text-center">
              <div className="flex justify-center mb-6">
                <CheckCircle className="h-16 w-16 text-green-500" />
              </div>
              <h2 className="text-2xl font-semibold text-foreground mb-3">
                Job posted successfully
              </h2>
              <p className="text-muted-foreground mb-8">
                It will now appear on the map.
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
            Post a Job for Free (Beta)
          </h1>
          <p className="text-lg text-muted-foreground">
            Your job will appear on the Bangalore job map instantly.
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
              {/* Company Name */}
              <div className="space-y-2">
                <Label htmlFor="companyName">Company Name</Label>
                <Input
                  id="companyName"
                  placeholder="e.g., Acme Technologies"
                  {...register("companyName")}
                  className={errors.companyName ? "border-destructive" : ""}
                />
                {errors.companyName && (
                  <p className="text-sm text-destructive">{errors.companyName.message}</p>
                )}
              </div>

              {/* Job Title */}
              <div className="space-y-2">
                <Label htmlFor="jobTitle">Job Title</Label>
                <Input
                  id="jobTitle"
                  placeholder="e.g., Senior Software Engineer"
                  {...register("jobTitle")}
                  className={errors.jobTitle ? "border-destructive" : ""}
                />
                {errors.jobTitle && (
                  <p className="text-sm text-destructive">{errors.jobTitle.message}</p>
                )}
              </div>

              {/* Job Description */}
              <div className="space-y-2">
                <Label htmlFor="jobDescription">Job Description</Label>
                <Textarea
                  id="jobDescription"
                  placeholder="Describe the role, responsibilities, and requirements..."
                  rows={6}
                  {...register("jobDescription")}
                  className={errors.jobDescription ? "border-destructive" : ""}
                />
                {errors.jobDescription && (
                  <p className="text-sm text-destructive">{errors.jobDescription.message}</p>
                )}
              </div>

              {/* Job Location */}
              <div className="space-y-2">
                <Label htmlFor="jobLocation">Job Location (Bangalore)</Label>
                <Input
                  id="jobLocation"
                  placeholder="e.g., Koramangala, 5th Block or full address"
                  {...register("jobLocation")}
                  className={errors.jobLocation ? "border-destructive" : ""}
                />
                <p className="text-xs text-muted-foreground">
                  Enter a street address or area in Bangalore
                </p>
                {errors.jobLocation && (
                  <p className="text-sm text-destructive">{errors.jobLocation.message}</p>
                )}
              </div>

              {/* Apply URL */}
              <div className="space-y-2">
                <Label htmlFor="applyUrl">Apply URL</Label>
                <Input
                  id="applyUrl"
                  type="url"
                  placeholder="https://yourcompany.com/careers/apply"
                  {...register("applyUrl")}
                  className={errors.applyUrl ? "border-destructive" : ""}
                />
                {errors.applyUrl && (
                  <p className="text-sm text-destructive">{errors.applyUrl.message}</p>
                )}
              </div>

              {/* Contact Email */}
              <div className="space-y-2">
                <Label htmlFor="contactEmail">Contact Email</Label>
                <Input
                  id="contactEmail"
                  type="email"
                  placeholder="hr@yourcompany.com"
                  {...register("contactEmail")}
                  className={errors.contactEmail ? "border-destructive" : ""}
                />
                <p className="text-xs text-muted-foreground">
                  We'll use this if we need to contact you about your listing
                </p>
                {errors.contactEmail && (
                  <p className="text-sm text-destructive">{errors.contactEmail.message}</p>
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
