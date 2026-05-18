export default function RequiredMark() {
  return (
    <span style={{ color: 'var(--color-status-critical)' }} aria-hidden="true">
      {' '}
      *
    </span>
  );
}
