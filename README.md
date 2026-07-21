# Registre Planteurs — application Android (APK)

Application de terrain hors ligne : fiches de recrutement, codes planteur/plantation,
géolocalisation, paiements, documents. Accès par identifiant, données chiffrées sur
l'appareil.

---

## 1. Sécurité en place

| Mécanisme | Détail |
|---|---|
| Comptes locaux | Un identifiant et un mot de passe par agent, rôles administrateur / agent |
| Mots de passe | Jamais stockés : dérivation PBKDF2-SHA256, 310 000 itérations, sel aléatoire de 16 octets |
| Données au repos | Registre, paiements et compteurs chiffrés en AES-GCM 256 bits |
| Pièces jointes | Photos et documents chiffrés individuellement dans IndexedDB |
| Clé de chiffrement | Une clé de données par appareil, enveloppée séparément avec le mot de passe de chaque agent — retirer un agent ne rend pas les données illisibles aux autres |
| Anti-force brute | Blocage d'une minute après 8 essais infructueux |
| Verrouillage | Session fermée automatiquement après 5 minutes d'inactivité, et à la mise en arrière-plan |
| Écran | Captures d'écran et aperçu dans la liste des tâches bloqués (`FLAG_SECURE`) |
| Système | Sauvegarde Android désactivée (`allowBackup=false`), trafic en clair interdit, débogage WebView désactivé |

Un mot de passe perdu est définitif : sans lui, la clé de données ne peut pas être
reconstituée. C'est le prix du chiffrement réel — d'où l'importance des sauvegardes
(point 5).

## 2. Plages de codes par agent

Chaque téléphone attribue ses codes hors ligne. Pour éviter que deux agents créent le
même code planteur, l'administrateur affecte une plage à la création du compte :

| Agent | Plage | Codes générés |
|---|---|---|
| Agent 1 | 1 – 999 | 00001 … 00999 |
| Agent 2 | 1000 – 1999 | 01000 … 01999 |
| Agent 3 | 2000 – 2999 | 02000 … 02999 |

L'application refuse d'enregistrer au-delà de la plage et affiche un message. Chaque
fiche porte l'identifiant de l'agent qui l'a saisie, y compris dans les exports.

## 3. Construire l'APK

### Option A — sans rien installer (GitHub Actions, recommandée)

1. Créer un dépôt **privé** et y pousser ce dossier.
2. Générer une clé de signature, une fois pour toutes, sur n'importe quel poste avec Java :

   ```bash
   keytool -genkeypair -v -keystore cle.jks -alias registre \
     -keyalg RSA -keysize 2048 -validity 10000
   base64 -w0 cle.jks > cle.b64
   ```

   Conserver `cle.jks` en lieu sûr : sans elle, aucune mise à jour ne pourra être
   installée par-dessus une version déjà déployée.

3. Dans le dépôt, *Settings → Secrets and variables → Actions*, créer :
   `KEYSTORE_B64` (le contenu de `cle.b64`), `KEYSTORE_PASSWORD`, `KEY_ALIAS` (`registre`),
   `KEY_PASSWORD`.
4. Onglet *Actions* → « Construire l'APK » → *Run workflow* → `release`.
5. L'APK se télécharge dans les artefacts du job.

### Option B — en local

Prérequis : Node.js 20, Java 17, Android SDK (Android Studio).

```bash
npm install
npm run android:add        # génère le projet Android + durcissement
export KEYSTORE_FILE=$PWD/cle.jks KEYSTORE_PASSWORD=… KEY_ALIAS=registre KEY_PASSWORD=…
npm run apk:release        # android/app/build/outputs/apk/release/app-release.apk
```

Après chaque modification de `www/index.html` : `npm run sync` puis recompiler.

## 4. Déployer sur les téléphones de l'équipe

Trois voies, de la plus simple à la plus encadrée :

- **Fichier direct.** Envoyer l'APK par câble, clé USB ou lien privé. L'agent autorise
  « Installer des applications inconnues » pour l'application qui ouvre le fichier.
  Aucun compte Google requis, mais les mises à jour sont manuelles.
- **Test interne Google Play.** Compte développeur à 25 USD une fois. Jusqu'à 100
  testeurs invités par adresse e-mail, mises à jour automatiques, application invisible
  du public. C'est le meilleur compromis pour une équipe restreinte.
- **Gestion de flotte** (Android Enterprise, Google Workspace) si les téléphones
  appartiennent à l'entreprise et doivent être verrouillés.

À la première ouverture, l'application demande la création du compte administrateur.
L'administrateur crée ensuite les comptes agents depuis le bouton **Comptes**.
Chaque appareil a ses propres comptes : refaire cette étape sur chaque téléphone.

## 5. Sauvegardes

Les données vivent sur l'appareil. Un téléphone perdu, c'est le registre perdu.

- Depuis l'application : **Sauvegarder** produit un fichier JSON (avec ou sans les
  pièces jointes). À faire en fin de journée de collecte.
- Ce fichier de sauvegarde n'est **pas chiffré** : il sort de l'enveloppe de sécurité de
  l'application. Le transmettre par un canal privé et le stocker sur un poste protégé.
- **Restaurer** réinjecte une sauvegarde sur un autre appareil — c'est aussi la façon de
  consolider le travail de plusieurs agents sur un poste central.

## 6. Suite logique

La consolidation manuelle par sauvegardes atteint vite ses limites au-delà de trois ou
quatre agents. L'étape suivante est une synchronisation vers un serveur : un point
d'entrée d'API, un jeton par agent, une file d'attente locale envoyée dès qu'il y a du
réseau. La structure des fiches est déjà prête pour cela (identifiant unique par fiche,
horodatage de création et de modification, identifiant de l'agent).
