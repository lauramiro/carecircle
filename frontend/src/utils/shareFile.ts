export async function shareFile(file: File, options?: { title?: string; text?: string }): Promise<void> {
  if (!navigator.share) {
    throw new Error('Sharing is not supported on this device. Please download the file instead.');
  }

  const shareData: ShareData = {
    title: options?.title ?? file.name,
    text: options?.text,
    files: [file],
  };

  if (navigator.canShare && !navigator.canShare(shareData)) {
    throw new Error('This file cannot be shared from your browser. Please download it instead.');
  }

  try {
    await navigator.share(shareData);
  } catch (err: unknown) {
    if (err instanceof Error && err.name === 'AbortError') {
      return;
    }

    throw err;
  }
}

export async function downloadBlob(blob: Blob, fileName: string): Promise<void> {
  const url = window.URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = fileName;
  document.body.appendChild(anchor);
  anchor.click();
  window.URL.revokeObjectURL(url);
  document.body.removeChild(anchor);
}
