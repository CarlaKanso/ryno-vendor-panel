"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { TextareaInput } from "@/components/ui/field";
import { cn } from "@/lib/cn";

const OTHER = "__other__";

/**
 * Cancel and refund both require a reason, so this dialog offers the common
 * ones as one-click choices and keeps a free-text "Other" for the rest.
 * Confirm stays disabled until there is something to send, which is cheaper
 * than a round trip to find out the API agrees.
 */
export function ReasonDialog({
  open,
  onClose,
  onConfirm,
  title,
  description,
  reasons,
  confirmLabel,
  loading = false,
}: {
  open: boolean;
  onClose: () => void;
  onConfirm: (reason: string) => void;
  title: string;
  description: string;
  reasons: readonly string[];
  confirmLabel: string;
  loading?: boolean;
}) {
  const [selected, setSelected] = useState<string>(reasons[0] ?? OTHER);
  const [other, setOther] = useState("");

  // Reset each time the dialog opens, so a previous draft doesn't reappear.
  // Derived during render rather than in an effect: the dialog stays mounted
  // while closed, so there is no unmount to clear it for us.
  const [wasOpen, setWasOpen] = useState(open);
  if (wasOpen !== open) {
    setWasOpen(open);
    if (open) {
      setSelected(reasons[0] ?? OTHER);
      setOther("");
    }
  }

  const reason = selected === OTHER ? other.trim() : selected;

  return (
    <Modal
      open={open}
      onClose={loading ? () => {} : onClose}
      title={title}
      description={description}
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={loading}>
            Go back
          </Button>
          <Button
            variant="danger"
            onClick={() => onConfirm(reason)}
            loading={loading}
            disabled={reason.length === 0}
          >
            {confirmLabel}
          </Button>
        </>
      }
    >
      <fieldset>
        <legend className="mb-2 text-xs font-medium text-ink-600">Reason</legend>
        <div className="space-y-2">
          {[...reasons, OTHER].map((value) => {
            const isOther = value === OTHER;
            const checked = selected === value;
            return (
              <label
                key={value}
                className={cn(
                  "flex cursor-pointer items-center gap-3 rounded-lg border px-3 py-2.5 text-sm transition-colors",
                  checked
                    ? "border-ryno-600 bg-ryno-50 text-ink-900"
                    : "border-ink-200 text-ink-600 hover:border-ink-300 hover:bg-ink-50",
                )}
              >
                <input
                  type="radio"
                  name="reason"
                  className="size-4 border-ink-300 text-ryno-600 focus:ring-ryno-600/30"
                  value={value}
                  checked={checked}
                  onChange={() => setSelected(value)}
                />
                {isOther ? "Other" : value}
              </label>
            );
          })}
        </div>
      </fieldset>

      {selected === OTHER ? (
        <div className="mt-3">
          <label
            htmlFor="reason-other"
            className="mb-1.5 block text-xs font-medium text-ink-600"
          >
            Tell us what happened
          </label>
          <TextareaInput
            id="reason-other"
            value={other}
            maxLength={500}
            placeholder="This reason is stored on the order and shown in its activity log."
            onChange={(event) => setOther(event.target.value)}
          />
        </div>
      ) : null}
    </Modal>
  );
}
