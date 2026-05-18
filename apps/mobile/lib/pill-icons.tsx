import React from 'react';
import { MaterialCommunityIcons } from '@expo/vector-icons';

export type PillIconId =
  | 'pill'
  | 'capsule'
  | 'tablet'
  | 'injection'
  | 'liquid'
  | 'drops'
  | 'inhaler'
  | 'bottle';

type MciName = React.ComponentProps<typeof MaterialCommunityIcons>['name'];

export type PillIconOption = {
  id: PillIconId;
  icon: MciName;
  labelUz: string;
  labelRu: string;
};

/** Default when id is missing or unknown (always valid in MCI glyphmap). */
const FALLBACK_ICON: MciName = 'medication-outline';

/** Real medication-style icons (Material Community Icons — bundled with Expo). */
export const PILL_ICON_OPTIONS: PillIconOption[] = [
  { id: 'pill', icon: 'pill', labelUz: 'Tabletka', labelRu: 'Таблетка' },
  { id: 'capsule', icon: 'pill-multiple', labelUz: 'Kapsula', labelRu: 'Капсула' },
  { id: 'tablet', icon: 'tablet', labelUz: 'Parcha dori', labelRu: 'Таблетка' },
  { id: 'injection', icon: 'needle', labelUz: 'Inyeksiya', labelRu: 'Инъекция' },
  { id: 'liquid', icon: 'cup-water', labelUz: 'Suyuqlik', labelRu: 'Жидкость' },
  { id: 'drops', icon: 'eyedropper', labelUz: 'Tomchi', labelRu: 'Капли' },
  { id: 'inhaler', icon: 'lungs', labelUz: 'Ingalyator', labelRu: 'Ингалятор' },
  { id: 'bottle', icon: 'bottle-tonic', labelUz: 'Shisha', labelRu: 'Флакон' },
];

const ICON_BY_ID: Record<string, MciName> = Object.fromEntries(
  PILL_ICON_OPTIONS.map((o) => [o.id, o.icon]),
) as Record<string, MciName>;

/** Old icon names that were invalid in MCI — map saved metadata to valid glyphs. */
const LEGACY_ICON_ALIASES: Record<string, MciName> = {
  capsule: 'pill-multiple',
  asthma: 'lungs',
  round: 'pill',
  oval: 'pill',
  drop: 'eyedropper',
};

export function resolvePillIconName(shapeOrIconId: string | undefined): MciName {
  if (!shapeOrIconId) return FALLBACK_ICON;
  if (shapeOrIconId in ICON_BY_ID) return ICON_BY_ID[shapeOrIconId];
  if (shapeOrIconId in LEGACY_ICON_ALIASES) return LEGACY_ICON_ALIASES[shapeOrIconId];
  return FALLBACK_ICON;
}

export function pillIconLabel(id: PillIconId, language: string): string {
  const opt = PILL_ICON_OPTIONS.find((o) => o.id === id);
  if (!opt) return id;
  return language === 'ru' ? opt.labelRu : opt.labelUz;
}

type PillIconProps = {
  iconId?: string;
  size?: number;
  color?: string;
};

export function PillIcon({ iconId, size = 28, color = '#fff' }: PillIconProps) {
  return <MaterialCommunityIcons name={resolvePillIconName(iconId)} size={size} color={color} />;
}
