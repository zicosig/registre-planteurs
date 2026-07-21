/* Durcissement du projet Android généré par Capacitor.
   À relancer après chaque « cap add android » ou « cap sync ».
   Chaque étape est facultative : si un fichier a changé de forme, on prévient sans échouer. */
const fs = require("fs");
const path = require("path");

const A = (...p) => path.join(__dirname, "..", "android", ...p);
const ok = (m) => console.log("  ✔ " + m);
const skip = (m) => console.log("  – " + m);

function patch(file, fn) {
  if (!fs.existsSync(file)) return skip("absent : " + path.relative(process.cwd(), file));
  const src = fs.readFileSync(file, "utf8");
  const out = fn(src);
  if (out == null || out === src) return skip("déjà à jour : " + path.basename(file));
  fs.writeFileSync(file, out);
  ok(path.basename(file));
}

console.log("Durcissement Android :");

/* 1. Manifeste : pas de sauvegarde cloud, pas de trafic en clair, permissions terrain */
patch(A("app", "src", "main", "AndroidManifest.xml"), (s) => {
  s = s.replace(/android:allowBackup="true"/g, 'android:allowBackup="false"');
  if (!/android:allowBackup=/.test(s))
    s = s.replace(/<application/, '<application\n        android:allowBackup="false"');
  if (!/android:usesCleartextTraffic=/.test(s))
    s = s.replace(/<application/, '<application\n        android:usesCleartextTraffic="false"');
  if (!/android:fullBackupContent=/.test(s))
    s = s.replace(/<application/, '<application\n        android:fullBackupContent="false"');
  const perms = [
    "android.permission.ACCESS_FINE_LOCATION",
    "android.permission.ACCESS_COARSE_LOCATION",
  ];
  perms.forEach((p) => {
    if (!s.includes(p))
      s = s.replace(/<\/manifest>/, `    <uses-permission android:name="${p}" />\n</manifest>`);
  });
  return s;
});

/* 2. MainActivity : interdit les captures d'écran et l'aperçu dans la liste des tâches */
const mainDirs = ["java", "kotlin"];
mainDirs.forEach((lang) => {
  const base = A("app", "src", "main", lang);
  if (!fs.existsSync(base)) return;
  const stack = [base];
  while (stack.length) {
    const dir = stack.pop();
    fs.readdirSync(dir, { withFileTypes: true }).forEach((e) => {
      const full = path.join(dir, e.name);
      if (e.isDirectory()) return stack.push(full);
      if (!/^MainActivity\.(java|kt)$/.test(e.name)) return;
      patch(full, (s) => {
        if (s.includes("FLAG_SECURE")) return null;
        const java = e.name.endsWith(".java");
        const imports = java
          ? "import android.view.WindowManager;\nimport android.os.Bundle;\n"
          : "import android.view.WindowManager\nimport android.os.Bundle\n";
        if (!s.includes("WindowManager")) s = s.replace(/(package .+?\n)/, "$1\n" + imports);
        const body = java
          ? `
    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        getWindow().setFlags(WindowManager.LayoutParams.FLAG_SECURE,
                             WindowManager.LayoutParams.FLAG_SECURE);
    }
`
          : `
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        window.setFlags(WindowManager.LayoutParams.FLAG_SECURE,
                        WindowManager.LayoutParams.FLAG_SECURE)
    }
`;
        return s.replace(/\{\s*\}\s*$/, "{\n" + body + "}\n").replace(/\}\s*$/, body + "}\n");
      });
    });
  }
});

/* 3. Gradle : signature de release pilotée par les variables d'environnement */
patch(A("app", "build.gradle"), (s) => {
  if (s.includes("signingConfigs")) return null;
  const block = `
    signingConfigs {
        release {
            def ks = System.getenv("KEYSTORE_FILE")
            if (ks) {
                storeFile file(ks)
                storePassword System.getenv("KEYSTORE_PASSWORD")
                keyAlias System.getenv("KEY_ALIAS")
                keyPassword System.getenv("KEY_PASSWORD")
            }
        }
    }
`;
  s = s.replace(/(android\s*\{)/, "$1\n" + block);
  s = s.replace(
    /(buildTypes\s*\{\s*release\s*\{)/,
    "$1\n            signingConfig signingConfigs.release\n            minifyEnabled true\n            shrinkResources true"
  );
  return s;
});

console.log("Terminé.");
