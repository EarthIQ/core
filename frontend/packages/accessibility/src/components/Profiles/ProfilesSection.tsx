import React from 'react';
import { ProfileCard } from './ProfileCard';
import { profiles } from '../../constants/profiles';
import type { TranslationKey } from '../../types';

interface ProfilesSectionProps {
  activeProfile: string | null;
  onSelectProfile: (profileId: string) => void;
  t: (key: TranslationKey) => string;
}

/**
 * Section displaying all available accessibility profiles
 */
export const ProfilesSection: React.FC<ProfilesSectionProps> = ({
  activeProfile,
  onSelectProfile,
  t,
}) => {
  return (
    <div className="grid grid-cols-2 gap-3">
      {profiles.map(profile => (
        <ProfileCard
          key={profile.id}
          profile={profile}
          isActive={activeProfile === profile.id}
          onClick={() => onSelectProfile(profile.id)}
          t={t}
        />
      ))}
    </div>
  );
};