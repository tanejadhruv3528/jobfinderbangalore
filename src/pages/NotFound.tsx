import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import Header from "@/components/Header";
import { Button } from "@/components/ui/button";

const NotFound = () => (
  <div className="flex min-h-[100dvh] flex-col bg-background">
    <Header />
    <main className="bg-paper-grid flex flex-1 items-center justify-center px-4 py-16">
      <div className="max-w-md text-center animate-fade-up">
        <svg viewBox="0 0 120 120" className="mx-auto h-28 w-28" aria-hidden="true">
          <ellipse cx="60" cy="104" rx="26" ry="5" fill="hsl(var(--foreground) / 0.08)" />
          <g transform="rotate(-18 60 60)">
            <path
              d="M60 12C41 12 26 27 26 45.6c0 23 29 48 31.6 50.3a3.7 3.7 0 0 0 4.8 0C65 93.6 94 68.6 94 45.6 94 27 79 12 60 12Z"
              fill="hsl(var(--primary))"
              stroke="#fff"
              strokeWidth="4"
            />
            <text x="60" y="54" textAnchor="middle" fontSize="22" fontWeight="800" fill="#fff" fontFamily="Bricolage Grotesque, sans-serif">
              ?
            </text>
          </g>
        </svg>
        <p className="mt-6 text-sm font-semibold uppercase tracking-[0.14em] text-primary">Error 404</p>
        <h1 className="mt-3 text-4xl font-bold leading-tight md:text-5xl">This pin fell off the map</h1>
        <p className="mt-3 text-muted-foreground">The page you're looking for doesn't exist or has moved.</p>
        <Button size="lg" className="mt-8" asChild>
          <Link to="/">
            <ArrowLeft />
            Back to the job map
          </Link>
        </Button>
      </div>
    </main>
  </div>
);

export default NotFound;
