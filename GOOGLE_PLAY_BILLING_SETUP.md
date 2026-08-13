# Cardly — configurazione Google Play Billing (TWA + abbonamento Premium)

Guida di riferimento per ricostruire/riconfigurare l'integrazione Play
Billing — utile se un giorno va rifatta la TWA da zero, ricollegata a un
nuovo progetto Supabase, o semplicemente per non doversi ricordare a memoria
dove sono sparsi tutti i pezzi. Corrisponde per stile a
[STRIPE_SETUP.md](STRIPE_SETUP.md), l'altra integrazione di pagamento.

Prerequisito: `supabase/schema.sql`, `supabase/entitlements.sql` e
`supabase/plan_history.sql` già eseguiti (vedi
[COME_INSTALLARE.md](COME_INSTALLARE.md)). `premium_source` in
`entitlements.sql` accetta già `'google_play'`, nessuna modifica lì.

---

## 1. TWA (Trusted Web Activity) con Bubblewrap

La app Android pubblicata sul Play Store è un "guscio" (TWA) che carica il
sito vero e proprio — non è una riscrittura nativa. Genera con:

```
npm i -g @bubblewrap/cli
bubblewrap init --manifest=https://cardly-collector.com/manifest.json
bubblewrap build
```

Va eseguito in una cartella **fuori dal repo web** oppure in una sottocartella
gitignorata (qui è `twa/`, già in `.gitignore` — contiene `android.keystore`,
una credenziale che firma l'app: **mai committarlo**, perderlo rende
impossibile pubblicare futuri aggiornamenti della stessa app).

Package name scelto: **`com.cardlycollector.twa`**. Nome/colori vengono letti
automaticamente da `manifest.json`.

### Problemi noti (Windows) e come risolverli

- **Bubblewrap scarica un JDK a 32 bit per errore.** Se `bubblewrap build`
  fallisce con `Could not reserve enough space for ... object heap`, controlla:
  ```
  <path-jdk>/bin/java.exe -XshowSettings:properties -version 2>&1 | grep arch
  ```
  Se `sun.arch.data.model = 32`, ripunta `~/.bubblewrap/config.json`
  (`jdkPath`) a un JDK 64 bit reale già installato. **Il percorso non deve
  contenere spazi** (es. non `C:\Program Files\...`, altrimenti Bubblewrap
  fallisce più avanti a firmare l'APK con un errore tipo `'C:\Program' non è
  riconosciuto...`) — se il JDK di sistema è sotto "Program Files", crea una
  directory junction verso un percorso senza spazi:
  ```
  mklink /J "C:\Users\<utente>\.bubblewrap\jdk21-x64" "C:\Program Files\Java\jdk-21"
  ```
  e usa quel percorso come `jdkPath`.

- **`minSdkVersion` troppo basso.** La libreria
  `com.google.androidbrowserhelper:billing` (inclusa automaticamente se hai
  abilitato Play Billing durante `bubblewrap init`) richiede almeno API 23.
  Se il build fallisce con `uses-sdk:minSdkVersion 21 cannot be smaller than
  version 23...`, alza `minSdkVersion` sia in `twa-manifest.json` che in
  `app/build.gradle` a `23` (rieseguire `bubblewrap update` altrimenti li
  sovrascrive).

- **`SDK location not found`** quando lanci `gradlew` a mano (non
  `bubblewrap build`): crea `twa/local.properties` con
  `sdk.dir=<percorso dell'Android SDK di Bubblewrap>` (di solito
  `~/.bubblewrap/android_sdk`).

- **`EBUSY: resource busy or locked`** durante un rebuild: un processo
  `java.exe` (daemon Gradle) è rimasto bloccato dal build precedente —
  chiudilo (`taskkill /F /PID <pid>`, trovalo con
  `tasklist /FI "IMAGENAME eq java.exe"`) e ripulisci `twa/build/` e
  `twa/app/build/` prima di ritentare.

### Impronta del keystore

Serve per `assetlinks.json` sotto:
```
keytool -list -v -keystore twa/android.keystore -alias android -storepass <storepass>
```
Cerca la riga `SHA256:`.

## 2. `public/.well-known/assetlinks.json`

Va aggiornato con i valori reali (package name + impronta SHA256 di sopra) e
deployato sul dominio di produzione — deve rispondere su
`https://cardly-collector.com/.well-known/assetlinks.json`. Verifica col
[Digital Asset Links generator/validator](https://developers.google.com/digital-asset-links/tools/generator)
di Google: se non risulta verificato, la TWA mostra la barra degli indirizzi
del browser invece di aprirsi a schermo intero.

## 3. Google Play Console — prodotto e merchant account

- **Account commerciante**: Play Console → Monetizzazione → configura account
  commerciante → tipo **Individuale** (nessuna azienda/P.IVA richiesta per
  questo passaggio — restano però obblighi fiscali separati, es. Partita IVA
  italiana per ricavi continuativi, non legati a questo form).
- **Prodotto abbonamento**: un solo prodotto con due base plan (il modello
  Google Play attuale, non più "un prodotto per piano"):
  - Product ID: **`premium`**
  - Base plan mensile: **`monthly`**
  - Base plan annuale: **`yearly`**

## 4. Real-time Developer Notifications (RTDN)

Dentro l'app (non nelle impostazioni account) → **Monetizza → Configurazione
monetizzazione** → sezione "Notifiche in tempo reale per lo sviluppatore":

1. Su Google Cloud (stesso progetto o uno nuovo, es. `cardly-play-billing`):
   Pub/Sub → crea un **topic**.
   - Autorizzazioni del topic → concedi al principal
     `google-play-developer-notifications@system.gserviceaccount.com` il
     ruolo **Pub/Sub Publisher**.
2. In Play Console, spunta "Attiva notifiche in tempo reale" e incolla:
   `projects/<project-id>/topics/<nome-topic>`
3. "Invia notifica di prova" per verificare che arrivi (controllabile da una
   subscription pull temporanea su Cloud Console).

## 5. Service account per la Google Play Developer API

Serve al backend per verificare gli acquisti (`verify-play-purchase`,
`play-rtdn-webhook`).

1. Google Cloud → IAM e amministrazione → Account di servizio → crea (es.
   `play-developer-api`).
2. Chiavi → Aggiungi chiave → JSON → scarica. **Credenziale sensibile**, non
   condividerla, non committarla.
3. Play Console → **Utenti e autorizzazioni** (livello account, non app) →
   invita l'email del service account → assegna alla app Cardly i permessi
   **"Visualizza dati finanziari"** e **"Gestisci ordini e abbonamenti"**.

## 6. Subscription push RTDN → Supabase

1. Google Cloud → IAM → crea un service account "invoker" dedicato (es.
   `pubsub-push-invoker`), nessun ruolo IAM particolare necessario.
2. Pub/Sub → il topic RTDN (punto 4) → crea **subscription**, tipo **Push**:
   - Endpoint: `https://<project-ref>.supabase.co/functions/v1/play-rtdn-webhook`
   - Abilita autenticazione → seleziona `pubsub-push-invoker@...`
   - Audience: lascia vuoto (di default diventa l'URL dell'endpoint stesso).

## 7. Supabase CLI

```
npm install -g supabase
supabase login
```
**Attenzione ai due progetti Supabase esistenti** — controlla quale collegare
prima di ogni comando (`cat supabase/.temp/project-ref`, o
`supabase projects list`):
- Sviluppo/test: quello usato da `.env.local`.
- Produzione (quello che serve davvero a `cardly-collector.com`): quello usato
  da `.env.esercizio`.
```
supabase link --project-ref <project-ref-produzione>
```

## 8. Deploy delle Edge Function

```
supabase functions deploy verify-play-purchase
supabase functions deploy play-rtdn-webhook --no-verify-jwt
```
La seconda **deve** avere `--no-verify-jwt`: Google la chiama da fuori senza
un JWT Supabase, l'autenticazione è il token OIDC verificato nel codice
([supabase/functions/play-rtdn-webhook/index.ts](supabase/functions/play-rtdn-webhook/index.ts)).

## 9. Segreti delle Edge Function

Mai nel `.env.local`/`.env.esercizio` del frontend (finiscono nel bundle
pubblico) — questi restano lato server, sul progetto collegato al punto 7:
```
supabase secrets set GOOGLE_PLAY_SERVICE_ACCOUNT_JSON=<contenuto del JSON del punto 5>
supabase secrets set GOOGLE_PLAY_RTDN_AUDIENCE=<url della function del punto 8>
supabase secrets set GOOGLE_PLAY_RTDN_INVOKER_EMAIL=<email del service account del punto 6>
```
Se il JSON del service account (che contiene newline dentro `private_key`)
dà l'errore `Invalid secret pair`, minificalo prima su una riga sola:
```
node -e "const fs=require('fs'); fs.writeFileSync('out.json', JSON.stringify(JSON.parse(fs.readFileSync('originale.json','utf8'))));"
supabase secrets set GOOGLE_PLAY_SERVICE_ACCOUNT_JSON="$(cat out.json)"
```

## 10. Migrazione database

Esegui [`supabase/google-play-billing.sql`](supabase/google-play-billing.sql)
nel SQL Editor del progetto Supabase di produzione (dopo `entitlements.sql`).

---

## Dettagli tecnici da verificare al primo acquisto reale

Scritti in [supabase/functions/_shared/googlePlay.ts](supabase/functions/_shared/googlePlay.ts)
perché non confermati da un esempio ufficiale Google verbatim in fase di
sviluppo (solo da fonti secondarie):
- **Formato sku** per un base plan nella Digital Goods API/PaymentRequest:
  `productId:basePlanId` (es. `premium:monthly`). Se `getDetails()` non trova
  i prezzi, il problema è probabilmente qui.
- **Endpoint di acknowledge** dell'acquisto sulla v2 dell'API
  (`.../subscriptionsv2/tokens/{token}:acknowledge`, dedotto per coerenza REST
  ma non documentato con un esempio esplicito) — il codice ha già un fallback
  automatico all'endpoint v3 legacy se il primo fallisce.

## Verifica end-to-end

1. Configura un **account tester** in Play Console (Test → Test interno o
   Licence testing) così un acquisto non addebita soldi veri.
2. Dall'app installata via canale di test interno: Account → "Gestisci Piano
   Premium" → completa un acquisto di test.
3. Controlla `profiles` (SQL Editor o badge in app via realtime):
   `subscription_tier = 'premium'`, `premium_source = 'google_play'`,
   `google_play_purchase_token` valorizzato.
4. In Play Console, sezione Ordini: l'acquisto deve risultare **"Confermato"**
   (acknowledged) entro pochi secondi, non lasciato pendente.
5. "Invia notifica di prova" RTDN da Play Console → controlla
   `supabase functions logs play-rtdn-webhook` → deve rispondere 200, non 401
   (401 = problema di autenticazione OIDC, ricontrolla audience/invoker email).
6. Disdici l'abbonamento di test dal Play Store → entro qualche minuto deve
   arrivare la notifica `SUBSCRIPTION_CANCELED` e `profiles` aggiornarsi.
