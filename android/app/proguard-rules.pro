# The JavaScript bridge is called by name from the web app; keep those methods.
-keepattributes JavascriptInterface
-keepclassmembers class net.simplymadestudio.bouncycalculator.MainActivity$Bridge {
    @android.webkit.JavascriptInterface <methods>;
}
