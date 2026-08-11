import { ArrowRight, ExternalLink } from "lucide-react";
import { Link } from "raviger";
import { useTranslation } from "react-i18next";

import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import { NavigationLink } from "@/components/ui/sidebar/nav-main";

import { useCareApps } from "@/hooks/useCareApps";

import careConfig from "@careConfig";

interface FooterLinksProps {
  sidebarType?: string;
}

export function FooterLinks({ sidebarType }: FooterLinksProps) {
  const { t } = useTranslation();
  const careApps = useCareApps();

  // Get config-based footer links
  const configLinks = (careConfig.customFooterLinks as NavigationLink[]) || [];

  // Get plugin-based footer links
  const pluginLinks = careApps.flatMap((app) =>
    !app.isLoading && app.footerNavItems ? app.footerNavItems : [],
  ) as NavigationLink[];

  // Merge both link sources
  const allLinks = [...configLinks, ...pluginLinks];

  // Filter links based on sidebarFor
  const filteredLinks = allLinks.filter((link) => {
    if (!link.sidebarFor || link.sidebarFor.length === 0) {
      return true;
    }
    return sidebarType && link.sidebarFor.includes(sidebarType);
  });

  if (filteredLinks.length === 0) {
    return null;
  }

  return (
    <SidebarMenu>
      {filteredLinks.map((link) => {
        const isExternal = link.target === "_blank";
        const Icon = isExternal ? ExternalLink : ArrowRight;

        const linkContent = (
          <>
            <Icon className="size-4" />
            <span className="group-data-[collapsible=icon]:hidden ml-1">
              {t(link.name)}
            </span>
          </>
        );

        return (
          <SidebarMenuItem key={link.name}>
            <SidebarMenuButton
              asChild={!isExternal}
              tooltip={t(link.name)}
              className="text-gray-600 transition font-normal hover:bg-gray-200 hover:text-green-700"
            >
              {isExternal ? (
                <a
                  href={link.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={`${t(link.name)} (opens in new tab)`}
                >
                  {linkContent}
                </a>
              ) : (
                <Link href={link.url}>{linkContent}</Link>
              )}
            </SidebarMenuButton>
          </SidebarMenuItem>
        );
      })}
    </SidebarMenu>
  );
}
