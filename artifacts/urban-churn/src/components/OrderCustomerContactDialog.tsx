import { useEffect, useState, type FormEvent } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export interface OrderCustomerContact {
    customerName: string;
    customerEmail: string;
    customerPhone: string;
}

interface Props {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    contact: OrderCustomerContact;
    onSave: (contact: OrderCustomerContact) => void;
    isSaving: boolean;
    error?: string;
}

/** Edits the contact snapshot for one order, not the customer's master profile or Square record. */
export function OrderCustomerContactDialog({ open, onOpenChange, contact, onSave, isSaving, error }: Props) {
    const [draft, setDraft] = useState<OrderCustomerContact>(contact);

    useEffect(() => {
        if (open) setDraft({
            customerName: contact.customerName || "",
            customerEmail: contact.customerEmail || "",
            customerPhone: contact.customerPhone || "",
        });
    }, [open, contact.customerName, contact.customerEmail, contact.customerPhone]);

    const submit = (event: FormEvent) => {
        event.preventDefault();
        if (!isSaving) onSave(draft);
    };

    return (
        <Dialog open={open} onOpenChange={(value) => { if (!isSaving) onOpenChange(value); }}>
            <DialogContent className="max-w-md">
                <DialogHeader>
                    <DialogTitle>Edit Order Customer</DialogTitle>
                    <DialogDescription>
                        Correct contact details for this preorder only. The customer database and Square are not changed.
                    </DialogDescription>
                </DialogHeader>
                <form className="space-y-4" onSubmit={submit}>
                    <div className="space-y-1">
                        <Label htmlFor="order-customer-name">Customer name *</Label>
                        <Input id="order-customer-name" required maxLength={200} value={draft.customerName}
                            onChange={(e) => setDraft({ ...draft, customerName: e.target.value })} />
                    </div>
                    <div className="space-y-1">
                        <Label htmlFor="order-customer-email">Email *</Label>
                        <Input id="order-customer-email" type="email" required maxLength={254} value={draft.customerEmail}
                            onChange={(e) => setDraft({ ...draft, customerEmail: e.target.value })} />
                    </div>
                    <div className="space-y-1">
                        <Label htmlFor="order-customer-phone">Phone</Label>
                        <Input id="order-customer-phone" type="tel" maxLength={40} value={draft.customerPhone}
                            onChange={(e) => setDraft({ ...draft, customerPhone: e.target.value })} />
                    </div>
                    {error && <p role="alert" className="text-sm text-red-600">{error}</p>}
                    <div className="flex gap-2 justify-end">
                        <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isSaving}>Cancel</Button>
                        <Button type="submit" disabled={isSaving} className="bg-[#A1AB74] hover:bg-[#8B9563] text-white">
                            {isSaving ? "Saving…" : "Save Changes"}
                        </Button>
                    </div>
                </form>
            </DialogContent>
        </Dialog>
    );
}
