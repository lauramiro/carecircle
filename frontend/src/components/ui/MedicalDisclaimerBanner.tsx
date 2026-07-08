interface MedicalDisclaimerBannerProps {
  compact?: boolean;
}

export function MedicalDisclaimerBanner({
  compact = false,
}: MedicalDisclaimerBannerProps) {
  return (
    <p
      className="text-xs"
      style={{ color: 'var(--color-text-hint)' }}
      role="note"
    >
      {compact
        ? 'AI output is for coordination only — not medical advice.'
        : 'CareCircle is a coordination tool, not a medical device. Always consult a qualified healthcare provider.'}
    </p>
  );
}
