/**
 * useSubscriptionStatus
 *
 * - Syncs subscription/boost status from the backend whenever the app comes
 *   to the foreground (and once on mount). The backend lazily expires this
 *   user's own status as part of that same GET /payment/status call.
 * - Returns live-computed flags derived from the auth store (no extra state).
 *
 * The global "notify users expiring within 3 days" sweep across ALL users is
 * a separate admin/cron job (see runExpiryCheck in server.js, runs every 6h)
 * — it is intentionally NOT triggered from the client anymore.
 */

import { useEffect, useCallback } from 'react';
import { AppState } from 'react-native';
import { PaymentAPI } from 'services/ApiServices';
import { useAuth } from 'src/store/authStore';

const stillActive = (expiry) => expiry && new Date(expiry) > new Date();

const daysUntil = (expiry) => {
  if (!expiry) return null;
  const diff = new Date(expiry) - new Date();
  return diff > 0 ? Math.ceil(diff / (1000 * 60 * 60 * 24)) : 0;
};

export function useSubscriptionStatus() {
  const { user, updateUser } = useAuth();

  // ── Pull fresh status from backend ────────────────────────────────────────
  const syncStatus = useCallback(async () => {
    if (!user?._id) return;
    try {
      const data = await PaymentAPI.getStatus();
      // GET /payment/status already lazily expires *this* user's own
      // subscription/boost server-side (see expireIfNeeded on the backend) —
      // mirror that result locally. The global expiry sweep across ALL users
      // is a separate admin/cron job (runs every 6h in server.js) and must
      // NOT be triggered from here — it used to fire on every app foreground
      // for every user, hammering the DB and re-sending "expiring soon" push
      // notifications with no de-dupe every time anyone opened the app.
      await updateUser({
        isSubscribed:       data.isSubscribed,
        subscriptionExpiry: data.subscriptionExpiry,
        subscriptionPlan:   data.subscriptionPlan,
        isBoosted:          data.isBoosted,
        boostExpiry:        data.boostExpiry,
      });
    } catch {
      // Non-fatal — UI will fall back to local state
    }
  }, [user?._id]);

  // ── Sync on mount and on every foreground event ───────────────────────────
  useEffect(() => {
    syncStatus();

    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') syncStatus();
    });

    return () => sub.remove();
  }, [syncStatus]);

  // ── Computed flags (read from local auth store, always up-to-date) ────────
  const isSubscribed      = !!(user?.isSubscribed  && stillActive(user?.subscriptionExpiry));
  const isBoosted         = !!(user?.isBoosted     && stillActive(user?.boostExpiry));
  const subDaysLeft       = daysUntil(user?.subscriptionExpiry);
  const boostDaysLeft     = daysUntil(user?.boostExpiry);
  const subscriptionPlan  = user?.subscriptionPlan || null;

  // ── Banner flags — show warning when <= 3 days left ───────────────────────
  const showSubExpiryWarning   = isSubscribed  && subDaysLeft   !== null && subDaysLeft   <= 3;
  const showBoostExpiryWarning = isBoosted     && boostDaysLeft !== null && boostDaysLeft <= 1;

  return {
    isSubscribed,
    isBoosted,
    subscriptionPlan,
    subDaysLeft,
    boostDaysLeft,
    showSubExpiryWarning,
    showBoostExpiryWarning,
    syncStatus,
  };
}
