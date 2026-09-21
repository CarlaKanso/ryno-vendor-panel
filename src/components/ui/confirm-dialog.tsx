"use client";

import { AlertTriangle } from "lucide-react";
import type { ReactNode } from "react";

import { Button } from "./button";
import { Modal } from "./modal";

/**
 * The confirmation step in front of every destructive action — cancel, refund,
 * archive, remove driver, delete a reply.
 */
export function ConfirmDialog({
  open,
  onClose,
  onConfirm,
  title,
  description,
  confirmLabel = "Confirm",
  tone = "danger",
  loading = false,
  children,
}: {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  description?: ReactNode;
  confirmLabel?: string;
  tone?: "danger" | "primary";
  loading?: boolean;
  children?: ReactNode;
}) {
  return (
    <Modal
      open={open}
      onClose={loading ? () => {} : onClose}
      title={title}
      size="sm"
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={loading}>
            Keep it
          </Button>
          <Button variant={tone} onClick={onConfirm} loading={loading}>
            {confirmLabel}
          </Button>
        </>
      }
    >
      <div className="flex gap-3">
        <span
          className="grid size-9 shrink-0 place-items-center rounded-full bg-red-50 text-red-600"
          aria-hidden
        >
          <AlertTriangle className="size-4" />
        </span>
        <div className="min-w-0 text-sm text-ink-600">
          {description}
          {children}
        </div>
      </div>
    </Modal>
  );
}
