import { useState, useCallback } from 'react';
import { t } from '@lingui/macro';

interface UseImageUploadOptions {
  maxSizeBytes?: number;
  allowedTypes?: string[];
}

interface UploadResult {
  url: string;
  key: string;
}

export function useImageUpload(options: UseImageUploadOptions = {}) {
  const {
    maxSizeBytes = 5 * 1024 * 1024, // 5MB default
    allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
  } = options;

  const [isUploading, setIsUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const validateFile = useCallback(
    (file: File): string | null => {
      if (!allowedTypes.includes(file.type)) {
        const formats = allowedTypes.map((type) => type.split('/')[1]).join(', ');
        return t`Unsupported file format. Only ${formats} are supported.`;
      }

      if (file.size > maxSizeBytes) {
        const maxSizeMB = Math.round(maxSizeBytes / 1024 / 1024);
        return t`File size is too large. Please select a file under ${maxSizeMB}MB.`;
      }

      return null;
    },
    [allowedTypes, maxSizeBytes]
  );

  const uploadImage = useCallback(
    async (file: File): Promise<UploadResult | null> => {
      const validationError = validateFile(file);
      if (validationError) {
        setError(validationError);
        return null;
      }

      setIsUploading(true);
      setProgress(0);
      setError(null);

      try {
        // Get presigned URL for upload
        const presignedResponse = await fetch('/api/uploads/presign', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            filename: file.name,
            content_type: file.type,
          }),
        });

        if (!presignedResponse.ok) {
          throw new Error(t`Failed to get upload URL`);
        }

        const { upload_url, key, public_url } = await presignedResponse.json();

        // Upload to the presigned URL
        const uploadResponse = await fetch(upload_url, {
          method: 'PUT',
          headers: {
            'Content-Type': file.type,
          },
          body: file,
        });

        if (!uploadResponse.ok) {
          throw new Error(t`Failed to upload file`);
        }

        setProgress(100);

        return {
          url: public_url,
          key,
        };
      } catch (err) {
        const message =
          err instanceof Error ? err.message : t`Upload failed`;
        setError(message);
        return null;
      } finally {
        setIsUploading(false);
      }
    },
    [validateFile]
  );

  const uploadFromDataUrl = useCallback(
    async (dataUrl: string, filename: string): Promise<UploadResult | null> => {
      const response = await fetch(dataUrl);
      const blob = await response.blob();
      const file = new File([blob], filename, { type: blob.type });
      return uploadImage(file);
    },
    [uploadImage]
  );

  return {
    uploadImage,
    uploadFromDataUrl,
    isUploading,
    progress,
    error,
    clearError: () => setError(null),
  };
}
