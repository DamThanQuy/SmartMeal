import type { AuthUser } from '../types/auth.types';
import type { UserDto } from '../types/auth.api.types';

// Hàm thuần quy đổi DTO backend → type FE cho auth (docs/fetch-api/part1 §4.8).
export function fromUserDto(dto: UserDto): AuthUser {
  return {
    id: dto.id,
    fullName: dto.fullName,
    email: dto.email,
    avatarUrl: dto.avatarUrl ?? null,
    isPro: dto.isPro,
    role: dto.role,
    hasCompletedSurvey: dto.hasCompletedSurvey,
  };
}
