import { CaretSortIcon, DashboardIcon } from "@radix-ui/react-icons";
import { Hospital } from "lucide-react";
import { Link } from "raviger";
import { useState } from "react";
import { useTranslation } from "react-i18next";

import { cn } from "@/lib/utils";

import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";

import { FacilityBareMinimum } from "@/types/facility/facility";

export function FacilitySwitcher({
  facilities,
  selectedFacility,
}: {
  facilities: FacilityBareMinimum[];
  selectedFacility: FacilityBareMinimum | null;
}) {
  const { isMobile } = useSidebar();
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");

  const handleOpenChange = (newOpen: boolean) => {
    setOpen(newOpen);
    if (!newOpen) {
      setSearch("");
    }
  };

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu open={open} onOpenChange={handleOpenChange}>
          <DropdownMenuTrigger asChild>
            <SidebarMenuButton
              size="lg"
              className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground hover:bg-white"
              tooltip={selectedFacility?.name}
            >
              <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-primary text-sidebar-primary-foreground">
                <Hospital className="size-4" />
              </div>
              <div className="grid flex-1 text-left text-sm leading-tight">
                <span className="truncate font-semibold">
                  {selectedFacility?.name || t("select_facility")}
                </span>
              </div>
              <CaretSortIcon className="ml-auto" />
            </SidebarMenuButton>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            className="w-(--radix-dropdown-menu-trigger-width) min-w-56 rounded-lg p-0"
            align="start"
            side={isMobile ? "bottom" : "right"}
            sideOffset={4}
          >
            <Command shouldFilter={false}>
              <DropdownMenuItem asChild className="rounded-none">
                <Link
                  className="flex items-center gap-2 cursor-pointer"
                  href="/"
                >
                  <DashboardIcon className="size-4" />
                  {t("view_dashboard")}
                </Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator className="my-0" />
              <CommandInput
                placeholder={t("search_facilities_placeholder")}
                value={search}
                onValueChange={setSearch}
                autoFocus
              />
              <CommandList className="max-h-[300px]">
                <CommandEmpty>{t("no_facilities_found")}</CommandEmpty>
                <CommandGroup heading={t("facilities")}>
                  {facilities
                    .filter((facility) =>
                      facility.name
                        .toLowerCase()
                        .includes(search.toLowerCase()),
                    )
                    .map((facility, index) => (
                      <CommandItem
                        key={index}
                        value={facility.name}
                        onSelect={() => setOpen(false)}
                        asChild
                      >
                        <Link
                          href={`/facility/${facility.id}/overview`}
                          className={cn(
                            "flex items-center gap-2",
                            facility.id === selectedFacility?.id &&
                              "bg-primary-500 text-white data-[selected=true]:bg-primary-600 data-[selected=true]:text-white",
                          )}
                        >
                          <div className="flex size-6 items-center justify-center rounded-sm border border-gray-200 shrink-0">
                            <Hospital className="size-4 shrink-0 text-current" />
                          </div>
                          {facility.name}
                        </Link>
                      </CommandItem>
                    ))}
                </CommandGroup>
              </CommandList>
              <CommandSeparator />
            </Command>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  );
}
