import React from 'react';
import { TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSavedServicesStore, toSavedServiceItem } from '../../store/saved-services-store';
import type { PublicServiceItem } from '../../lib/api';

interface SaveServiceStarProps {
  service: PublicServiceItem | {
    _id: string;
    title: string;
    serviceImage: string | null;
    categoryName: string;
    clinicId: string;
    clinicDisplayName: string;
    price: { amount?: number; minAmount?: number; maxAmount?: number; currency: string };
  };
  size?: number;
  onSave?: () => void;
  onUnsave?: () => void;
}

export default function SaveServiceStar({ service, size = 22, onSave, onUnsave }: SaveServiceStarProps) {
  const isSaved = useSavedServicesStore((s) => s.isSaved(service._id));
  const addService = useSavedServicesStore((s) => s.addService);
  const removeService = useSavedServicesStore((s) => s.removeService);

  const handlePress = () => {
    if (isSaved) {
      removeService(service._id);
      onUnsave?.();
    } else {
      addService(toSavedServiceItem(service));
      onSave?.();
    }
  };

  return (
    <TouchableOpacity hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }} onPress={handlePress} style={{ padding: 4 }}>
      <Ionicons
        name={isSaved ? 'star' : 'star-outline'}
        size={size}
        color={isSaved ? '#facc15' : '#fff'}
      />
    </TouchableOpacity>
  );
}
