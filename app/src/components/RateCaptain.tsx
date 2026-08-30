import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Button, StarInput } from "./ui";
import { api, getApiErrorMessage, ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth";

/** Shared by the trip page and the unrated rows in the trip list. */
export default function RateCaptain({
  driverId, tripId, onDone,
}: { driverId: string; tripId?: string; onDone?: () => void }) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [rating, setRating] = useState(0);
  const [body, setBody] = useState("");
  const [editing, setEditing] = useState(false);

  const submit = useMutation({
    mutationFn: () =>
      editing
        ? api.updateReview(driverId, { rating, body })
        : api.createReview(driverId, { rating, body, tripId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["driver", driverId] });
      queryClient.invalidateQueries({ queryKey: ["driver-reviews", driverId] });
      queryClient.invalidateQueries({ queryKey: ["fleet"] });
      queryClient.invalidateQueries({ queryKey: ["trips"] });
      onDone?.();
    },
    onError: (err) => {
      // Already reviewed: switch this form into an edit of the existing one.
      if (err instanceof ApiError && err.code === "ALREADY_REVIEWED") setEditing(true);
    },
  });

  // Once a rating is in, the form is replaced by a confirmation rather than
  // vanishing -- submitting and seeing nothing happen reads as a failure.
  if (submit.isSuccess) {
    return (
      <p className="mt-3 text-sm text-emerald-700">
        Thanks — your rating is saved.
      </p>
    );
  }

  if (!user) {
    return (
      <p className="mt-3 text-sm text-muted-foreground">
        <a href="/sign-in" className="font-medium text-primary underline">Sign in</a> to leave a review.
      </p>
    );
  }

  return (
    <div className="mt-4 space-y-3">
      <StarInput value={rating} onChange={setRating} name={`rate-${driverId}-${tripId ?? "x"}`} />
      <label className="block">
        <span className="mb-1.5 block text-sm font-medium">Review (optional)</span>
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value.slice(0, 500))}
          rows={3}
          className="w-full rounded-lg border border-border bg-card px-3 py-2 text-sm"
          placeholder="How was the trip?"
        />
        <span className="mt-1 block text-sm text-muted-foreground">{body.length}/500</span>
      </label>

      {submit.isError && (
        <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
          {getApiErrorMessage(submit.error)}
          {editing && " Update your rating and submit again."}
        </p>
      )}

      <Button disabled={rating === 0 || submit.isPending} onClick={() => submit.mutate()}>
        {submit.isPending ? "Saving…" : editing ? "Update review" : "Submit review"}
      </Button>
    </div>
  );
}
