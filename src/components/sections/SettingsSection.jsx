import { useState } from "react";
import {
  User, LogOut, KeyRound, ShieldCheck, ShieldAlert, Package, Clock, Gamepad2, Tag, Plus, X, FileText,
  ChevronRight, ChevronLeft, Award, Info, AlertTriangle, Scale, FileCheck, Code2, Mail,
} from "lucide-react";
import { C } from "../../lib/theme";
import { fmtDate } from "../../lib/format";
import { SUPPORT_EMAIL } from "../../lib/appConfig";
import { Modal } from "../ui/Modal";
import { GhostButton, PrimaryButton } from "../ui/Buttons";
import { Field } from "../ui/Field";
import { TextInput } from "../ui/Inputs";
import { Badge } from "../ui/Badge";

const APP_VERSION = "1.0.0";

// ---------- Settings home: a menu of categories instead of every option stacked on
// one page, so it stays manageable as more settings are added. ----------
export function SettingsSection({ auth, catalog, itemCount, onExportCSV }) {
  const [panel, setPanel] = useState(null); // null (menu) | "account" | "catalog" | "data" | "about"

  if (panel === "account") {
    return (
      <SettingsPanel title="Account" onBack={() => setPanel(null)}>
        <AccountPanel auth={auth} itemCount={itemCount} />
      </SettingsPanel>
    );
  }
  if (panel === "catalog") {
    return (
      <SettingsPanel title="Catalogo" onBack={() => setPanel(null)}>
        <GamesEditor catalog={catalog} />
        <PlatformsEditor catalog={catalog} />
        <GradingCompaniesEditor catalog={catalog} />
      </SettingsPanel>
    );
  }
  if (panel === "data") {
    return (
      <SettingsPanel title="Esportazione CSV" onBack={() => setPanel(null)}>
        <CSVPanel itemCount={itemCount} onExportCSV={onExportCSV} />
      </SettingsPanel>
    );
  }
  if (panel === "about") {
    return (
      <SettingsPanel title="Informazioni" onBack={() => setPanel(null)}>
        <AboutPanel />
      </SettingsPanel>
    );
  }

  return (
    <div>
      <h3 className="text-sm font-semibold mb-3" style={{ color: C.textDim }}>Impostazioni</h3>
      <div className="space-y-2">
        {auth.configured && (
          <SettingsMenuItem
            icon={User}
            title="Account"
            subtitle={auth.user?.email || ""}
            onClick={() => setPanel("account")}
          />
        )}
        <SettingsMenuItem icon={Gamepad2} title="Catalogo" subtitle={`${catalog.games.length} giochi, ${catalog.platforms.length} piattaforme, ${catalog.gradingCompanies.length} case di gradazione`} onClick={() => setPanel("catalog")} />
        <SettingsMenuItem icon={FileText} title="Esportazione CSV" subtitle="Scarica un foglio con carte, lotti e vendite" onClick={() => setPanel("data")} />
        <SettingsMenuItem icon={Info} title="Informazioni" subtitle="Versione, privacy, termini e licenze" onClick={() => setPanel("about")} />
      </div>
    </div>
  );
}

function SettingsMenuItem({ icon: Icon, title, subtitle, onClick }) {
  return (
    <button onClick={onClick} className="w-full flex items-center gap-3 p-4 rounded-2xl text-left" style={{ background: C.surface, border: `1px solid ${C.border}` }}>
      <div style={{ width: 36, height: 36, borderRadius: 10, background: C.surfaceAlt, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
        <Icon size={17} color={C.gold} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-[13.5px] font-medium">{title}</div>
        <div className="text-[11.5px] mt-0.5" style={{ color: C.textFaint }}>{subtitle}</div>
      </div>
      <ChevronRight size={16} color={C.textFaint} />
    </button>
  );
}

function SettingsPanel({ title, onBack, children }) {
  return (
    <div>
      <button onClick={onBack} className="flex items-center gap-1 mb-3 text-[12.5px]" style={{ color: C.textDim }}>
        <ChevronLeft size={15} /> Impostazioni
      </button>
      <h3 className="text-sm font-semibold mb-3">{title}</h3>
      <div className="space-y-3">{children}</div>
    </div>
  );
}

function AccountPanel({ auth, itemCount }) {
  const [busy, setBusy] = useState(false);
  const [showChangePassword, setShowChangePassword] = useState(false);

  async function handleSignOut() {
    setBusy(true);
    try { await auth.signOut(); } finally { setBusy(false); }
  }

  const email = auth.user?.email || "";
  const initial = email.charAt(0).toUpperCase() || "?";
  const emailVerified = !!auth.user?.email_confirmed_at;
  const memberSince = auth.user?.created_at ? fmtDate(auth.user.created_at) : null;
  const lastSignIn = auth.user?.last_sign_in_at ? fmtDate(auth.user.last_sign_in_at) : null;

  return (
    <>
      <div className="p-5 rounded-2xl" style={{ background: C.surface, border: `1px solid ${C.border}` }}>
        <div className="flex items-center gap-3 mb-1">
          <div style={{ width: 50, height: 50, borderRadius: 999, background: C.surfaceAlt, border: `1.5px solid ${C.gold}`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            <span className="text-lg font-bold" style={{ color: C.gold }}>{initial}</span>
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-sm font-semibold truncate">{email}</div>
            {memberSince && <div className="text-[11.5px] mt-0.5" style={{ color: C.textFaint }}>Membro dal {memberSince}</div>}
          </div>
        </div>
        <div className="mt-3">
          {emailVerified ? (
            <Badge color={C.teal} bg="rgba(63,179,155,0.14)"><ShieldCheck size={11} style={{ marginRight: 3, marginTop: -1 }} />Email verificata</Badge>
          ) : (
            <Badge color={C.amber} bg="rgba(201,138,58,0.14)"><ShieldAlert size={11} style={{ marginRight: 3, marginTop: -1 }} />Email da verificare</Badge>
          )}
        </div>

        <div className="grid grid-cols-2 gap-2 my-4">
          <div className="p-3 rounded-xl" style={{ background: C.surfaceAlt }}>
            <div className="flex items-center gap-1.5 text-[10.5px] uppercase" style={{ color: C.textFaint }}><Package size={11} /> In inventario</div>
            <div className="text-base font-bold mt-1" style={{ color: C.gold }}>{itemCount}</div>
          </div>
          <div className="p-3 rounded-xl" style={{ background: C.surfaceAlt }}>
            <div className="flex items-center gap-1.5 text-[10.5px] uppercase" style={{ color: C.textFaint }}><Clock size={11} /> Ultimo accesso</div>
            <div className="text-[12.5px] font-semibold mt-1.5">{lastSignIn || "—"}</div>
          </div>
        </div>

        <GhostButton full onClick={() => setShowChangePassword(true)}>
          <KeyRound size={14} /> Cambia password
        </GhostButton>
      </div>

      <GhostButton full onClick={handleSignOut} disabled={busy} style={{ color: C.crimson, borderColor: C.crimsonDim }}>
        <LogOut size={14} /> {busy ? "Uscita..." : "Logout"}
      </GhostButton>

      {showChangePassword && (
        <Modal title="Cambia password" onClose={() => setShowChangePassword(false)}>
          <ChangePasswordForm auth={auth} onClose={() => setShowChangePassword(false)} />
        </Modal>
      )}
    </>
  );
}

function ChangePasswordForm({ auth, onClose }) {
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState(null); // { text, isError }

  const mismatch = confirmPassword !== "" && newPassword !== confirmPassword;
  const valid = newPassword.length >= 6 && newPassword === confirmPassword;

  async function handleSubmit() {
    if (!valid || busy) return;
    setBusy(true);
    setMessage(null);
    try {
      await auth.updatePassword(newPassword);
      setMessage({ text: "Password aggiornata.", isError: false });
      setNewPassword(""); setConfirmPassword("");
    } catch (e) {
      setMessage({ text: e.message || "Errore durante l'aggiornamento della password.", isError: true });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <Field label="Nuova password" hint="Almeno 6 caratteri.">
        <TextInput type="password" autoComplete="new-password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="••••••••" />
      </Field>
      <Field label="Conferma nuova password" hint={mismatch ? "Le due password non coincidono." : undefined}>
        <TextInput type="password" autoComplete="new-password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} placeholder="••••••••" />
      </Field>
      {message && (
        <p className="text-[12px] mb-3" style={{ color: message.isError ? C.crimson : C.teal }}>{message.text}</p>
      )}
      <div className="flex gap-3">
        <GhostButton full onClick={onClose}>Annulla</GhostButton>
        <PrimaryButton full onClick={handleSubmit} disabled={!valid || busy}>
          {busy ? "Aggiornamento..." : "Aggiorna password"}
        </PrimaryButton>
      </div>
    </div>
  );
}

function GamesEditor({ catalog }) {
  const { games, addGame, renameGame, removeGame } = catalog;
  const [newLabel, setNewLabel] = useState("");
  const [editingKey, setEditingKey] = useState(null);
  const [editingLabel, setEditingLabel] = useState("");

  function commitAdd() {
    if (!newLabel.trim()) return;
    addGame(newLabel);
    setNewLabel("");
  }
  function startEdit(g) { setEditingKey(g.key); setEditingLabel(g.label); }
  function commitEdit() {
    if (editingLabel.trim()) renameGame(editingKey, editingLabel);
    setEditingKey(null);
  }

  return (
    <div className="p-4 rounded-2xl" style={{ background: C.surface, border: `1px solid ${C.border}` }}>
      <div className="flex items-center gap-2 mb-3">
        <Gamepad2 size={16} color={C.gold} />
        <span className="text-sm font-semibold">Giochi gestiti</span>
      </div>
      <div className="space-y-2 mb-3">
        {games.map((g) => (
          <div key={g.key} className="flex items-center gap-2.5 px-3 py-2 rounded-xl" style={{ background: C.surfaceAlt }}>
            <span style={{ width: 10, height: 10, borderRadius: 999, background: g.color, flexShrink: 0 }} />
            {editingKey === g.key ? (
              <input
                autoFocus value={editingLabel} onChange={(e) => setEditingLabel(e.target.value)}
                onBlur={commitEdit} onKeyDown={(e) => e.key === "Enter" && commitEdit()}
                style={{ background: "transparent", border: "none", outline: "none", color: C.text, fontSize: "13.5px", flex: 1 }}
              />
            ) : (
              <button onClick={() => startEdit(g)} className="flex-1 text-left text-[13.5px]">{g.label}</button>
            )}
            {g.key !== "altro" && (
              <button onClick={() => removeGame(g.key)} style={{ color: C.textFaint }}><X size={15} /></button>
            )}
          </div>
        ))}
      </div>
      <div className="flex gap-2">
        <TextInput value={newLabel} onChange={(e) => setNewLabel(e.target.value)} placeholder="Nuovo gioco, es. Magic" onKeyDown={(e) => e.key === "Enter" && commitAdd()} />
        <GhostButton onClick={commitAdd} style={{ padding: "10px 14px" }}><Plus size={16} /></GhostButton>
      </div>
    </div>
  );
}

function PlatformsEditor({ catalog }) {
  const { platforms, addPlatform, removePlatform } = catalog;
  const [newName, setNewName] = useState("");

  function commitAdd() {
    if (!newName.trim()) return;
    addPlatform(newName);
    setNewName("");
  }

  return (
    <div className="p-4 rounded-2xl" style={{ background: C.surface, border: `1px solid ${C.border}` }}>
      <div className="flex items-center gap-2 mb-3">
        <Tag size={16} color={C.gold} />
        <span className="text-sm font-semibold">Piattaforme di vendita</span>
      </div>
      <div className="flex flex-wrap gap-1.5 mb-3">
        {platforms.map((p) => (
          <span key={p} className="flex items-center gap-1.5 pl-3 pr-1.5 py-1 rounded-full text-[12.5px]" style={{ background: C.surfaceAlt, color: C.textDim }}>
            {p}
            <button onClick={() => removePlatform(p)} style={{ color: C.textFaint }}><X size={12} /></button>
          </span>
        ))}
      </div>
      <div className="flex gap-2">
        <TextInput value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="Nuova piattaforma" onKeyDown={(e) => e.key === "Enter" && commitAdd()} />
        <GhostButton onClick={commitAdd} style={{ padding: "10px 14px" }}><Plus size={16} /></GhostButton>
      </div>
    </div>
  );
}

function GradingCompaniesEditor({ catalog }) {
  const { gradingCompanies, addGradingCompany, removeGradingCompany } = catalog;
  const [newName, setNewName] = useState("");

  function commitAdd() {
    if (!newName.trim()) return;
    addGradingCompany(newName);
    setNewName("");
  }

  return (
    <div className="p-4 rounded-2xl" style={{ background: C.surface, border: `1px solid ${C.border}` }}>
      <div className="flex items-center gap-2 mb-3">
        <Award size={16} color={C.gold} />
        <span className="text-sm font-semibold">Case di gradazione</span>
      </div>
      <div className="flex flex-wrap gap-1.5 mb-3">
        {gradingCompanies.map((g) => (
          <span key={g} className="flex items-center gap-1.5 pl-3 pr-1.5 py-1 rounded-full text-[12.5px]" style={{ background: C.surfaceAlt, color: C.textDim }}>
            {g}
            <button onClick={() => removeGradingCompany(g)} style={{ color: C.textFaint }}><X size={12} /></button>
          </span>
        ))}
      </div>
      <div className="flex gap-2">
        <TextInput value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="Es. AGS" onKeyDown={(e) => e.key === "Enter" && commitAdd()} />
        <GhostButton onClick={commitAdd} style={{ padding: "10px 14px" }}><Plus size={16} /></GhostButton>
      </div>
    </div>
  );
}

function AboutPanel() {
  const emailNode = SUPPORT_EMAIL
    ? <a href={`mailto:${SUPPORT_EMAIL}`} style={{ color: C.info }}>{SUPPORT_EMAIL}</a>
    : "[email da inserire]";

  return (
    <>
      <div className="p-4 rounded-2xl text-center" style={{ background: C.surface, border: `1px solid ${C.border}` }}>
        <div
          className="mx-auto mb-2 flex items-center justify-center"
          style={{ width: 44, height: 44, borderRadius: 999, background: C.surfaceAlt, border: `1.5px solid ${C.gold}` }}
        >
          <span style={{ fontFamily: "'Oswald', sans-serif", fontWeight: 700, fontSize: 15 }}>
            <span style={{ color: C.text }}>C</span><span style={{ color: C.gold }}>ly</span>
          </span>
        </div>
        <div className="text-sm font-semibold">Cardly</div>
        <div className="text-[11.5px] mt-0.5" style={{ color: C.textFaint }}>Versione {APP_VERSION}</div>
        <p className="text-[12.5px] mt-2" style={{ color: C.textDim }}>
          Gestione acquisti, catalogazione e vendite per collezioni di carte collezionabili.
        </p>
      </div>

      <div className="flex gap-2 items-start p-3 rounded-xl" style={{ background: "rgba(201,138,58,0.12)" }}>
        <AlertTriangle size={14} color={C.amber} style={{ marginTop: 1, flexShrink: 0 }} />
        <span className="text-[12px]" style={{ color: C.amber }}>
          I testi di questa sezione sono una bozza di base, non una consulenza legale. Prima di
          pubblicare l'app o introdurre funzioni a pagamento, falli rivedere da un professionista
          (in particolare per la conformità GDPR) e completa i punti segnati "da inserire".
        </span>
      </div>

      <AboutSection icon={Scale} title="Informativa sulla privacy">
        <AboutP><b>Titolare del trattamento:</b> {SUPPORT_EMAIL ? <>contattabile all'indirizzo {emailNode} (nome/ragione sociale da inserire)</> : "[nome/ragione sociale ed email da inserire]"}.</AboutP>
        <AboutP><b>Dati raccolti:</b> indirizzo email e password per l'account; i dati che inserisci nell'inventario (carte, lotti, prezzi, vendite, note); le foto che carichi.</AboutP>
        <AboutP><b>Dove sono conservati:</b> su Supabase (database, autenticazione e storage foto), con accesso protetto da login e regole che permettono a ciascun utente di vedere solo i propri dati. Hosting dell'app tramite Netlify.</AboutP>
        <AboutP><b>Finalità:</b> fornire il servizio di gestione dell'inventario. Nessun dato viene venduto o condiviso con terzi per finalità di marketing.</AboutP>
        <AboutP><b>Conservazione:</b> finché l'account resta attivo. Puoi richiedere la cancellazione dei tuoi dati in qualsiasi momento.</AboutP>
        <AboutP><b>I tuoi diritti:</b> accesso, rettifica, cancellazione, portabilità e opposizione al trattamento dei tuoi dati, contattando {emailNode}.</AboutP>
        <AboutP><b>Fornitori terzi coinvolti:</b> Supabase Inc. (database, autenticazione, storage) e Netlify (hosting).</AboutP>
      </AboutSection>

      <AboutSection icon={FileCheck} title="Termini di servizio">
        <AboutP>Il servizio è fornito "così com'è", pensato per la gestione personale di un inventario di carte collezionabili.</AboutP>
        <AboutP>Sei responsabile dell'accuratezza dei dati che inserisci (prezzi, quantità, stato delle vendite).</AboutP>
        <AboutP>Eventuali funzionalità a pagamento saranno regolate da termini aggiuntivi comunicati al momento del lancio.</AboutP>
        <AboutP>Il servizio non garantisce disponibilità continua e potrebbe essere soggetto a manutenzioni o interruzioni.</AboutP>
      </AboutSection>

      <AboutSection icon={Code2} title="Licenze open source">
        <AboutP>Questa app è costruita con React, Vite, Tailwind CSS, lucide-react e Supabase JS, tutte rilasciate con licenze open source permissive (principalmente MIT).</AboutP>
      </AboutSection>

      <AboutSection icon={Mail} title="Contatti">
        <AboutP>Per domande, richieste sui tuoi dati o segnalazioni: {emailNode}.</AboutP>
      </AboutSection>
    </>
  );
}

function AboutSection({ icon: Icon, title, children }) {
  return (
    <div className="p-4 rounded-2xl" style={{ background: C.surface, border: `1px solid ${C.border}` }}>
      <div className="flex items-center gap-2 mb-2">
        <Icon size={16} color={C.gold} />
        <span className="text-sm font-semibold">{title}</span>
      </div>
      <div className="space-y-2">{children}</div>
    </div>
  );
}

function AboutP({ children }) {
  return <p className="text-[12.5px] leading-relaxed" style={{ color: C.textDim }}>{children}</p>;
}

function CSVPanel({ itemCount, onExportCSV }) {
  return (
    <div className="p-4 rounded-2xl" style={{ background: C.surface, border: `1px solid ${C.border}` }}>
      <div className="flex items-center gap-2 mb-2">
        <FileText size={16} color={C.gold} />
        <span className="text-sm font-semibold">Esportazione CSV</span>
      </div>
      <p className="text-[12.5px] mb-3" style={{ color: C.textDim }}>
        Un foglio con tutte le carte, i lotti e le vendite (incluse quote non assegnate e vendite di gruppo) — pensato per aprirlo in Excel/Fogli Google, non come backup.
      </p>
      <GhostButton full onClick={onExportCSV} disabled={itemCount === 0}>
        <FileText size={14} /> Esporta CSV
      </GhostButton>
    </div>
  );
}
