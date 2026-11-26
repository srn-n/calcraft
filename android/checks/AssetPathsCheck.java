package net.simplymadestudio.bouncycalculator;

// Run by CI (.github/workflows/android.yml): javac AssetPaths.java + this, then java with the assets folder.
// Checks the 1.1.2 asset loader rules: every bundled file is served with a real type, bad paths are refused.
import java.nio.file.*; import java.util.*;
public class AssetPathsCheck {
  static int fail = 0;
  static void ok(String name, boolean c) { System.out.println((c ? "PASS " : "FAIL ") + name); if (!c) fail++; }
  public static void main(String[] a) throws Exception {
    Path assets = Paths.get(a[0]); List<Path> files = new ArrayList<>();
    try (var w = Files.walk(assets.resolve("www"))) { w.filter(Files::isRegularFile).forEach(files::add); }
    int typed = 0;
    for (Path f : files) {
      String rel = assets.relativize(f).toString().replace('\\', '/');
      String got = AssetPaths.relative("/assets/" + rel);
      boolean known = !AssetPaths.mimeType(rel).equals("application/octet-stream");
      if (rel.equals(got) && known) typed++; else System.out.println("  problem: " + rel + " -> " + got + " " + AssetPaths.mimeType(rel));
    }
    ok("every bundled file (" + files.size() + ") resolves and has a real MIME type", typed == files.size());
    ok("index.html is text/html utf-8", AssetPaths.mimeType("www/index.html").equals("text/html") && "utf-8".equals(AssetPaths.encoding("text/html")));
    ok("module script is text/javascript (required for <script type=module>)", AssetPaths.mimeType("www/assets/index-X.js").equals("text/javascript"));
    ok("fonts are font/woff2, binary (no charset)", AssetPaths.mimeType("a.woff2").equals("font/woff2") && AssetPaths.encoding("font/woff2") == null);
    String[] bad = { null, "", "/", "/assets/", "/assets", "/other/www/index.html", "/assets/../secret", "/assets/www/../../x",
      "/assets/www/./index.html", "/assets/www/.hidden", "/assets/www//index.html", "/assets/www\\index.html", "/assets/www/index.html/", "/assets/www/\0x", "assets/www/index.html" };
    boolean allRejected = true;
    for (String b : bad) if (AssetPaths.relative(b) != null) { allRejected = false; System.out.println("  NOT rejected: " + b); }
    ok("traversal, hidden, empty-segment, backslash, NUL and off-prefix paths are rejected (" + bad.length + ")", allRejected);
    ok("normal path accepted", "www/index.html".equals(AssetPaths.relative("/assets/www/index.html")));
    System.out.println(fail == 0 ? "ALL PASS" : fail + " FAILED"); System.exit(fail);
  }
}
