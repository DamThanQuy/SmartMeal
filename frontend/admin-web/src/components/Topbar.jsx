import React from 'react';
import { RefreshCw, PlusCircle, CheckCircle2 } from 'lucide-react';

export default function Topbar({ title, onRefresh, isRefreshing, onOpenAddRecipe }) {
  return (
    <header className="topbar">
      <h2 className="page-title">{title}</h2>

      <div className="topbar-actions">
        <div className="badge-environment" title="Kết nối tới Backend ASP.NET Core API qua /api">
          <span>Hệ thống trực tuyến</span>
        </div>

        <button
          className="btn btn-secondary btn-sm"
          onClick={onRefresh}
          disabled={isRefreshing}
          title="Làm mới dữ liệu"
        >
          <RefreshCw size={15} className={isRefreshing ? 'animate-spin' : ''} />
          <span>Làm mới</span>
        </button>

        {onOpenAddRecipe && (
          <button className="btn btn-primary btn-sm" onClick={onOpenAddRecipe}>
            <PlusCircle size={16} />
            <span>Thêm Món Ăn</span>
          </button>
        )}
      </div>
    </header>
  );
}
