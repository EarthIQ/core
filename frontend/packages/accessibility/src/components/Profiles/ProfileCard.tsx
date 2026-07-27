import React from 'react';
import { Icons } from '../Icons';
import type { Profile, TranslationKey } from '../../types';

interface ProfileCardProps {
  profile: Profile;
  isActive: boolean;
  onClick: () => void;
  t: (key: TranslationKey) => string;
}

/**
 * Card component for selecting an accessibility profile
 */
export const ProfileCard: React.FC<ProfileCardProps> = ({
  profile,
  isActive,
  onClick,
  t,
}) => {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`
        group relative flex flex-col items-center
        rounded-2xl p-4 text-center
        transition-all duration-200
        ${isActive
          ? `bg-gradient-to-br ${profile.color} text-white shadow-lg`
          : 'border border-[var(--border-primary)] bg-[var(--surface)] text-[var(--text-primary)] hover:bg-[var(--surface-hover)]'
        }
      `}
      aria-pressed={isActive}
      aria-label={`${t(profile.nameKey)} profile: ${isActive ? 'Active' : 'Inactive'}`}
    >
      <span className="mb-2 text-3xl">{profile.icon}</span>
      <div className="text-sm font-semibold">{t(profile.nameKey)}</div>
      <div
        className={`
          mt-1 line-clamp-2 text-xs
          ${isActive ? 'text-white/80' : 'text-[var(--text-tertiary)]'}
        `}
      >
        {t(profile.descKey)}
      </div>
      {isActive && (
        <div className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-white shadow-md">
          <span className="text-green-500">{<Icons.check />}</span>
        </div>
      )}
    </button>
  );
};