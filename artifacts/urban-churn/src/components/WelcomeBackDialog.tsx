import { useState, useEffect } from "react";
import { useCustomerAuth } from "@/components/CustomerAuthContext";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";

const WELCOME_KEY_PREFIX = "uc-welcome-seen-";

export default function WelcomeBackDialog() {
    const { customer } = useCustomerAuth();
    const [open, setOpen] = useState(false);

    useEffect(() => {
        if (!customer?.wooCustomerId) return;
        const key = `${WELCOME_KEY_PREFIX}${customer.id}`;
        if (!localStorage.getItem(key)) {
            setOpen(true);
        }
    }, [customer]);

    const handleClose = () => {
        if (customer) {
            localStorage.setItem(`${WELCOME_KEY_PREFIX}${customer.id}`, "1");
        }
        setOpen(false);
    };

    if (!customer?.wooCustomerId) return null;

    return (
        <Dialog open={open} onOpenChange={(v) => { if (!v) handleClose(); }}>
            <DialogContent className="sm:max-w-lg">
                <DialogHeader>
                    <DialogTitle className="text-xl font-black text-gray-900">
                        Welcome Back to Urban Churn!
                    </DialogTitle>
                </DialogHeader>
                <div className="space-y-4 pt-1">
                    <p className="text-gray-600 text-sm leading-relaxed">
                        Hey{customer.firstName ? ` ${customer.firstName}` : ""}! We're excited to welcome you to our brand new website and customer dashboard,
                        built by{" "}
                        <span className="font-semibold text-gray-800">SparkPress Studios</span>.
                    </p>
                    <p className="text-gray-600 text-sm leading-relaxed">
                        Everything you love about Urban Churn is still here — plus a fresh new look, easier ordering,
                        loyalty rewards tracking, and more. Take a look around!
                    </p>
                    <div className="bg-[#A1AB74]/10 border border-[#A1AB74]/20 rounded-xl p-4">
                        <p className="text-sm text-[#5c6339] font-medium">
                            Have any questions? We'd love to hear from you!
                        </p>
                        <a
                            href="mailto:contact@urbanchurn.com"
                            className="text-sm font-bold text-[#A1AB74] hover:underline"
                        >
                            contact@urbanchurn.com
                        </a>
                    </div>
                    <button
                        onClick={handleClose}
                        className="w-full py-3 bg-[#A1AB74] text-white rounded-xl font-bold text-sm hover:bg-[#8a9463] transition-colors"
                    >
                        Let's Go!
                    </button>
                </div>
            </DialogContent>
        </Dialog>
    );
}
