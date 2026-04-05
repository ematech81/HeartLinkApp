/**
 * useSubscriptionStatus
 *
 * - Syncs subscription/boost status from the backend whenever the app comes
 *   to the foreground (and once on mount).
 * - Triggers the backend expiry check so notifications go out to users whose
 *   subscriptions are expiring within 3 days.
 * - Returns live-computed flags derived from the auth store (no extra state).
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
      // Backend already ran expiry cleanup — mirror the result locally
      await updateUser({
        isSubscribed:       data.isSubscribed,
        subscriptionExpiry: data.subscriptionExpiry,
        subscriptionPlan:   data.subscriptionPlan,
        isBoosted:          data.isBoosted,
        boostExpiry:        data.boostExpiry,
      });

      // Also trigger the backend expiry + notification batch
      // (no-op if already run recently — backend is idempotent)
      PaymentAPI.runExpiryCheck().catch(() => {});
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
