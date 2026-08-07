import { NavigationLink } from "@/components/ui/sidebar/nav-main";
import { useCareApps } from "@/hooks/useCareApps";
import careConfig from "@careConfig";

/**
 * Hook to aggregate footer navigation links from environment config and loaded plugins.
 * Returns combined array: env-configured links first, then plugin links.
 */
export const useFooterNavLinks = (): NavigationLink[] => {
  const careApps = useCareApps();
  const envLinks = careConfig.navbarLinks as NavigationLink[];

  const pluginLinks = careApps.flatMap((app) =>
    !app.isLoading && app.footerNavItems ? app.footerNavItems : [],
  ) as NavigationLink[];

  return [...envLinks, ...pluginLinks];
};
