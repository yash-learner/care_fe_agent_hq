import { X } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";

import { Button } from "@/components/ui/button";
import {
  Drawer,
  DrawerContent,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

import useBreakpoints from "@/hooks/useBreakpoints";

import { cn } from "@/lib/utils";
import FilterRenderer from "./filterRenderer";
import useMultiFilter from "./utils/useMultiFilter";
import { FilterState, FilterValues, Operation } from "./utils/Utils";

function SubMenuFilter({
  selectedOption,
  setSelectedOption,
  availableOptions,
}: {
  selectedOption: Operation | null;
  setSelectedOption: (option: Operation) => void;
  availableOptions: Operation[];
}) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);

  if (!selectedOption) return <></>;

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <div className="flex items-center gap-2 px-2.5 h-9 border-x border-gray-200 underline cursor-pointer text-sm text-gray-600 whitespace-nowrap">
          {t(selectedOption.label)}
        </div>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        className="w-[var(--radix-dropdown-menu-trigger-width)] p-0"
        align="start"
      >
        {availableOptions.map((option) => (
          <DropdownMenuItem
            key={option.value || option.label}
            onSelect={() => setSelectedOption(option)}
          >
            {t(option.label)}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function SelectedFilterBar({
  selectedFilterKey,
  selectedFilters,
  onClick,
  clearFilter,
  openState,
  setOpenState,
  onFilterChange,
  onOperationChange,
  selectedBarClassName,
  facilityId,
}: {
  selectedFilterKey: string;
  selectedFilters: Record<string, FilterState>;
  onClick: () => void;
  clearFilter: () => void;
  openState: boolean;
  setOpenState: (open: boolean) => void;
  onFilterChange: (filterKey: string, values: FilterValues) => void;
  onOperationChange: (filterKey: string, operation: string) => void;
  selectedBarClassName?: string;
  facilityId?: string;
}) {
  const { t } = useTranslation();
  const { filter, selected, selectedOperation, availableOperations } =
    useMultiFilter(selectedFilterKey, selectedFilters);
  const isMobile = useBreakpoints({ default: true, sm: false });

  if (!selectedOperation) return <></>;

  const filterTrigger = (
    <div
      className="flex items-center gap-2 px-3 h-9 border-gray-200 text-sm"
      onClick={onClick}
    >
      {filter?.icon}
      <span className="truncate text-gray-950 font-medium cursor-pointer">
        {t(filter.label)}
      </span>
    </div>
  );

  const filterEditor = (
    <FilterRenderer
      activeFilter={filter.key}
      selectedFilters={selectedFilters}
      onFilterChange={onFilterChange}
      facilityId={facilityId}
    />
  );

  return (
    <>
      {isMobile ? (
        <Drawer
          open={openState || false}
          onOpenChange={(isOpen) => setOpenState(isOpen)}
        >
          <div
            className={cn(
              "flex items-center bg-white rounded-md border border-gray-200 w-fit",
              selectedBarClassName,
            )}
          >
            <DrawerTrigger asChild>{filterTrigger}</DrawerTrigger>
            <SubMenuFilter
              selectedOption={selectedOperation ?? null}
              setSelectedOption={(operation) =>
                onOperationChange(
                  filter.key,
                  operation.value || operation.label,
                )
              }
              availableOptions={availableOperations ?? []}
            />
            <div className="flex items-center gap-2 px-3 h-9 border-gray-200 whitespace-nowrap">
              <span className="truncate text-gray-950 font-medium">
                {filter.renderSelected?.(selected, filter, onFilterChange)}
              </span>
            </div>
            {!filter?.disableClear && (
              <Button
                variant="ghost"
                onClick={clearFilter}
                className="flex border-l rounded-l-none border-gray-200 hover:bg-gray-50"
              >
                <X className="h-5 w-5 text-gray-600" />
              </Button>
            )}
          </div>
          <DrawerContent
            aria-describedby={undefined}
            className="min-h-[50vh] max-h-[85vh] px-0 pt-2 pb-0 rounded-t-lg"
          >
            <DrawerTitle className="sr-only">{t("filter_options")}</DrawerTitle>
            <div className="mt-6 pb-[env(safe-area-inset-bottom)] flex-1 overflow-y-auto">
              {filterEditor}
            </div>
          </DrawerContent>
        </Drawer>
      ) : (
        <DropdownMenu
          open={openState || false}
          onOpenChange={(isOpen) => setOpenState(isOpen)}
        >
          <div
            className={cn(
              "flex items-center bg-white rounded-md border border-gray-200 w-fit",
              selectedBarClassName,
            )}
          >
            <DropdownMenuTrigger asChild>{filterTrigger}</DropdownMenuTrigger>
            <SubMenuFilter
              selectedOption={selectedOperation ?? null}
              setSelectedOption={(operation) =>
                onOperationChange(
                  filter.key,
                  operation.value || operation.label,
                )
              }
              availableOptions={availableOperations ?? []}
            />
            <div className="flex items-center gap-2 px-3 h-9 border-gray-200 whitespace-nowrap">
              <span className="truncate text-gray-950 font-medium">
                {filter.renderSelected?.(selected, filter, onFilterChange)}
              </span>
            </div>
            {!filter?.disableClear && (
              <Button
                variant="ghost"
                onClick={clearFilter}
                className="flex border-l rounded-l-none border-gray-200 hover:bg-gray-50"
              >
                <X className="h-5 w-5 text-gray-600" />
              </Button>
            )}
          </div>
          <DropdownMenuContent className="w-[320px] p-0" align="start">
            {filterEditor}
          </DropdownMenuContent>
        </DropdownMenu>
      )}
    </>
  );
}
