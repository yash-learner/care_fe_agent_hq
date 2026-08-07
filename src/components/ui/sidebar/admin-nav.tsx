import { TFunction } from "i18next";
import { useTranslation } from "react-i18next";

import CareIcon from "@/CAREUI/icons/CareIcon";

import { NavMain, NavigationLink } from "@/components/ui/sidebar/nav-main";

import { useCareApps } from "@/hooks/useCareApps";
import careConfig from "@careConfig";
import { ExternalLink } from "lucide-react";

function generateAdminLinks(
  t: TFunction,
  pluginNavItems: NavigationLink[],
  envLinks: NavigationLink[],
): NavigationLink[] {
  const baseUrl = "/admin";
  const links: NavigationLink[] = [
    {
      name: t("questionnaire_one"),
      url: `${baseUrl}/questionnaire`,
      icon: <CareIcon icon="d-book-open" />,
    },
    {
      name: "Valuesets",
      url: `${baseUrl}/valuesets`,
      icon: <CareIcon icon="l-list-ol-alt" />,
    },
    {
      name: "Patient Identifier Config",
      url: `${baseUrl}/patient_identifier_config`,
      icon: <CareIcon icon="l-setting" />,
    },
    {
      name: "Tag Config",
      url: `${baseUrl}/tag_config`,
      icon: <CareIcon icon="l-tag-alt" />,
    },
    {
      name: "RBAC",
      url: `${baseUrl}/rbac`,
      icon: <CareIcon icon="l-shield-check" />,
      children: [
        {
          name: "Permissions",
          url: `${baseUrl}/rbac/permissions`,
        },
        {
          name: "Roles",
          url: `${baseUrl}/rbac/roles`,
        },
      ],
    },
    {
      name: "Organizations",
      url: `${baseUrl}/organizations`,
      icon: <CareIcon icon="l-building" />,
      children: [
        {
          name: "Governance",
          url: `${baseUrl}/organizations/govt`,
        },
        {
          name: "Suppliers",
          url: `${baseUrl}/organizations/product_supplier`,
        },
        {
          name: "Responsibilities",
          url: `${baseUrl}/organizations/role`,
        },
      ],
    },
    {
      name: "Apps",
      url: `${baseUrl}/apps`,
      icon: <CareIcon icon="l-apps" />,
    },
  ];

  // Process environment-configured links
  const processedEnvLinks: NavigationLink[] = envLinks.map((link) => {
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

  return [...links, ...processedEnvLinks, ...pluginNavItems];
}

export function AdminNav() {
  const { t } = useTranslation();

  const careApps = useCareApps();
  const pluginNavItems = careApps.flatMap((c) =>
    !c.isLoading && c.adminNavItems ? c.adminNavItems : [],
  ) as NavigationLink[];

  const envNavLinks = careConfig.navLinks as NavigationLink[];

  return <NavMain links={generateAdminLinks(t, pluginNavItems, envNavLinks)} />;
}
