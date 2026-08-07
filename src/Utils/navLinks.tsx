import { NavigationLink } from "@/components/ui/sidebar/nav-main";
import { ExternalLink } from "lucide-react";

/**
 * Process environment-configured navigation links.
 * Adds external link icon and marks external URLs appropriately.
 *
 * @param envLinks - Array of navigation links from environment config
 * @returns Processed navigation links with external link handling
 */
export function processEnvNavLinks(
  envLinks: NavigationLink[],
): NavigationLink[] {
  return envLinks.map((link) => {
    const isExternalLink =
      link.url.startsWith("http://") || link.url.startsWith("https://");

    return {
      ...link,
      icon: link.icon || <ExternalLink className="size-4" />,
      // External links open in new tab
      ...(isExternalLink && {
        url: link.url,
        // Mark as external for nav-main to handle appropriately
        external: true,
      }),
    };
  });
}
