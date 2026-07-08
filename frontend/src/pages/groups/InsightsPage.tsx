import { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useAuth } from '@contexts/AuthContext.tsx';
import { getLatestInsights, getArchivedDigests, dismissInsight, triggerInsightGeneration, type WeeklyDigest,
  type InsightCard } from '@api/insights.service.ts';
import PageHeader from '../../components/ui/PageHeader';
import { ContentPanel, ErrorPanel, LoadingPanel } from '@components/ui/ContentPanel.tsx';
import { ChevronDown, ChevronUp, ExternalLink, X, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { toast } from 'react-toastify';
import { MedicalDisclaimerBanner } from '@components/ui/MedicalDisclaimerBanner';

export default function InsightsPage() {
  const { groupId } = useParams<{ groupId: string }>();
  const { session } = useAuth();
  const userId = session?.user?.id;

  const [latestDigest, setLatestDigest] = useState<WeeklyDigest | null>(null);
  const [insightCards, setInsightCards] = useState<InsightCard[]>([]);
  const [archivedDigests, setArchivedDigests] = useState<WeeklyDigest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isArchiveOpen, setIsArchiveOpen] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);

  const loadData = useCallback(async () => {
    if (!groupId || !userId) return;
    setIsLoading(true);
    try {
      const [latest, archived] = await Promise.all([
        getLatestInsights(groupId, userId),
        getArchivedDigests(groupId),
      ]);
      setLatestDigest(latest.digest);
      setInsightCards(latest.cards);
      setArchivedDigests(archived);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load insights');
    } finally {
      setIsLoading(false);
    }
  }, [groupId, userId]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const handleDismiss = async (cardId: string) => {
    if (!userId) return;
    try {
      await dismissInsight(cardId, userId);
      setInsightCards((prev) => prev.filter((c) => c.id !== cardId));
      toast.success('Insight dismissed');
    } catch {
      toast.error('Failed to dismiss insight');
    }
  };

  const handleGenerate = async () => {
    if (!groupId) return;
    setIsGenerating(true);
    try {
      await triggerInsightGeneration(groupId);
      toast.success('Insight generation triggered');
      await loadData();
    } catch {
      toast.error('Failed to trigger insight generation');
    } finally {
      setIsGenerating(false);
    }
  };

  if (isLoading) return <LoadingPanel message={""} />;
  if (error) return <ErrorPanel message={error} />;
  if (!groupId) return <ErrorPanel message="No group selected" />;

  return (
    <section className="space-y-6">
      <PageHeader
        eyebrow="Care coordination"
        title="Weekly Insights"
        subtitle="AI-generated summaries to help you prepare for GP appointments."
        actions={
          <button
            onClick={handleGenerate}
            disabled={isGenerating}
            className="px-4 py-2 rounded-lg text-sm font-bold transition-colors disabled:opacity-50"
            style={{ 
              backgroundColor: 'var(--color-brand-primary)',
              color: 'white'
            }}
          >
            {isGenerating ? 'Generating...' : 'Generate Now'}
          </button>
        }
      />

      <MedicalDisclaimerBanner compact />

      <div className="space-y-4">
        <h3 className="text-lg font-bold" style={{ color: 'var(--color-text-primary)' }}>
          Latest Digest {latestDigest && `(${new Date(latestDigest.start_date).toLocaleDateString()} - ${new Date(latestDigest.end_date).toLocaleDateString()})`}
        </h3>

        {insightCards.length > 0 ? (
          <div className="grid gap-4 md:grid-cols-2">
            {insightCards.map((card) => (
              <InsightCardComponent key={card.id} card={card} onDismiss={() => handleDismiss(card.id)} />
            ))}
          </div>
        ) : (
          <ContentPanel>
            <p className="text-sm text-center" style={{ color: 'var(--color-text-secondary)' }}>
              No new insights at this time. Check back next Monday!
            </p>
          </ContentPanel>
        )}
      </div>

      <div className="pt-6">
        <button
          onClick={() => setIsArchiveOpen(!isArchiveOpen)}
          className="flex items-center space-x-2 text-sm font-bold"
          style={{ color: 'var(--color-brand-primary)' }}
        >
          {isArchiveOpen ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
          <span>{isArchiveOpen ? 'Hide Archive' : 'View Past Insights'}</span>
        </button>

        {isArchiveOpen && (
          <div className="mt-4 space-y-6">
            {archivedDigests.length > 0 ? (
              archivedDigests.map((digest) => (
                <div key={digest.id} className="space-y-3">
                  <h4 className="text-sm font-bold" style={{ color: 'var(--color-text-secondary)' }}>
                    Week of {new Date(digest.start_date).toLocaleDateString()}
                  </h4>
                  <div className="grid gap-4 md:grid-cols-2">
                    {digest.insight_cards?.map((card) => (
                      <InsightCardComponent key={card.id} card={card} readOnly />
                    ))}
                  </div>
                </div>
              ))
            ) : (
              <p className="text-sm italic" style={{ color: 'var(--color-text-hint)' }}>
                No archived digests yet.
              </p>
            )}
          </div>
        )}
      </div>
    </section>
  );
}

function InsightCardComponent({ card, onDismiss, readOnly }: { card: InsightCard; onDismiss?: () => void; readOnly?: boolean }) {
  return (
    <div
      className="relative flex flex-col p-4 rounded-xl border bg-white shadow-sm transition-shadow hover:shadow-md"
      style={{ borderColor: 'var(--color-border)' }}
    >
      {!readOnly && onDismiss && (
        <button
          onClick={onDismiss}
          className="absolute top-2 right-2 p-1 rounded-full hover:bg-gray-100"
          style={{ color: 'var(--color-text-hint)' }}
        >
          <X size={16} />
        </button>
      )}

      <div className="flex items-start space-x-3 pr-6">
        <div className="mt-1">
          {card.trend_direction === 'up' && <TrendingUp className="text-red-500" size={20} />}
          {card.trend_direction === 'down' && <TrendingDown className="text-green-500" size={20} />}
          {(card.trend_direction === 'stable' || !card.trend_direction) && <Minus className="text-gray-400" size={20} />}
        </div>
        <div className="flex-1 space-y-1">
          <h4 className="font-bold text-sm" style={{ color: 'var(--color-text-primary)' }}>{card.title}</h4>
          <p className="text-xs leading-relaxed" style={{ color: 'var(--color-text-secondary)' }}>
            {card.description}
          </p>
        </div>
      </div>

      <div className="mt-4 pt-3 border-t flex justify-end" style={{ borderColor: 'var(--color-border)' }}>
        <Link
          to={card.data_link}
          className="inline-flex items-center space-x-1 text-xs font-bold"
          style={{ color: 'var(--color-brand-primary)' }}
        >
          <span>View Details</span>
          <ExternalLink size={14} />
        </Link>
      </div>
    </div>
  );
}
