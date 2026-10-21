import * as React from "react";

/** Matches the `lg` breakpoint where the map page switches to its side-by-side layout. */
const DESKTOP_QUERY = "(min-width: 1024px)";

export function useIsDesktop() {
  const [isDesktop, setIsDesktop] = React.useState(() => window.matchMedia(DESKTOP_QUERY).matches);

  React.useEffect(() => {
    const mql = window.matchMedia(DESKTOP_QUERY);
    const onChange = () => setIsDesktop(mql.matches);
    mql.addEventListener("change", onChange);
    return () => mql.removeEventListener("change", onChange);
  }, []);

  return isDesktop;
}
