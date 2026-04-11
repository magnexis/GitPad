import { ButtonHTMLAttributes, ReactNode } from 'react';
import clsx from 'clsx';

export function Button({ className, title, ...props }: ButtonHTMLAttributes<HTMLButtonElement>) {
  const label = resolveTooltipLabel(title, props.children);
  return (
    <button
      {...props}
      type={props.type ?? 'button'}
      title={label}
      data-tooltip={label}
      className={clsx(
        'rounded-md border border-[#30363d] bg-[#21262d] px-3 py-2 text-sm font-medium text-[#c9d1d9] transition hover:bg-[#30363d] disabled:cursor-not-allowed disabled:opacity-50',
        className
      )}
    />
  );
}

function resolveTooltipLabel(title: string | undefined, children: ReactNode) {
  if (title?.trim()) return title;
  if (typeof children === 'string') return children;
  if (Array.isArray(children)) {
    const joined = children
      .map((item) => (typeof item === 'string' ? item.trim() : ''))
      .filter(Boolean)
      .join(' ')
      .trim();
    return joined || undefined;
  }
  return undefined;
}
