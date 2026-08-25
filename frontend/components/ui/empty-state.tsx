"use client";

import React from "react";
import { LucideIcon } from "lucide-react";

export interface EmptyStateProps {

  icon?: LucideIcon;


  title: string;


  description?: string;


  actionLabel?: string;


  onAction?: () => void;


  className?: string;
}


export function EmptyState({ icon: Icon, title, description, actionLabel, onAction, className = "" }: EmptyStateProps) {
  return (
    <div className={`flex flex-col items-center justify-center py-12 px-4 text-center ${className}`}>
      {Icon && (
        <div className="mb-4">
          <Icon size={48} className="text-gray-400 mx-auto" strokeWidth={1.5} />
        </div>
      )}

      <h3 className="text-lg font-semibold text-gray-900 mb-2">{title}</h3>

      {description && <p className="text-sm text-gray-500 mb-6 max-w-sm">{description}</p>}

      {actionLabel && onAction && (
        <button
          onClick={onAction}
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors text-sm font-medium"
        >
          {actionLabel}
        </button>
      )}
    </div>
  );
}

/**
 * Minimal empty state - just title and description
 * Useful for inline empty states
 */
export function EmptyStateMinimal({ title, description }: { title: string; description?: string }) {
  return (
    <div className="py-6 px-4 text-center">
      <p className="text-sm font-medium text-gray-600">{title}</p>
      {description && <p className="text-xs text-gray-500 mt-1">{description}</p>}
    </div>
  );
}

/**
 * Empty state for search results
 */
export function EmptyStateSearch({ query, onReset }: { query: string; onReset?: () => void }) {
  return (
    <EmptyState
      title={`No results for "${query}"`}
      description="Try adjusting your search terms"
      actionLabel={onReset ? "Clear search" : undefined}
      onAction={onReset}
    />
  );
}

/**
 * Empty state for errors
 */
export function EmptyStateError({
  title = "Something went wrong",
  description,
  onRetry,
}: {
  title?: string;
  description?: string;
  onRetry?: () => void;
}) {
  return (
    <EmptyState
      title={title}
      description={description || "Please try again"}
      actionLabel={onRetry ? "Retry" : undefined}
      onAction={onRetry}
    />
  );
}
