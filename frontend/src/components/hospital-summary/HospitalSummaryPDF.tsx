import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Download, Share2, Loader2, AlertCircle } from 'lucide-react';
import axios from 'axios';
import { apiUrl } from '@lib/apiBaseUrl';
import { getAccessToken } from '@lib/authenticatedFetch';

export function HospitalSummaryPDF() {
  const { groupId } = useParams<{ groupId: string }>();
  const groupName = groupId || 'group';
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [generatedPdf, setGeneratedPdf] = useState<Blob | null>(null);
 
  const generatePDF = async () => {
    setIsGenerating(true);
    setError(null);
 
    try {
      const token = await getAccessToken();
      const response = await axios.post(
        apiUrl('/api/hospital-summary/generate-pdf'),
        { groupId },
        {
          responseType: 'blob',
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        },
      );
 
      setGeneratedPdf(response.data);
    } catch (err: unknown) {
      const errorResponse = err as { response?: { data?: { message?: string } } };
      const errorMessage =
        errorResponse.response?.data?.message || 'Failed to generate PDF. Please try again.';
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
    a.download = `hospital-summary-${groupName}-${new Date().toISOString().split('T')[0]}.pdf`;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
  };

  const sharePDF = async () => {
  if (!generatedPdf) return;

  const fileName = `hospital-summary-${groupId || 'group'}.pdf`;
  const file = new File([generatedPdf], fileName, { type: 'application/pdf' });

  // Check if Web Share API is available AND can share files
  if (navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {
    try {
      await navigator.share({
        title: `Hospital Visit Summary - ${groupName}`,
        text: 'Care profile summary for hospital/emergency department',
        files: [file],
      });
    } catch (err: unknown) {
      const error = err as Error;
      if (error.name !== 'AbortError') {
        alert('Sharing failed. You can download the PDF instead.');
        downloadPDF();
      }
    }
  } else {
    // Fallback for browsers that don't support file sharing
    alert('Your browser does not support sharing files. Please download the PDF.');
    downloadPDF();
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
    <div style={{ padding: '20px' }}>
      <h2 style={{ color: 'var(--color-text-primary)', marginBottom: '16px' }}>
        Hospital Visit Summary
      </h2>
 
      {!generatedPdf ? (
        // Initial state: Generate button
        <button
          onClick={generatePDF}
          disabled={isGenerating}
          style={{
            backgroundColor: 'var(--color-primary)',
            color: '#ffffff',
            border: 'none',
            padding: '12px 24px',
            borderRadius: '8px',
            cursor: isGenerating ? 'not-allowed' : 'pointer',
            opacity: isGenerating ? 0.7 : 1,
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            fontSize: '14px',
            fontWeight: 500,
          }}
        >
          {isGenerating ? (
            <>
              <Loader2 size={18} className="animate-spin" />
              Generating PDF...
            </>
          ) : (
            <>
              <Download size={18} />
              Generate PDF Summary
            </>
          )}
        </button>
      ) : (
        // PDF generated: Show download & share buttons
        <div style={{ display: 'flex', gap: '12px', flexDirection: 'column' }}>
          <div style={{ display: 'flex', gap: '12px' }}>
            <button
              onClick={downloadPDF}
              style={{
                backgroundColor: 'var(--color-primary)',
                color: '#ffffff',
                border: 'none',
                padding: '12px 24px',
                borderRadius: '8px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                fontSize: '14px',
                fontWeight: 500,
              }}
            >
              <Download size={18} />
              Download PDF
            </button>
 
            <button
              onClick={sharePDF}
              style={{
                backgroundColor: 'var(--color-primary)',
                color: '#ffffff',
                border: 'none',
                padding: '12px 24px',
                borderRadius: '8px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                fontSize: '14px',
                fontWeight: 500,
              }}
            >
              <Share2 size={18} />
              Share
            </button>
          </div>
 
          <p style={{ color: 'var(--color-text-secondary)', fontSize: '12px', margin: 0 }}>
            PDF generated successfully. Ready to download or share.
          </p>

          {/* PDF Preview */}
          <div style={{ marginTop: 12 }}>
            <h4 style={{ margin: '8px 0' }}>Preview</h4>
            <div
              style={{
                border: '1px solid var(--color-border)',
                borderRadius: 8,
                overflow: 'hidden',
                height: 600,
                background: '#fff',
              }}
            >
              {generatedPdf ? (
                <object
                  data={window.URL.createObjectURL(generatedPdf)}
                  type="application/pdf"
                  width="100%"
                  height="100%"
                >
                  <p>PDF preview not available. Please download the file.</p>
                </object>
              ) : (
                <p style={{ padding: 12 }}>No preview available.</p>
              )}
            </div>
          </div>
        </div>
      )}
 
      {error && (
        <div
          style={{
            marginTop: '16px',
            backgroundColor: 'var(--color-status-overdue-bg)',
            border: '1px solid var(--color-status-overdue)',
            borderRadius: '8px',
            padding: '12px 16px',
            display: 'flex',
            gap: '12px',
            alignItems: 'flex-start',
          }}
        >
          <AlertCircle
            size={20}
            style={{ color: 'var(--color-status-overdue)', flexShrink: 0 }}
          />
          <div>
            <p
              style={{
                color: 'var(--color-status-overdue)',
                margin: 0,
                fontSize: '14px',
                fontWeight: 500,
              }}
            >
              Error
            </p>
            <p
              style={{
                color: 'var(--color-text-primary)',
                margin: '4px 0 0 0',
                fontSize: '13px',
              }}
            >
              {error}
            </p>
            <button
              onClick={handleRetry}
              style={{
                marginTop: '8px',
                backgroundColor: 'var(--color-status-overdue)',
                color: '#ffffff',
                border: 'none',
                padding: '6px 12px',
                borderRadius: '4px',
                cursor: 'pointer',
                fontSize: '12px',
                fontWeight: 500,
              }}
            >
              Retry
            </button>
          </div>
        </div>
      )}
    </div>
  );
}