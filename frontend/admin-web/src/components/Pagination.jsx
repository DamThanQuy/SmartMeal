import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

/**
 * Thanh phân trang dùng chung cho các bảng danh sách. `total` là tổng số bản ghi backend trả ở header X-Total-Count.
 * Ẩn khi mọi bản ghi nằm gọn trong trang đầu.
 */
export default function Pagination({ page, pageSize, total, onPageChange, itemLabel = 'kết quả' }) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  if (totalPages <= 1 && page <= 1) {
    return null;
  }

  const from = total === 0 ? 0 : Math.min((page - 1) * pageSize + 1, total);
  const to = Math.min(page * pageSize, total);

  return (
    <nav className="pagination" aria-label="Phân trang">
      <span className="pagination-summary">
        Hiển thị {from}–{to} / {total} {itemLabel}
      </span>
      <div className="pagination-controls">
        <button
          type="button"
          className="btn btn-secondary btn-sm"
          onClick={() => onPageChange(page - 1)}
          disabled={page <= 1}
          aria-label="Trang trước"
        >
          <ChevronLeft size={15} />
        </button>
        <span className="pagination-page">
          Trang {page} / {totalPages}
        </span>
        <button
          type="button"
          className="btn btn-secondary btn-sm"
          onClick={() => onPageChange(page + 1)}
          disabled={page >= totalPages}
          aria-label="Trang sau"
        >
          <ChevronRight size={15} />
        </button>
      </div>
    </nav>
  );
}
