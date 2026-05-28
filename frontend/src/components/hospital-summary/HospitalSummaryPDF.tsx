import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Download, Share2, Loader2, AlertCircle, FileText } from 'lucide-react';
import axios from 'axios';

export function HospitalSummaryPDF() {
  const { groupId } = useParams<{ groupId: string }>();
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [generatedPdf, setGeneratedPdf] = useState<Blob | null>(null);

  const generatePDF = async () => {
    setIsGenerating(true);
    setError(null);

    try {
      const response = await axios.post(
        `/api/hospital-summary/generate-pdf`,
        { groupId },
        { responseType: 'blob' }
      );
      setGeneratedPdf(response.data);
    } catch (err: any) {
      const errorMessage =
        err.response?.data?.message || 'Failed to generate PDF. Please try again.';
      setError(errorMessage);
    } finally {
      setIsGenerating(false);
    }
  };

  const downloadPDF = () => {
    if (!generatedPdf) return;
    const url = window.URL.createObjectURL(generatedPdf);
    const a = document.createElement('a');
    a.href = url;
    a.download = `hospital-summary-${groupId || 'group'}-${new Date().toISOString().split('T')[0]}.pdf`;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
  };

  const sharePDF = async () => {
    if (!generatedPdf) return;
    try {
      const file = new File(
        [generatedPdf],
        `hospital-summary-${groupId || 'group'}.pdf`,
        { type: 'application/pdf' }
      );
      if (navigator.share) {
        await navigator.share({
          title: `Hospital Visit Summary - ${groupId || 'Group'}`,
          text: 'Care profile summary for hospital/emergency department',
          files: [file],
        });
      } else {
        alert('Share API not supported. Please download the PDF instead.');
        downloadPDF();
      }
    } catch (err: any) {
      if (err.name !== 'AbortError') {
        setError('Failed to share PDF. Please try downloading instead.');
      }
    }
  };

  const handleRetry = () => {
    setError(null);
    setGeneratedPdf(null);
    generatePDF();
  };

  useEffect(() => {
    if (groupId && !generatedPdf && !isGenerating && !error) {
      generatePDF();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [groupId]);

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0">
          <h1
            className="text-[28px] font-extrabold tracking-tight"
            style={{ color: 'var(--color-text-primary)' }}
          >
            Hospital Visit Summary
          </h1>
          <p className="mt-2 text-sm" style={{ color: 'var(--color-text-secondary)' }}>
            Generate a PDF summary of medications, GP contacts, and care notes for hospital visits.
          </p>
        </div>
      </header>

      <article
        className="overflow-hidden rounded-2xl border bg-white"
        style={{ borderColor: 'var(--color-border)' }}
      >
        <div
          className="border-b px-6 py-5"
          style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-primary-light)' }}
        >
          <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p
                className="text-[11px] font-bold uppercase tracking-wide"
                style={{ color: 'var(--color-primary)' }}
              >
                Hospital ready
              </p>
              <h2 className="mt-1 text-lg font-extrabold" style={{ color: 'var(--color-text-primary)' }}>
                Patient summary
              </h2>
              <p className="mt-1 text-sm" style={{ color: 'var(--color-text-secondary)' }}>
                Includes current medications, GP contacts, and recent care notes.
              </p>
            </div>

            {!generatedPdf ? (
              <button
                onClick={generatePDF}
                disabled={isGenerating}
                className="inline-flex h-10 items-center gap-2 rounded-lg px-4 text-sm font-bold text-white"
                style={{ backgroundColor: 'var(--color-primary)' }}
              >
                {isGenerating ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <FileText size={16} />
                    Generate PDF
                  </>
                )}
              </button>
            ) : (
              <div className="flex gap-2">
                <button
                  onClick={downloadPDF}
                  className="inline-flex h-10 items-center gap-2 rounded-lg px-4 text-sm font-bold text-white"
                  style={{ backgroundColor: 'var(--color-primary)' }}
                >
                  <Download size={16} />
                  Download
                </button>
                <button
                  onClick={sharePDF}
                  className="inline-flex h-10 items-center gap-2 rounded-lg border px-4 text-sm font-bold"
                  style={{ borderColor: 'var(--color-primary)', color: 'var(--color-primary)' }}
                >
                  <Share2 size={16} />
                  Share
                </button>
              </div>
            )}
          </div>
        </div>

        <div className="p-6">
          {error && (
            <div
              className="mb-6 rounded-xl border p-4 text-sm"
              style={{
                borderColor: 'var(--color-status-critical)',
                backgroundColor: 'var(--color-status-critical-bg)',
                color: 'var(--color-status-critical)',
              }}
            >
              <div className="flex items-start gap-2">
                <AlertCircle size={18} className="shrink-0 mt-0.5" />
                <div>
                  <p className="font-bold">Error</p>
                  <p className="text-sm mt-1">{error}</p>
                  <button
                    onClick={handleRetry}
                    className="mt-2 rounded-lg px-3 py-1 text-xs font-bold text-white"
                    style={{ backgroundColor: 'var(--color-status-critical)' }}
                  >
                    Try again
                  </button>
                </div>
              </div>
            </div>
          )}

          {generatedPdf && (
            <div className="space-y-4">
              <div
                className="rounded-xl border bg-white p-4 text-center"
                style={{ borderColor: 'var(--color-border)' }}
              >
                <p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>
                  PDF generated successfully. Ready to download or share.
                </p>
              </div>

              <div>
                <h3 className="mb-2 text-sm font-bold" style={{ color: 'var(--color-text-primary)' }}>
                  Preview
                </h3>
                <div
                  className="overflow-hidden rounded-xl border"
                  style={{ borderColor: 'var(--color-border)', height: '500px' }}
                >
                  <object
                    data={window.URL.createObjectURL(generatedPdf)}
                    type="application/pdf"
                    width="100%"
                    height="100%"
                  >
                    <p className="p-4 text-center" style={{ color: 'var(--color-text-secondary)' }}>
                      PDF preview not available. Please download the file.
                    </p>
                  </object>
                </div>
              </div>
            </div>
          )}
        </div>
      </article>
    </div>
  );
}