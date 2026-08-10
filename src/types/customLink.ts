import { SidebarFor } from "@/components/ui/sidebar/app-sidebar";

export interface CustomLink {
  name: string;
  url: string;
  isExternal: boolean;
  openInNewTab: boolean;
  showIn?: SidebarFor[];
}
