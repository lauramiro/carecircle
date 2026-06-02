import { useState } from 'react';
import { HeartPulse } from 'lucide-react';
import { useWellbeingCheckIns } from '../../hooks/wellbeing/useWellbeingCheckIns';
import type { CreateWellbeingCheckInInput } from '../../api/wellbeing/wellbeing.types';
import { getErrorMessage } from '../../utils/helper';

const QUESTIONS: Array<{
  key: keyof CreateWellbeingCheckInInput;
  label: string;
  hint: string;
}> = [
  {
    key: 'sleepQuality',
    label: 'How well have you been sleeping this week?',
    hint: '1 = Very poorly, 5 = Very well',
  },
  {
    key: 'stressLevel',
    label: 'How stressed have you felt this week?',
    hint: '1 = Not at all, 5 = Extremely',
  },
  {
    key: 'overwhelmLevel',
    label: 'How overwhelmed have you felt by caring responsibilities?',
    hint: '1 = Not at all, 5 = Extremely',
  },
  {
    key: 'socialConnection',
    label: 'How connected have you felt to your support network?',
    hint: '1 = Very isolated, 5 = Very connected',
  },
  {
    key: 'overallMood',
    label: 'How would you rate your overall mood this week?',
    hint: '1 = Very low, 5 = Very positive',
  },
];

const INITIAL_FORM: CreateWellbeingCheckInInput = {
  sleepQuality: 0,
  stressLevel: 0,
  overwhelmLevel: 0,
  socialConnection: 0,
  overallMood: 0,
};

function formatWeekStart(weekStart: string): string {
  return new Intl.DateTimeFormat(undefined, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(new Date(`${weekStart}T00:00:00.000Z`));
}

export default function WellbeingCheckInSection() {
  const {
    canSubmitCheckIn,
    checkIns,
    dismissSupportMessage,
    error,
    hasCurrentWeekCheckIn,
    isDismissingSupportMessage,
    isLoading,
    isPrimaryCarer,
    isSubmitting,
    supportTrigger,
    submitCheckIn,
  } = useWellbeingCheckIns();
  const [form, setForm] = useState<CreateWellbeingCheckInInput>(INITIAL_FORM);
  const [formError, setFormError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const hasMissingAnswer = QUESTIONS.some(({ key }) => form[key] < 1 || form[key] > 5);
    if (hasMissingAnswer) {
      setFormError('Answer all five wellbeing questions before submitting.');
      return;
    }

    try {
      await submitCheckIn(form);
      setForm(INITIAL_FORM);
      setFormError(null);
      setSuccessMessage('Your private wellbeing check-in has been saved for this week.');
    } catch (submitError) {
      setFormError(getErrorMessage(submitError) || 'Unable to save your wellbeing check-in.');
      setSuccessMessage(null);
    }
  }

  return (
    <article
      id="wellbeing-checkin"
      className="rounded-2xl border bg-white p-5"
      style={{ borderColor: 'var(--color-border)', scrollMarginTop: '1.5rem' }}
    >
      <div className="flex items-start gap-3">
        <span
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl"
          style={{ backgroundColor: 'var(--color-primary-light)', color: 'var(--color-primary)' }}
        >
          <HeartPulse size={20} strokeWidth={1.9} />
        </span>
        <div>
          <h2 className="text-base font-bold" style={{ color: 'var(--color-text-primary)' }}>
            Weekly wellbeing check-in
          </h2>
          <p className="mt-1 text-sm leading-relaxed" style={{ color: 'var(--color-text-secondary)' }}>
            A private five-question check-in for primary carers. One response can be submitted each week.
          </p>
        </div>
      </div>

      {isLoading ? (
        <p className="mt-4 text-sm" style={{ color: 'var(--color-text-secondary)' }}>
          Loading wellbeing check-ins...
        </p>
      ) : !isPrimaryCarer ? (
        <div
          className="mt-4 rounded-xl border p-4 text-sm"
          style={{
            borderColor: 'var(--color-border)',
            backgroundColor: 'var(--color-primary-light)',
            color: 'var(--color-text-secondary)',
          }}
        >
          This private weekly check-in is available to primary carers only.
        </div>
      ) : (
        <div className="mt-4 grid gap-6 xl:grid-cols-[minmax(0,1.35fr)_minmax(280px,0.85fr)]">
          <form onSubmit={handleSubmit} className="space-y-4">
            {supportTrigger ? (
              <div
                className="rounded-xl border p-4"
                style={{
                  borderColor: 'var(--color-status-overdue)',
                  backgroundColor: 'var(--color-status-overdue-bg)',
                }}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-bold" style={{ color: 'var(--color-text-primary)' }}>
                      It looks like the last two weeks have been especially heavy.
                    </p>
                    <p className="mt-2 text-sm leading-relaxed" style={{ color: 'var(--color-text-secondary)' }}>
                      This is a private prompt for you only. Consider redistributing some upcoming shifts,
                      reaching out to carers&apos; support organisations, or booking your own GP appointment
                      if you need extra support.
                    </p>
                    <p className="mt-2 text-xs" style={{ color: 'var(--color-text-secondary)' }}>
                      Latest average score: {supportTrigger.averageScore.toFixed(1)} / 5.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => void dismissSupportMessage()}
                    disabled={isDismissingSupportMessage}
                    className="rounded-lg border px-3 py-2 text-xs font-bold disabled:cursor-not-allowed disabled:opacity-70"
                    style={{ borderColor: 'var(--color-status-overdue)', color: 'var(--color-text-primary)' }}
                  >
                    {isDismissingSupportMessage ? 'Dismissing...' : 'Dismiss'}
                  </button>
                </div>
              </div>
            ) : null}

            {QUESTIONS.map((question) => (
              <fieldset key={question.key} className="rounded-xl border p-4" style={{ borderColor: 'var(--color-border)' }}>
                <legend className="text-sm font-bold" style={{ color: 'var(--color-text-primary)' }}>
                  {question.label}
                </legend>
                <p className="mt-1 text-xs" style={{ color: 'var(--color-text-secondary)' }}>
                  {question.hint}
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {[1, 2, 3, 4, 5].map((value) => (
                    <label key={value} className="cursor-pointer">
                      <input
                        type="radio"
                        name={question.key}
                        value={value}
                        checked={form[question.key] === value}
                        onChange={() => {
                          setForm((currentForm) => ({ ...currentForm, [question.key]: value }));
                          setFormError(null);
                          setSuccessMessage(null);
                        }}
                        className="sr-only"
                      />
                      <span
                        className="inline-flex h-10 w-10 items-center justify-center rounded-lg border text-sm font-bold"
                        style={{
                          borderColor: form[question.key] === value ? 'var(--color-primary)' : 'var(--color-border)',
                          backgroundColor: form[question.key] === value ? 'var(--color-primary-light)' : 'var(--color-card)',
                          color: form[question.key] === value ? 'var(--color-primary)' : 'var(--color-text-secondary)',
                        }}
                      >
                        {value}
                      </span>
                    </label>
                  ))}
                </div>
              </fieldset>
            ))}

            {formError || error ? (
              <p className="text-sm" style={{ color: 'var(--color-status-critical)' }}>
                {formError || error}
              </p>
            ) : null}

            {successMessage ? (
              <p className="text-sm" style={{ color: 'var(--color-primary)' }}>
                {successMessage}
              </p>
            ) : null}

            {hasCurrentWeekCheckIn ? (
              <p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>
                You have already completed this week&apos;s check-in.
              </p>
            ) : null}

            <button
              type="submit"
              disabled={!canSubmitCheckIn || isSubmitting}
              className="h-11 rounded-lg px-4 text-sm font-bold text-white disabled:cursor-not-allowed disabled:opacity-70"
              style={{ backgroundColor: 'var(--color-primary)' }}
            >
              {isSubmitting ? 'Saving...' : 'Submit weekly check-in'}
            </button>
          </form>

          <div className="rounded-xl border p-4" style={{ borderColor: 'var(--color-border)' }}>
            <h3 className="text-sm font-bold" style={{ color: 'var(--color-text-primary)' }}>
              Recent private check-ins
            </h3>
            <p className="mt-1 text-xs leading-relaxed" style={{ color: 'var(--color-text-secondary)' }}>
              Scores are visible only to you and help track your recent trend.
            </p>

            {checkIns.length === 0 ? (
              <p className="mt-4 text-sm" style={{ color: 'var(--color-text-secondary)' }}>
                No wellbeing check-ins recorded yet.
              </p>
            ) : (
              <div className="mt-4 space-y-3">
                {checkIns.map((checkIn) => (
                  <article
                    key={checkIn.id}
                    className="rounded-xl border p-3"
                    style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-card)' }}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-sm font-bold" style={{ color: 'var(--color-text-primary)' }}>
                        Week of {formatWeekStart(checkIn.weekStart)}
                      </p>
                      <span
                        className="rounded-full px-2.5 py-1 text-xs font-bold"
                        style={{ backgroundColor: 'var(--color-primary-light)', color: 'var(--color-primary)' }}
                      >
                        Score {checkIn.compositeScore}/25
                      </span>
                    </div>
                    <dl className="mt-3 grid grid-cols-2 gap-x-3 gap-y-2 text-xs" style={{ color: 'var(--color-text-secondary)' }}>
                      <div>
                        <dt>Sleep</dt>
                        <dd>{checkIn.sleepQuality}/5</dd>
                      </div>
                      <div>
                        <dt>Stress</dt>
                        <dd>{checkIn.stressLevel}/5</dd>
                      </div>
                      <div>
                        <dt>Overwhelm</dt>
                        <dd>{checkIn.overwhelmLevel}/5</dd>
                      </div>
                      <div>
                        <dt>Connection</dt>
                        <dd>{checkIn.socialConnection}/5</dd>
                      </div>
                      <div>
                        <dt>Mood</dt>
                        <dd>{checkIn.overallMood}/5</dd>
                      </div>
                    </dl>
                  </article>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </article>
  );
}