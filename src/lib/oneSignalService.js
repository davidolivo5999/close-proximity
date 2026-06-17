import OneSignal from 'react-onesignal';

const ONESIGNAL_APP_ID = '48bbfe1d-f3b8-457a-9297-fff4c084b8ec';

let initialized = false;

export const oneSignalService = {
  async init() {
    if (initialized) return;
    initialized = true;

    await OneSignal.init({
      appId: ONESIGNAL_APP_ID,
      allowLocalhostAsSecureOrigin: true,
    });
  },

  async login(userId) {
    await OneSignal.login(userId);
  },

  async logout() {
    await OneSignal.logout();
  },

  async setEmail(email) {
    await OneSignal.User.addEmail(email);
  },

  async requestPermission() {
    await OneSignal.Notifications.requestPermission();
  },

  getSubscriptionId() {
    return OneSignal.User.PushSubscription.id;
  },

  isPushEnabled() {
    return OneSignal.User.PushSubscription.optedIn;
  },

  addSubscriptionChangeListener(callback) {
    OneSignal.User.PushSubscription.addEventListener('change', callback);
    return () => OneSignal.User.PushSubscription.removeEventListener('change', callback);
  },
};