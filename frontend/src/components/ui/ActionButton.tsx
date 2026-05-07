import type { ComponentPropsWithoutRef } from 'react';

export type ActionButtonProps = ComponentPropsWithoutRef<'button'> & {
  variant?: 'primary' | 'secondary';
};

export default function ActionButton({
  children,
  variant = 'primary',
  type = 'button',
  disabled,
  className,
  style,
  ...rest
}: ActionButtonProps) {
  return (
    <button
      type={type}
      disabled={disabled}
      className={className}
      style={{
        width: '100%',
        height: '44px',
        backgroundColor:
          variant === 'primary' ? 'var(--color-primary)' : 'var(--color-primary-light)',
        color: variant === 'primary' ? '#ffffff' : 'var(--color-primary-dark)',
        border: 'none',
        borderRadius: '8px',
        fontSize: '13px',
        fontWeight: 500,
        fontFamily: 'Plus Jakarta Sans, sans-serif',
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.7 : 1,
        ...style,
      }}
      {...rest}
    >
      {children}
    </button>
  );
}
