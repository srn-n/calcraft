package net.simplymadestudio.bouncycalculator;

import java.util.Locale;

/**
 * Pure path and MIME rules for serving the bundled web app (no Android types, so they can be
 * tested on a plain JVM). Used by MainActivity's asset loader since 1.1.2, which replaced
 * androidx.webkit's WebViewAssetLoader.
 */
final class AssetPaths {
    static final String PREFIX = "/assets/";

    private AssetPaths() {}

    /**
     * The asset path for a URL path like "/assets/www/index.html" ("www/index.html"), or null if it
     * isn't a plain relative path under /assets/: no "..", no empty or hidden segments, no backslashes.
     */
    static String relative(String urlPath) {
        if (urlPath == null || !urlPath.startsWith(PREFIX)) return null;
        String rel = urlPath.substring(PREFIX.length());
        if (rel.isEmpty() || rel.indexOf('\\') >= 0 || rel.indexOf('\0') >= 0) return null;
        for (String seg : rel.split("/", -1)) {
            if (seg.isEmpty() || seg.startsWith(".")) return null;
        }
        return rel;
    }

    static String mimeType(String name) {
        int dot = name.lastIndexOf('.');
        String ext = dot < 0 ? "" : name.substring(dot + 1).toLowerCase(Locale.ROOT);
        switch (ext) {
            case "html": return "text/html";
            case "js": case "mjs": return "text/javascript";
            case "css": return "text/css";
            case "json": return "application/json";
            case "webmanifest": return "application/manifest+json";
            case "svg": return "image/svg+xml";
            case "png": return "image/png";
            case "webp": return "image/webp";
            case "jpg": case "jpeg": return "image/jpeg";
            case "ico": return "image/x-icon";
            case "woff2": return "font/woff2";
            case "woff": return "font/woff";
            case "txt": return "text/plain";
            default: return "application/octet-stream";
        }
    }

    /** Text types get an explicit UTF-8 charset; binary types get none. */
    static String encoding(String mime) {
        return mime.startsWith("text/") || mime.endsWith("javascript") || mime.endsWith("json") || mime.endsWith("+xml") ? "utf-8" : null;
    }
}
