import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { challengeService } from '../services/challengeService';

const challengesQueryKey = ['challenges'] as const;

export function useChallenges() {
  return useQuery({
    queryKey: challengesQueryKey,
    queryFn: () => challengeService.getChallenges(),
  });
}

export function useChallengeDetail(challengeId: string) {
  return useQuery({
    queryKey: ['challenges', challengeId],
    queryFn: () => challengeService.getChallengeById(challengeId),
  });
}

function useInvalidateChallenges() {
  const queryClient = useQueryClient();
  return () => {
    void queryClient.invalidateQueries({ queryKey: challengesQueryKey });
    // Badges đọc getCompletedChallengeIds() + Pet đọc streak/XP từ cùng sổ XP.
    void queryClient.invalidateQueries({ queryKey: ['badges'] });
    void queryClient.invalidateQueries({ queryKey: ['pet'] });
  };
}

export function useJoinChallenge() {
  const invalidate = useInvalidateChallenges();
  return useMutation({
    mutationFn: (challengeId: string) => challengeService.joinChallenge(challengeId),
    onSuccess: invalidate,
  });
}

export function useCompleteChallenge() {
  const invalidate = useInvalidateChallenges();
  return useMutation({
    mutationFn: (challengeId: string) => challengeService.completeChallenge(challengeId),
    onSuccess: invalidate,
  });
}
