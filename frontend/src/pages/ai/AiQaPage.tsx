import { Link, useParams } from 'react-router-dom';
import { AiQaInterface } from '@components/ai';
import PageHeader from '../../components/ui/PageHeader';
import { ErrorPanel } from '../../components/ui/ContentPanel';

export default function AiQaPage() {
  const { groupId } = useParams<{ groupId: string }>();

  if (!groupId) {
    return (
      <section>
        <PageHeader title="AI assistant" subtitle="Ask questions about care plans and medication guidance." />
        <ErrorPanel message="No care circle selected. Open AI assistant from a group page." />
      </section>
    );
  }

  return (
    <section className="space-y-4">
      <PageHeader
        eyebrow="Care tools"
        title="AI assistant"
        subtitle="Ask questions about medications, care routines, and handover context for this circle."
        actions={
          <Link
            to={`/groups/${groupId}`}
            className="cc-outline-action inline-flex h-10 items-center rounded-lg border px-4 text-sm font-bold no-underline"
          >
            Back to group
          </Link>
        }
      />
      <div
        className="overflow-hidden rounded-2xl border bg-white"
        style={{ borderColor: 'var(--color-border)' }}
      >
        <AiQaInterface groupId={groupId} />
      </div>
    </section>
  );
}
