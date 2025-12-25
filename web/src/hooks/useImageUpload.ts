import { useState, useCallback } from 'react';

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
        return `対応していないファイル形式です。${allowedTypes.map((t) => t.split('/')[1]).join(', ')}のみ対応しています。`;
      }

      if (file.size > maxSizeBytes) {
        const maxSizeMB = Math.round(maxSizeBytes / 1024 / 1024);
        return `ファイルサイズが大きすぎます。${maxSizeMB}MB以下のファイルを選択してください。`;
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
          throw new Error('アップロードURLの取得に失敗しました');
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
          throw new Error('ファイルのアップロードに失敗しました');
        }

        setProgress(100);

        return {
          url: public_url,
          key,
        };
      } catch (err) {
        const message =
          err instanceof Error ? err.message : 'アップロードに失敗しました';
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
