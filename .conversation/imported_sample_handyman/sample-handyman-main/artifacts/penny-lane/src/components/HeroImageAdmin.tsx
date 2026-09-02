/**
 * Homepage hero image controls (Settings tab).
 * Staff (admin / super_admin / member) can upload or reset like gallery content.
 */
import { useEffect, useState } from 'react';
import {
  getGetSiteSettingsQueryKey,
  useGetSiteSettings,
} from '@workspace/api-client-react';
import { useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { useResetHeroImage, useUploadHeroImage } from '@/lib/admin-api';
import defaultHeroImage from '@assets/generated_images/hero-light-fixture.jpg';
import { ImageIcon, Loader2, RotateCcw, Upload } from 'lucide-react';

function revokePreview(url: string | null) {
  if (url?.startsWith('blob:')) URL.revokeObjectURL(url);
}

export function HeroImageAdmin() {
  const queryClient = useQueryClient();
  const { data, isLoading, isError } = useGetSiteSettings();
  const uploadMutation = useUploadHeroImage();
  const resetMutation = useResetHeroImage();

  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [confirmReset, setConfirmReset] = useState(false);

  useEffect(() => {
    return () => revokePreview(preview);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const customUrl = data?.heroImageUrl?.trim() || '';
  const displaySrc = preview || customUrl || defaultHeroImage;
  const busy = uploadMutation.isPending || resetMutation.isPending;

  const onFileChange = (next: File | null) => {
    setError(null);
    setSaved(false);
    setFile(next);
    setPreview((prev) => {
      revokePreview(prev);
      return next ? URL.createObjectURL(next) : null;
    });
  };

  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: getGetSiteSettingsQueryKey() });

  const onUpload = async () => {
    setError(null);
    setSaved(false);
    if (!file) {
      setError('Choose an image to upload.');
      return;
    }
    try {
      await uploadMutation.mutateAsync(file);
      onFileChange(null);
      setSaved(true);
      await invalidate();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed.');
    }
  };

  const onReset = async () => {
    setError(null);
    setSaved(false);
    try {
      await resetMutation.mutateAsync();
      onFileChange(null);
      setConfirmReset(false);
      setSaved(true);
      await invalidate();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Reset failed.');
    }
  };

  if (isLoading) {
    return (
      <Card className="border-2 shadow-lg">
        <CardContent className="py-10 flex justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </CardContent>
      </Card>
    );
  }

  if (isError) {
    return (
      <Card className="border-2 border-destructive/30">
        <CardContent className="py-8 text-center text-destructive font-medium">
          Could not load hero image settings.
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card className="border-2 shadow-lg">
        <CardHeader>
          <CardTitle className="font-display text-2xl flex items-center gap-2">
            <ImageIcon className="w-5 h-5 text-primary" />
            Homepage hero image
          </CardTitle>
          <p className="text-muted-foreground text-sm">
            Shown on the public home page. JPEG, PNG, or WebP · max 5MB.
          </p>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="relative rounded-2xl overflow-hidden ring-1 ring-border bg-muted/40">
            <img
              src={displaySrc}
              alt="Homepage hero preview"
              className="w-full h-auto max-h-72 object-cover"
            />
          </div>
          <p className="text-xs text-muted-foreground">
            {customUrl
              ? 'Custom image is live on the site.'
              : 'Using the built-in default image.'}
          </p>

          <div className="space-y-2">
            <Label htmlFor="hero-image-file">Replace image</Label>
            <input
              id="hero-image-file"
              type="file"
              accept="image/jpeg,image/png,image/webp"
              disabled={busy}
              className="block w-full text-sm text-muted-foreground file:mr-3 file:rounded-lg file:border-0 file:bg-primary file:px-3 file:py-2 file:text-sm file:font-display file:font-bold file:text-primary-foreground"
              onChange={(e) => onFileChange(e.target.files?.[0] ?? null)}
            />
          </div>

          {error ? (
            <p className="text-sm text-destructive font-medium">{error}</p>
          ) : null}
          {saved && !error ? (
            <p className="text-sm text-primary font-medium">Saved.</p>
          ) : null}

          <div className="flex flex-wrap gap-3">
            <Button
              type="button"
              disabled={busy || !file}
              className="font-display font-bold"
              onClick={() => void onUpload()}
            >
              {uploadMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Uploading...
                </>
              ) : (
                <>
                  <Upload className="w-4 h-4 mr-2" />
                  Upload hero
                </>
              )}
            </Button>
            <Button
              type="button"
              variant="outline"
              disabled={busy || !customUrl}
              className="font-display font-bold"
              onClick={() => setConfirmReset(true)}
            >
              <RotateCcw className="w-4 h-4 mr-2" />
              Reset to default
            </Button>
          </div>
        </CardContent>
      </Card>

      <ConfirmDialog
        open={confirmReset}
        onOpenChange={setConfirmReset}
        title="Reset hero image?"
        description="Remove the custom homepage hero and restore the built-in default."
        confirmLabel="Reset"
        variant="default"
        loading={resetMutation.isPending}
        onConfirm={() => void onReset()}
      />
    </>
  );
}
