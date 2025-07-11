# Android WebView App

This is a minimal Android Studio project that wraps your web app in a WebView for easy Play Store publishing.

## How to Use

1. Open this folder (`android-webview-app/`) in Android Studio.
2. In `app/src/main/java/com/example/webviewapp/MainActivity.java`, replace `https://YOUR_WEB_APP_URL` with your deployed web app's URL.
3. Connect your Android device or use an emulator.
4. Click **Run** in Android Studio.
5. To publish, build a signed APK or AAB from the **Build** menu.

## Requirements
- Your web app must be accessible via HTTPS for Play Store compliance.

## Customization
- To change the app name, edit `app/src/main/res/values/strings.xml`.
- To change the app icon, replace the files in `app/src/main/res/mipmap-*/`. 