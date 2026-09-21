/**
 * Review constants shared by the Server Action and the dialog that calls it.
 *
 * It lives here rather than in `actions/reviews.ts` because a `"use server"`
 * module may only export async functions — exporting a plain constant from one
 * silently breaks every import of that module.
 */
export const REPLY_MAX_LENGTH = 1000;
