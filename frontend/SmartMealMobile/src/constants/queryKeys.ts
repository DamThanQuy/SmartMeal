// Query key TanStack Query dùng chung giữa các feature (khi feature này phải làm mới dữ liệu của
// feature khác mà không import ruột của nhau — .claude/rules/architecture.md "Feature boundary").

/** Hạn mức AI trong ngày — phụ thuộc gói thành viên (Pro không giới hạn, BR-233). */
export const AI_QUOTA_QUERY_KEY = ['ai-quota'] as const;
