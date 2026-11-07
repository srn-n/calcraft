package net.simplymadestudio.bouncycalculator;

import android.annotation.SuppressLint;
import android.app.Activity;
import android.content.ActivityNotFoundException;
import android.content.ClipData;
import android.content.ClipboardManager;
import android.content.Intent;
import android.content.SharedPreferences;
import android.content.pm.ApplicationInfo;
import android.graphics.Color;
import android.graphics.Insets;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.view.HapticFeedbackConstants;
import android.view.View;
import android.view.ViewGroup;
import android.view.ViewTreeObserver;
import android.view.animation.PathInterpolator;
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
 *  - The JS bridge exposes small, validated methods: haptic, copy, setBars, setCanGoBack, ready.
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
    private boolean backRegistered = false;
    private volatile boolean canGoBack = false;   // set by the web app: is there a layer for Back to close?
    private boolean pageReady = false;
    private boolean leaving = false;     // the exit animation is playing
    private boolean outroShown = false;  // the page is faded out (left with Back); fade it back in on return
    private SharedPreferences prefs;

    private static final String PREFS = "ui";
    private static final String PREF_BAR = "barColor";
    private static final String PREF_DARK = "barDark";
    private static final long SPLASH_MAX_MS = 1500;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setupEdgeToEdge();

        // Start in the last theme's colours, so a dark theme doesn't flash the light background.
        prefs = getSharedPreferences(PREFS, MODE_PRIVATE);
        int bg = prefs.getInt(PREF_BAR, Color.parseColor("#E9E4DC"));
        darkBars = prefs.getBoolean(PREF_DARK, false);
        getWindow().setBackgroundDrawable(new android.graphics.drawable.ColorDrawable(bg));

        root = new FrameLayout(this);
        root.setBackgroundColor(bg);
        setContentView(root);
        applyInsets();
        applyBarIcons();
        holdSplashUntilReady();

        assetLoader = new WebViewAssetLoader.Builder()
                .setDomain(HOST)
                .addPathHandler("/assets/", new WebViewAssetLoader.AssetsPathHandler(this))
                .build();

        createWebView();
        web.loadUrl(START_URL);
        setCanGoBack(false); // Android 13–14: take Back at the home screen too, for the exit animation
    }

    /** Android 12+: keep the system splash on screen until the page has painted (max 1.5 s), so there's no blank frame. */
    private void holdSplashUntilReady() {
        if (Build.VERSION.SDK_INT < 31) return;
        // Crossfade the system splash into the app: the icon eases up and away while the backdrop
        // dissolves on a standard ease-in-out curve (no hard cut, no front-loaded "pop").
        getSplashScreen().setOnExitAnimationListener(view -> {
            PathInterpolator ease = new PathInterpolator(0.4f, 0f, 0.2f, 1f);
            View icon = view.getIconView();
            if (icon != null) {
                icon.animate().scaleX(1.12f).scaleY(1.12f).alpha(0f).setDuration(360).setInterpolator(ease).start();
            }
            view.animate().alpha(0f).setStartDelay(60).setDuration(420).setInterpolator(ease)
                    .withEndAction(view::remove).start();
        });
        // Next launch, show a dark splash if the current theme is dark (no light flash before a dark theme).
        if (Build.VERSION.SDK_INT >= 33) {
            getSplashScreen().setSplashScreenTheme(darkBars ? R.style.Theme_Bouncy_Night : R.style.Theme_Bouncy);
        }
        root.getViewTreeObserver().addOnPreDrawListener(new ViewTreeObserver.OnPreDrawListener() {
            @Override
            public boolean onPreDraw() {
                if (!pageReady) return false;
                root.getViewTreeObserver().removeOnPreDrawListener(this);
                return true;
            }
        });
        root.postDelayed(this::markReady, SPLASH_MAX_MS);
    }

    private void markReady() {
        if (pageReady) return;
        pageReady = true;
        root.invalidate();
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
        public void onPageFinished(WebView view, String url) {
            pushInsets();
            markReady(); // fallback if the page never calls BouncyNative.ready()
        }

        @Override
        public boolean onRenderProcessGone(WebView view, RenderProcessGoneDetail detail) {
            // The renderer crashed or was killed for memory: rebuild the WebView instead of crashing the app.
            root.removeView(web);
            web.destroy();
            setCanGoBack(false);
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
                prefs.edit().putInt(PREF_BAR, c).putBoolean(PREF_DARK, dark).apply();
                if (Build.VERSION.SDK_INT >= 33) {
                    getSplashScreen().setSplashScreenTheme(dark ? R.style.Theme_Bouncy_Night : R.style.Theme_Bouncy);
                }
            });
        }

        /** The web app reports whether Back has something to close (dialog, tape, game, other tab). */
        @JavascriptInterface
        public void setCanGoBack(boolean value) {
            runOnUiThread(() -> MainActivity.this.setCanGoBack(value));
        }

        /** System-bar sizes as "top,right,bottom,left" in CSS px, read synchronously when the page boots. */
        @JavascriptInterface
        public String insets() {
            return insetsCss;
        }

        /** The page has rendered its first frame: let the system splash screen go. */
        @JavascriptInterface
        public void ready() {
            runOnUiThread(MainActivity.this::markReady);
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

    /*
     * Edge-to-edge: the WebView fills the whole screen and each theme's own background (gradients,
     * patterns, glass) runs behind the transparent status and gesture bars, so they always match.
     * The bar sizes go to the page as CSS safe areas; only the on-screen keyboard pads the view.
     */
    private volatile String insetsCss = "0,0,0,0";

    @SuppressWarnings("deprecation")
    private void applyInsets() {
        root.setOnApplyWindowInsetsListener((v, insets) -> {
            int t, r, b, l, ime = 0;
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
                Insets i = insets.getInsets(WindowInsets.Type.systemBars() | WindowInsets.Type.displayCutout());
                t = i.top; r = i.right; b = i.bottom; l = i.left;
                ime = insets.getInsets(WindowInsets.Type.ime()).bottom;
            } else {
                t = insets.getSystemWindowInsetTop(); r = insets.getSystemWindowInsetRight();
                b = insets.getSystemWindowInsetBottom(); l = insets.getSystemWindowInsetLeft();
                if (b > dp(120)) { ime = b; b = insets.getStableInsetBottom(); } // keyboard open (pre-R)
            }
            boolean keyboard = ime > b;
            v.setPadding(0, 0, 0, keyboard ? ime : 0);
            float d = getResources().getDisplayMetrics().density;
            String css = fmt(t / d) + "," + fmt(r / d) + "," + fmt(keyboard ? 0 : b / d) + "," + fmt(l / d);
            if (!css.equals(insetsCss)) { insetsCss = css; pushInsets(); }
            return Build.VERSION.SDK_INT >= Build.VERSION_CODES.R ? WindowInsets.CONSUMED : insets.consumeSystemWindowInsets();
        });
        root.requestApplyInsets();
    }

    private int dp(int v) { return Math.round(v * getResources().getDisplayMetrics().density); }

    private static String fmt(float v) { return String.valueOf(Math.round(v * 10f) / 10f); }

    /** Send the current safe areas to the page (values are numbers we computed, never page input). */
    private void pushInsets() {
        if (web == null) return;
        String[] p = insetsCss.split(",");
        web.evaluateJavascript("(function(s){s.setProperty('--sa-t','" + p[0] + "px');s.setProperty('--sa-r','" + p[1]
                + "px');s.setProperty('--sa-b','" + p[2] + "px');s.setProperty('--sa-l','" + p[3] + "px')})(document.documentElement.style)", null);
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

    /*
     * Back closes the web app's top layer first (dialog, tape, game, other tab).
     *
     * At the calculator's home screen:
     *  - Android 15+ (predictive back is on by default): Back is left to the system, which plays its
     *    own "shrink back to home" gesture animation.
     *  - Android 14 and older: the app plays a short fade-and-settle itself, then moves to the
     *    background. It isn't destroyed, so reopening is instant, and it fades back in.
     */
    private static final boolean SYSTEM_HOME_ANIMATION = Build.VERSION.SDK_INT >= 35;
    private static final long OUTRO_MS = 210;

    private void setCanGoBack(boolean value) {
        canGoBack = value;
        if (Build.VERSION.SDK_INT >= 33) {
            boolean want = value || !SYSTEM_HOME_ANIMATION;
            if (want && !backRegistered) {
                if (backCallback == null) backCallback = this::webBack;
                getOnBackInvokedDispatcher().registerOnBackInvokedCallback(OnBackInvokedDispatcher.PRIORITY_DEFAULT, backCallback);
                backRegistered = true;
            } else if (!want && backRegistered) {
                getOnBackInvokedDispatcher().unregisterOnBackInvokedCallback(backCallback);
                backRegistered = false;
            }
        }
    }

    @Override
    @SuppressWarnings("deprecation")
    public void onBackPressed() { // Android 12 and older
        webBack();
    }

    /** Close the web app's top layer; if there's nothing to close, leave the app. */
    private void webBack() {
        if (leaving) return;
        if (web == null || !canGoBack) { leaveApp(); return; }
        web.evaluateJavascript("(window.bouncy && window.bouncy.back) ? window.bouncy.back() : false", value -> {
            if (!"true".equals(value)) {
                setCanGoBack(false);
                leaveApp();
            }
        });
    }

    /** Play the page's exit animation, then send the app to the background. */
    private void leaveApp() {
        if (leaving) return;
        if (web == null) { goHome(); return; }
        leaving = true;
        web.evaluateJavascript("(window.bouncy && window.bouncy.outro) ? window.bouncy.outro() : false", value -> {
            if ("true".equals(value)) {
                outroShown = true;
                root.postDelayed(this::goHome, OUTRO_MS);
            } else {
                goHome();
            }
        });
    }

    private void goHome() {
        leaving = false;
        if (!moveTaskToBack(true)) {
            returnIn();
            finish();
        }
    }

    /** Fade the page back in after leaving with Back. */
    private void returnIn() {
        if (!outroShown || web == null) return;
        outroShown = false;
        web.evaluateJavascript("window.bouncy && window.bouncy.returnIn && window.bouncy.returnIn()", null);
    }

    /* ---------------------------------------------------------------- lifecycle */

    @Override
    protected void onResume() {
        super.onResume();
        if (web != null) { web.resumeTimers(); web.onResume(); }
        returnIn();
    }

    @Override
    protected void onPause() {
        if (web != null) {
            // Save anything still waiting to be written, then stop animations and timers while hidden (battery).
            web.evaluateJavascript("window.bouncy && window.bouncy.flush && window.bouncy.flush()", null);
            web.onPause();
            web.pauseTimers();
        }
        super.onPause();
    }

    @Override
    protected void onDestroy() {
        if (Build.VERSION.SDK_INT >= 33 && backRegistered) {
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
