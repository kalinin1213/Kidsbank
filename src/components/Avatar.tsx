'use client';

type AvatarProps = {
  name: string;
  avatarUrl?: string;
  emoji?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  colorClass?: string;
};

const SIZE_CLASSES: Record<string, { container: string; text: string }> = {
  sm: { container: 'w-10 h-10', text: 'text-sm' },
  md: { container: 'w-12 h-12', text: 'text-xl' },
  lg: { container: 'w-16 h-16', text: 'text-2xl' },
  xl: { container: 'w-24 h-24', text: 'text-5xl' },
};

export default function Avatar({ name, avatarUrl, emoji, size = 'md', colorClass = 'bg-gray-400' }: AvatarProps) {
  const s = SIZE_CLASSES[size];

  if (avatarUrl) {
    return (
      <img
        src={avatarUrl}
        alt={name}
        className={`${s.container} rounded-full object-cover flex-shrink-0`}
      />
    );
  }

  if (emoji) {
    return (
      <div className={`${s.container} rounded-full flex items-center justify-center flex-shrink-0`}>
        <span className={s.text}>{emoji}</span>
      </div>
    );
  }

  return (
    <div className={`${s.container} ${colorClass} rounded-full flex items-center justify-center text-white font-bold flex-shrink-0 ${s.text}`}>
      {name[0]}
    </div>
  );
}
