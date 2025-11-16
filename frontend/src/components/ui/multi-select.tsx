// import * as React from "react";
import { Check, ChevronsUpDown } from "lucide-react";

import { cn } from "../../lib/utils";
import { Button } from "./button";
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "./popover";
import {
    Command,
    CommandEmpty,
    CommandGroup,
    CommandItem,
    CommandList,
} from "./command";

interface Option {
    label: string;
    value: string;
}

interface MultiSelectProps {
    options: Option[];
    value: string[];
    onChange: (value: string[]) => void;
    placeholder?: string;
}

export function MultiSelect({
    options,
    value,
    onChange,
    placeholder = "Select vendors...",
}: MultiSelectProps) {
    const selectedLabels = options
        .filter((opt) => value.includes(opt.value))
        .map((opt) => opt.label);

    return (
        <Popover>
            <PopoverTrigger asChild>
                <Button
                    variant="outline"
                    role="combobox"
                    className="w-full justify-between"
                >
                    {selectedLabels.length > 0
                        ? selectedLabels.join(", ")
                        : placeholder}

                    <ChevronsUpDown className="h-4 w-4 opacity-50" />
                </Button>
            </PopoverTrigger>

            <PopoverContent className="p-0 w-full">
                <Command>
                    <CommandList>
                        <CommandEmpty>No vendors found.</CommandEmpty>

                        <CommandGroup>
                            {/* HEADER ROW */}
                            
                            <div className="flex px-3 py-2 text-sm font-bold text-muted-foreground border-b text-center">
                                <div className="flex-1">Vendor</div>
                            </div>
                            {options.map((opt) => {
                                const checked = value.includes(opt.value);

                                return (
                                    <CommandItem
                                        key={opt.value}
                                        onSelect={() => {
                                            if (checked) {
                                                onChange(value.filter((v) => v !== opt.value));
                                            } else {
                                                onChange([...value, opt.value]);
                                            }
                                        }}
                                        className="px-3 py-2 my-1 rounded-md"
                                    >
                                        <Check
                                            className={cn(
                                                "mr-2 h-4 w-4",
                                                checked ? "opacity-100" : "opacity-0"
                                            )}
                                        />
                                        {opt.label}
                                    </CommandItem>
                                );
                            })}
                        </CommandGroup>
                    </CommandList>
                </Command>
            </PopoverContent>
        </Popover>
    );
}
