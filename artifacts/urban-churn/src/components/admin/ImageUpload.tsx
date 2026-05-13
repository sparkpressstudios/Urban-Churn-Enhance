import { useState, useRef } from "react";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Upload, X, Loader2 } from "lucide-react";

interface ImageUploadProps {
    value?: string | null;
    onChange: (url: string | null) => void;
}

export function ImageUpload({ value, onChange }: ImageUploadProps) {
    const [uploading, setUploading] = useState(false);
    const inputRef = useRef<HTMLInputElement>(null);

    const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setUploading(true);
        try {
            const result = await api.uploadImage(file);
            onChange(result.url);
        } catch (err: any) {
            alert(err.message || "Upload failed");
        } finally {
            setUploading(false);
            if (inputRef.current) inputRef.current.value = "";
        }
    };

    return (
        <div className="space-y-2">
            {value && (
                <div className="relative inline-block">
                    <img
                        src={value}
                        alt="Uploaded"
                        className="w-32 h-32 object-cover rounded-lg border"
                    />
                    <button
                        type="button"
                        onClick={() => onChange(null)}
                        className="absolute -top-2 -right-2 w-6 h-6 bg-destructive text-white rounded-full flex items-center justify-center"
                    >
                        <X className="w-3 h-3" />
                    </button>
                </div>
            )}
            <div>
                <input
                    ref={inputRef}
                    type="file"
                    accept="image/jpeg,image/png,image/webp,image/gif"
                    onChange={handleUpload}
                    className="hidden"
                />
                <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={uploading}
                    onClick={() => inputRef.current?.click()}
                >
                    {uploading ? (
                        <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Uploading...</>
                    ) : (
                        <><Upload className="w-4 h-4 mr-2" /> {value ? "Change Image" : "Upload Image"}</>
                    )}
                </Button>
            </div>
        </div>
    );
}
