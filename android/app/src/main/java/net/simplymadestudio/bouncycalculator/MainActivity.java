package net.simplymadestudio.bouncycalculator;

import android.annotation.SuppressLint;
import android.app.Activity;
import android.content.ActivityNotFoundException;
import android.content.ClipData;
import android.content.ClipboardManager;
import android.content.Intent;
import android.content.pm.ApplicationInfo;
import android.graphics.Color;
import android.graphics.Insets;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.view.HapticFeedbackConstants;
import android.view.View;
import android.view.ViewGroup;
import android.view.Window;
import android.view.WindowInsets;
import android.view.WindowInsetsController;
import android.webkit.JavascriptInterface;
import android.webkit.RenderProcessGoneDetail;
import android.webkit.WebResourceRequest;
import android.webkit.WebResourceResponse;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.FrameLayout;
import android.widget.Toast;
import android.window.OnBackInvokedCallback;
import android.window.OnBackInvokedDispatcher;

import androidx.webkit.WebViewAssetLoader;

import java.io.ByteArrayInputStream;
import java.util.regex.Pattern;

/**
 * Bouncy Calculator: the web app (assets/www) in a locked-down WebView.
 *
 * Security model:
 *  - Content is served from https://appassets.androidplatform.net via WebViewAssetLoader (no file:// access).
 *  - Only that origin may load inside the WebView; every other link opens outside the app.
 *  - The app has no INTERNET permission, so it cannot send anything anywhere.
 *  - The JS bridge exposes three small, validated methods: haptic, copy, setBars.
 */
public class MainActivity extends Activity {

    private static final String HOST = "appassets.androidplatform.net";
    private static final String START_URL = "https://" + HOST + "/assets/www/index.html";
    private static final Pattern HEX_COLOR = Pattern.compile("^#[0-9a-fA-F]{6}$");

    private FrameLayout root;
    private WebView web;
    private WebViewAssetLoader assetLoader;
    private OnBackInvokedCallback backCallback;
    private boolean darkBars = false;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setupEdgeToEdge();

        root = new FrameLayout(this);
        root.setBackgroundColor(Color.parseColor("#E9E4DC"));
        setContentView(root);
        applyInsets();

        assetLoader = new WebViewAssetLoader.Builder()
                .setDomain(HOST)
                .addPathHandler("/assets/", new WebViewAssetLoader.AssetsPathHandler(this))
                .build();

        createWebView();
        web.loadUrl(START_URL);
        registerBack();
    }

    /* ---------------------------------------------------------------- WebView */

    @SuppressLint("SetJavaScriptEnabled")
    private void createWebView() {
        boolean debuggable = (getApplicationInfo().flags & ApplicationInfo.FLAG_DEBUGGABLE) != 0;
        WebView.setWebContentsDebuggingEnabled(debuggable);

        web = new WebView(this);
        web.setBackgroundColor(Color.TRANSPARENT);
        web.setOverScrollMode(View.OVER_SCROLL_NEVER);
        web.setHapticFeedbackEnabled(true);

        WebSettings s = web.getSettings();
        s.setJavaScriptEnabled(true);
        s.setDomStorageEnabled(true);              // localStorage: history, themes, settings
        s.setAllowFileAccess(false);
        s.setAllowContentAccess(false);
        s.setMixedContentMode(WebSettings.MIXED_CONTENT_NEVER_ALLOW);
        s.setGeolocationEnabled(false);
        s.setSupportMultipleWindows(false);        // target=_blank goes through shouldOverrideUrlLoading
        s.setJavaScriptCanOpenWindowsAutomatically(false);
        s.setSupportZoom(false);
        s.setBuiltInZoomControls(false);
        s.setDisplayZoomControls(false);
        s.setTextZoom(100);                        // the layout is sized for the viewport; avoid double scaling
        s.setMediaPlaybackRequiresUserGesture(true);
        s.setCacheMode(WebSettings.LOAD_NO_CACHE); // everything is local already
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) s.setSafeBrowsingEnabled(true);

        web.setWebViewClient(new Client());
        web.addJavascriptInterface(new Bridge(), "BouncyNative");
        root.addView(web, new FrameLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.MATCH_PARENT));
    }

    private static boolean isAppOrigin(Uri uri) {
        return uri != null && "https".equals(uri.getScheme()) && HOST.equals(uri.getHost());
    }

    private class Client extends WebViewClient {
        @Override
        public WebResourceResponse shouldInterceptRequest(WebView view, WebResourceRequest request) {
            Uri uri = request.getUrl();
            if (isAppOrigin(uri)) return assetLoader.shouldInterceptRequest(uri);
            // Nothing outside the bundle may be fetched (the CSP already forbids it; this is belt and braces).
            return new WebResourceResponse("text/plain", "utf-8", 403, "Forbidden", null,
                    new ByteArrayInputStream(new byte[0]));
        }

        @Override
        public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
            Uri uri = request.getUrl();
            if (isAppOrigin(uri)) return false;   // stay in the app
            openExternally(uri);                  // privacy, terms, studio site, mailto:
            return true;
        }

        @Override
        public boolean onRenderProcessGone(WebView view, RenderProcessGoneDetail detail) {
            // The renderer crashed or was killed for memory: rebuild the WebView instead of crashing the app.
            root.removeView(web);
            web.destroy();
            createWebView();
            web.loadUrl(START_URL);
            return true;
        }
    }

    private void openExternally(Uri uri) {
        String scheme = uri.getScheme() == null ? "" : uri.getScheme().toLowerCase();
        Intent intent;
        switch (scheme) {
            case "https":
            case "http":
                intent = new Intent(Intent.ACTION_VIEW, uri).addCategory(Intent.CATEGORY_BROWSABLE);
                break;
            case "mailto":
                intent = new Intent(Intent.ACTION_SENDTO, uri);
                break;
            default:
                return; // intent:, file:, javascript: and anything else is ignored
        }
        try {
            startActivity(intent);
        } catch (ActivityNotFoundException e) {
            Toast.makeText(this, R.string.no_app, Toast.LENGTH_SHORT).show();
        }
    }

    /* ---------------------------------------------------------------- JS bridge */

    /** Called from the web app as window.BouncyNative.*  Runs on a binder thread, so UI work is posted. */
    final class Bridge {
        @JavascriptInterface
        public void haptic(String kind) {
            if (kind == null || kind.length() > 12) return;
            final int effect;
            switch (kind) {
                case "eq":
                case "win":
                    effect = Build.VERSION.SDK_INT >= 30 ? HapticFeedbackConstants.CONFIRM : HapticFeedbackConstants.VIRTUAL_KEY;
                    break;
                case "error":
                    effect = Build.VERSION.SDK_INT >= 30 ? HapticFeedbackConstants.REJECT : HapticFeedbackConstants.LONG_PRESS;
                    break;
                case "long":
                    effect = HapticFeedbackConstants.LONG_PRESS;
                    break;
                case "op":
                case "fn":
                case "ac":
                case "mem":
                    effect = HapticFeedbackConstants.VIRTUAL_KEY;
                    break;
                default:
                    effect = HapticFeedbackConstants.KEYBOARD_TAP;
            }
            runOnUiThread(() -> { if (web != null) web.performHapticFeedback(effect); });
        }

        @JavascriptInterface
        public void copy(String text) {
            if (text == null || text.isEmpty() || text.length() > 400) return;
            runOnUiThread(() -> {
                ClipboardManager cm = getSystemService(ClipboardManager.class);
                if (cm != null) cm.setPrimaryClip(ClipData.newPlainText("Bouncy Calculator", text));
            });
        }

        @JavascriptInterface
        public void setBars(String color, boolean dark) {
            if (color == null || !HEX_COLOR.matcher(color).matches()) return;
            final int c = Color.parseColor(color);
            runOnUiThread(() -> {
                root.setBackgroundColor(c);
                getWindow().setBackgroundDrawable(new android.graphics.drawable.ColorDrawable(c));
                darkBars = dark;
                applyBarIcons();
            });
        }
    }

    /* ---------------------------------------------------------------- edge-to-edge */

    @SuppressWarnings("deprecation")
    private void setupEdgeToEdge() {
        Window w = getWindow();
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
            w.setDecorFitsSystemWindows(false);
        } else {
            w.getDecorView().setSystemUiVisibility(View.SYSTEM_UI_FLAG_LAYOUT_STABLE
                    | View.SYSTEM_UI_FLAG_LAYOUT_FULLSCREEN | View.SYSTEM_UI_FLAG_LAYOUT_HIDE_NAVIGATION);
        }
        if (Build.VERSION.SDK_INT < 35) {
            w.setStatusBarColor(Color.TRANSPARENT);
            w.setNavigationBarColor(Color.TRANSPARENT);
        }
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
            w.setNavigationBarContrastEnforced(false);
            w.setStatusBarContrastEnforced(false);
        }
    }

    /** Pad the content by the system bars and display cutout, so nothing sits under them. */
    @SuppressWarnings("deprecation")
    private void applyInsets() {
        root.setOnApplyWindowInsetsListener((v, insets) -> {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
                Insets i = insets.getInsets(WindowInsets.Type.systemBars() | WindowInsets.Type.displayCutout());
                Insets ime = insets.getInsets(WindowInsets.Type.ime());
                v.setPadding(i.left, i.top, i.right, Math.max(i.bottom, ime.bottom));
                return WindowInsets.CONSUMED;
            }
            v.setPadding(insets.getSystemWindowInsetLeft(), insets.getSystemWindowInsetTop(),
                    insets.getSystemWindowInsetRight(), insets.getSystemWindowInsetBottom());
            return insets.consumeSystemWindowInsets();
        });
        root.requestApplyInsets();
    }

    @SuppressWarnings("deprecation")
    private void applyBarIcons() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
            WindowInsetsController c = getWindow().getInsetsController();
            if (c == null) return;
            int light = WindowInsetsController.APPEARANCE_LIGHT_STATUS_BARS | WindowInsetsController.APPEARANCE_LIGHT_NAVIGATION_BARS;
            c.setSystemBarsAppearance(darkBars ? 0 : light, light);
        } else if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            View d = getWindow().getDecorView();
            int flags = d.getSystemUiVisibility();
            int light = View.SYSTEM_UI_FLAG_LIGHT_STATUS_BAR
                    | (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O ? View.SYSTEM_UI_FLAG_LIGHT_NAVIGATION_BAR : 0);
            d.setSystemUiVisibility(darkBars ? (flags & ~light) : (flags | light));
        }
    }

    /* ---------------------------------------------------------------- back */

    private void registerBack() {
        if (Build.VERSION.SDK_INT >= 33) {
            backCallback = this::handleBack;
            getOnBackInvokedDispatcher().registerOnBackInvokedCallback(OnBackInvokedDispatcher.PRIORITY_DEFAULT, backCallback);
        }
    }

    @Override
    @SuppressWarnings("deprecation")
    public void onBackPressed() { // Android 12 and older
        handleBack();
    }

    /** Ask the web app to close its top layer (dialog, tape, game, tab). If nothing is open, leave the app. */
    private void handleBack() {
        if (web == null) { finish(); return; }
        web.evaluateJavascript("(window.bouncy && window.bouncy.back) ? window.bouncy.back() : false", value -> {
            if (!"true".equals(value)) {
                if (!moveTaskToBack(true)) finish();
            }
        });
    }

    /* ---------------------------------------------------------------- lifecycle */

    @Override
    protected void onResume() {
        super.onResume();
        if (web != null) web.onResume();
    }

    @Override
    protected void onPause() {
        if (web != null) web.onPause();
        super.onPause();
    }

    @Override
    protected void onDestroy() {
        if (Build.VERSION.SDK_INT >= 33 && backCallback != null) {
            getOnBackInvokedDispatcher().unregisterOnBackInvokedCallback(backCallback);
        }
        if (web != null) {
            root.removeView(web);
            web.destroy();
            web = null;
        }
        super.onDestroy();
    }
}
