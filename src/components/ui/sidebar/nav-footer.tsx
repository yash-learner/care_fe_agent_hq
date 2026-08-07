import { ExternalLink } from "lucide-react";

import {
  SidebarGroup,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";

import { useFooterNavLinks } from "@/hooks/useFooterNavLinks";

/**
 * NavFooter component renders custom footer navigation links
 * from environment configuration and loaded plugins.
 *
 * External links open in new tab with security attributes.
 * Supports collapsed sidebar with tooltips.
 * Returns null when no links are configured.
 */
export function NavFooter() {
  const links = useFooterNavLinks();

  // Return null when no links to render (maintains current behavior)
  if (links.length === 0) {
    return null;
  }

  return (
    <SidebarGroup>
      <SidebarMenu>
        {links
          .filter((link) => link.visibility !== false)
          .map((link) => (
            <SidebarMenuItem key={link.name}>
              <SidebarMenuButton
                asChild
                tooltip={link.name}
                className="text-gray-600 transition font-normal hover:bg-gray-200 hover:text-green-700"
              >
                <a
                  href={link.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2"
                >
                  {link.icon ? link.icon : <ExternalLink className="size-4" />}
                  <span className="group-data-[collapsible=icon]:hidden">
                    {link.name}
                  </span>
                </a>
              </SidebarMenuButton>
            </SidebarMenuItem>
          ))}
      </SidebarMenu>
    </SidebarGroup>
  );
}
