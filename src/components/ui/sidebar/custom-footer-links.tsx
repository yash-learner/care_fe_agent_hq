import { ExternalLink, Link2 } from "lucide-react";
import { Link } from "raviger";
import { useTranslation } from "react-i18next";

import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import { SidebarFor } from "@/components/ui/sidebar/app-sidebar";

import { CustomLink } from "@/types/customLink";

interface CustomFooterLinksProps {
  links: CustomLink[];
  sidebarFor: SidebarFor;
}

export function CustomFooterLinks({
  links,
  sidebarFor,
}: CustomFooterLinksProps) {
  const { t } = useTranslation();

  const filteredLinks = links.filter((link) => {
    if (!link.showIn || link.showIn.length === 0) {
      return true;
    }
    return link.showIn.includes(sidebarFor);
  });

  if (filteredLinks.length === 0) {
    return null;
  }

  return (
    <SidebarMenu>
      {filteredLinks.map((link) => (
        <SidebarMenuItem key={link.name}>
          <SidebarMenuButton
            asChild={!link.isExternal}
            tooltip={t(link.name)}
            className="text-gray-600 transition font-normal hover:bg-gray-200 hover:text-green-700"
          >
            {link.isExternal ? (
              <a
                href={link.url}
                target={link.openInNewTab ? "_blank" : "_self"}
                rel={link.openInNewTab ? "noopener noreferrer" : undefined}
                className="flex items-center gap-2"
              >
                <ExternalLink className="size-4" />
                <span className="group-data-[collapsible=icon]:hidden">
                  {t(link.name)}
                </span>
              </a>
            ) : (
              <Link
                href={link.url}
                target={link.openInNewTab ? "_blank" : undefined}
                className="flex items-center gap-2"
              >
                <Link2 className="size-4" />
                <span className="group-data-[collapsible=icon]:hidden">
                  {t(link.name)}
                </span>
              </Link>
            )}
          </SidebarMenuButton>
        </SidebarMenuItem>
      ))}
    </SidebarMenu>
  );
}
