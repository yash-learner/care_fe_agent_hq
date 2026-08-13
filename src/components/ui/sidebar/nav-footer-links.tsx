import { ExternalLink, Link2 } from "lucide-react";
import { Link } from "raviger";
import { useTranslation } from "react-i18next";

import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";
import { SidebarFor } from "@/components/ui/sidebar/app-sidebar";
import { NavigationLink } from "@/components/ui/sidebar/nav-main";

import { useCareApps } from "@/hooks/useCareApps";
import careConfig, { CustomFooterLink } from "@careConfig";

interface NavFooterLinksProps {
  sidebarFor: SidebarFor;
}

/**
 * Renders custom footer links in the sidebar above the user avatar.
 * Supports both configuration-defined links and plugin-provided links.
 * Links can be filtered by sidebar context using the visibleIn property.
 */
export function NavFooterLinks({ sidebarFor }: NavFooterLinksProps) {
  const { t } = useTranslation();
  const { state } = useSidebar();
  const careApps = useCareApps();

  // Get plugin footer links from loaded care apps
  const pluginFooterLinks = careApps.flatMap((app) =>
    !app.isLoading && app.footerNavItems ? app.footerNavItems : [],
  ) as NavigationLink[];

  // Combine configuration links with plugin links
  const allLinks: (CustomFooterLink | NavigationLink)[] = [
    ...careConfig.customFooterLinks,
    ...pluginFooterLinks,
  ];

  // Filter links based on visibleIn property
  const visibleLinks = allLinks.filter((link) => {
    const customLink = link as CustomFooterLink;
    // If visibleIn is not specified, show in all contexts
    if (!customLink.visibleIn) return true;
    // Otherwise, check if current context is in the visibleIn array
    return customLink.visibleIn.includes(sidebarFor);
  });

  // Don't render anything if no visible links
  if (visibleLinks.length === 0) {
    return null;
  }

  const isCollapsed = state === "collapsed";

  return (
    <SidebarMenu>
      {visibleLinks.map((link) => {
        const customLink = link as CustomFooterLink;
        const navLink = link as NavigationLink;

        // Determine if this is an external or internal link
        const isExternal = customLink.target === "_blank";

        // Get icon: custom icon, or default based on target
        const icon =
          customLink.icon ||
          navLink.icon ||
          (isExternal ? (
            <ExternalLink className="size-4" />
          ) : (
            <Link2 className="size-4" />
          ));

        // Get display name with defensive check
        const displayName = t(
          customLink.name || navLink.name || "unknown_link",
        );

        // Skip rendering if both name and url are missing
        if (!displayName || !(customLink.url || navLink.url)) {
          return null;
        }

        // Render external link
        if (isExternal) {
          return (
            <SidebarMenuItem key={customLink.url || navLink.url}>
              <SidebarMenuButton
                asChild
                tooltip={isCollapsed ? displayName : undefined}
                className="text-gray-600 transition font-normal hover:bg-gray-200 hover:text-green-700"
              >
                <a
                  href={customLink.url || navLink.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2"
                >
                  {icon}
                  <span className="group-data-[collapsible=icon]:hidden">
                    {displayName}
                  </span>
                </a>
              </SidebarMenuButton>
            </SidebarMenuItem>
          );
        }

        // Render internal route link
        return (
          <SidebarMenuItem key={customLink.url || navLink.url}>
            <SidebarMenuButton
              asChild
              tooltip={isCollapsed ? displayName : undefined}
              className="text-gray-600 transition font-normal hover:bg-gray-200 hover:text-green-700"
            >
              <Link
                href={customLink.url || navLink.url}
                className="flex items-center gap-2"
              >
                {icon}
                <span className="group-data-[collapsible=icon]:hidden">
                  {displayName}
                </span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        );
      })}
    </SidebarMenu>
  );
}
