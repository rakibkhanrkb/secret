
importScripts('https://www.gstatic.com/firebasejs/11.1.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/11.1.0/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey: "AIzaSyAT5Ts59hVLT5SFUfxTBpp4Elcp5tYDAKg",
  authDomain: "secretmessage-dc606.firebaseapp.com",
  projectId: "secretmessage-dc606",
  storageBucket: "secretmessage-dc606.appspot.com",
  messagingSenderId: "620607164946",
  appId: "1:620607164946:web:56c0ec48b4347ceb063ecb"
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  console.log('[firebase-messaging-sw.js] Received background message ', payload);
  const notificationTitle = payload.notification.title;
  const notificationOptions = {
    body: payload.notification.body,
    icon: '/logo.png' // Adjust if you have a logo
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});
