import { useState } from "react";
import { UserRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { EMAIL_MERGE_TAGS } from "@/lib/email-builder/merge-tags";

type EmailMergeTagPickerProps = {
    onInsert: (tag: string) => void;
    className?: string;
};

export function EmailMergeTagPicker({ onInsert, className }: EmailMergeTagPickerProps) {
    const [open, setOpen] = useState(false);

    return (
        <DropdownMenu open={open} onOpenChange={setOpen}>
            <DropdownMenuTrigger asChild>
                <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className={className}
                    title="Insert personalization"
                >
                    <UserRound className="mr-1 h-3.5 w-3.5" />
                    Personalize
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-64">
                <DropdownMenuLabel>Contact fields</DropdownMenuLabel>
                <DropdownMenuSeparator />
                {EMAIL_MERGE_TAGS.map((item) => (
                    <DropdownMenuItem
                        key={item.tag}
                        className="flex flex-col items-start gap-0.5"
                        onSelect={() => {
                            onInsert(item.tag);
                            setOpen(false);
                        }}
                    >
                        <span className="font-medium">{item.label}</span>
                        <span className="font-mono text-xs text-gray-500">{item.tag}</span>
                    </DropdownMenuItem>
                ))}
            </DropdownMenuContent>
        </DropdownMenu>
    );
}
