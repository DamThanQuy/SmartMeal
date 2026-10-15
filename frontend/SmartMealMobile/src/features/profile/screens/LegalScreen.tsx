import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import React from 'react';
import { View } from 'react-native';
import { ScreenContainer, ScreenHeader } from '@/components/common';
import { AppCard, AppText } from '@/components/ui';
import type { MainStackParamList } from '@/navigation/types';
import { LEGAL_DOCUMENTS } from '../content/legalDocuments';

type Props = NativeStackScreenProps<MainStackParamList, 'Legal'>;

// Settings → "Điều khoản sử dụng" / "Chính sách quyền riêng tư" (BR-112, BR-270/271). Văn bản tĩnh
// trong content/legalDocuments.ts, không cần API.
export function LegalScreen({ navigation, route }: Props) {
  const document = LEGAL_DOCUMENTS[route.params.document];

  return (
    <ScreenContainer scroll>
      <ScreenHeader title={document.title} onBack={() => navigation.goBack()} />
      <View className="gap-md py-sm">
        <AppText variant="caption" color="secondary">
          {document.updatedLabel}
        </AppText>
        {document.sections.map(section => (
          <AppCard key={section.heading} className="gap-xs">
            <AppText variant="h3">{section.heading}</AppText>
            {section.paragraphs.map(paragraph => (
              <AppText key={paragraph} variant="body" color="secondary">
                {paragraph}
              </AppText>
            ))}
          </AppCard>
        ))}
      </View>
    </ScreenContainer>
  );
}
