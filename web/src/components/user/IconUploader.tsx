import { useState, useRef, useCallback } from 'react';
import { Camera, User, Loader2, X } from 'lucide-react';
import { useImageUpload } from '@/hooks/useImageUpload';

interface IconUploaderProps {
  currentIconUrl?: string;
  onUploadComplete: (url: string) => void;
  size?: 'sm' | 'md' | 'lg';
}

const SIZE_CLASSES = {
  sm: 'w-12 h-12',
  md: 'w-20 h-20',
  lg: 'w-32 h-32',
};

export default function IconUploader({
  currentIconUrl,
  onUploadComplete,
  size = 'md',
}: IconUploaderProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const { uploadImage, isUploading, error, clearError } = useImageUpload({
    maxSizeBytes: 2 * 1024 * 1024, // 2MB for icons
    allowedTypes: ['image/jpeg', 'image/png', 'image/webp'],
  });

  const handleFileSelect = useCallback(
    async (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (!file) return;

      // Create preview
      const reader = new FileReader();
      reader.onload = (e) => {
        setPreviewUrl(e.target?.result as string);
      };
      reader.readAsDataURL(file);

      // Upload
      const result = await uploadImage(file);
      if (result) {
        onUploadComplete(result.url);
        setPreviewUrl(null);
      }
    },
    [uploadImage, onUploadComplete]
  );

  const handleClick = () => {
    inputRef.current?.click();
  };

  const handleRemove = () => {
    setPreviewUrl(null);
    if (inputRef.current) {
      inputRef.current.value = '';
    }
  };

  const displayUrl = previewUrl || currentIconUrl;

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-4">
        <div
          className={`relative ${SIZE_CLASSES[size]} rounded-full bg-muted flex items-center justify-center overflow-hidden group cursor-pointer`}
          onClick={handleClick}
        >
          {displayUrl ? (
            <img
              src={displayUrl}
              alt="アイコン"
              className="w-full h-full object-cover"
            />
          ) : (
            <User className="w-1/2 h-1/2 text-muted-foreground" />
          )}

          {/* Overlay */}
          <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
            {isUploading ? (
              <Loader2 className="w-6 h-6 text-white animate-spin" />
            ) : (
              <Camera className="w-6 h-6 text-white" />
            )}
          </div>

          {/* Remove button */}
          {displayUrl && !isUploading && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleRemove();
              }}
              className="absolute -top-1 -right-1 p-1 bg-destructive text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <X className="w-3 h-3" />
            </button>
          )}
        </div>

        <div className="flex-1">
          <button
            onClick={handleClick}
            disabled={isUploading}
            className="px-4 py-2 border border-border rounded-md hover:bg-accent disabled:opacity-50"
          >
            {isUploading ? '処理中...' : 'アイコンを変更'}
          </button>
          <p className="text-xs text-muted-foreground mt-1">
            JPG, PNG, WebP (2MB以下)
          </p>
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-2 text-sm text-destructive">
          <span>{error}</span>
          <button
            onClick={clearError}
            className="text-xs underline hover:no-underline"
          >
            閉じる
          </button>
        </div>
      )}

      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        onChange={handleFileSelect}
        className="hidden"
      />
    </div>
  );
}
