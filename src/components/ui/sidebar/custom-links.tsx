import { ExternalLink, Link2 } from "lucide-react";
import { navigate } from "raviger";
import { useTranslation } from "react-i18next";

import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";

import { useCareApps } from "@/hooks/useCareApps";
import careConfig, { SidebarContext, SidebarLink } from "@careConfig";

interface CustomSidebarLinksProps {
  context: SidebarContext;
}

export function CustomSidebarLinks({ context }: CustomSidebarLinksProps) {
  const { t } = useTranslation();
  const { isMobile, open } = useSidebar();
  const careApps = useCareApps();

  const envLinks = careConfig.customSidebarLinks || [];

  const pluginLinks = careApps.flatMap(
    (app) => (!app.isLoading && app.sidebarLinks) || [],
  );

  const allLinks: SidebarLink[] = [...envLinks, ...pluginLinks];

  const filteredLinks = allLinks.filter((link) => {
    if (!link.contexts || link.contexts.length === 0) {
      return true;
    }
    return link.contexts.includes(context);
  });

  if (filteredLinks.length === 0) {
    return null;
  }

  const handleLinkClick = (link: SidebarLink) => {
    if (link.type === "external") {
      if (link.openInNewTab) {
        window.open(link.url, "_blank", "noopener,noreferrer");
      } else {
        window.location.href = link.url;
      }
    } else {
      if (link.openInNewTab) {
        window.open(link.url, "_blank");
      } else {
        navigate(link.url);
      }
    }
  };

  return (
    <SidebarMenu>
      {filteredLinks.map((link, index) => (
        <SidebarMenuItem key={`${link.url}-${index}`}>
          <SidebarMenuButton
            onClick={() => handleLinkClick(link)}
            className="cursor-pointer"
            tooltip={open || isMobile ? undefined : link.label}
          >
            {link.type === "external" ? (
              <ExternalLink className="size-4" aria-hidden="true" />
            ) : (
              <Link2 className="size-4" aria-hidden="true" />
            )}
            {(open || isMobile) && <span>{link.label}</span>}
          </SidebarMenuButton>
        </SidebarMenuItem>
      ))}
    </SidebarMenu>
  );
}
