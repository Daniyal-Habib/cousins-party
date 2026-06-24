import re

with open("src/app/pass-and-play/page.tsx", "r") as f:
    content = f.read()

# Fix 1: The blank screen issue. Change motion.div className to absolute inset-0 or min-h screen
content = content.replace(
    '          className="flex-1"',
    '          className="relative flex-1 flex flex-col min-h-[100dvh]"'
)

# Fix 2: Upgrade SetupScreen
setup_screen_old = """function SetupScreen({ onStart }: { onStart: (players: { name: string; photoUrl: string | null }[]) => void }) {
  const [names, setNames] = useState<string[]>(["", "", "", ""]);
  const [error, setError] = useState<string | null>(null);

  function update(i: number, v: string) {
    setNames((prev) => prev.map((n, idx) => (idx === i ? v : n)));
  }
  function addPlayer() {
    setNames((prev) => [...prev, ""]);
  }
  function removePlayer(i: number) {
    setNames((prev) => prev.filter((_, idx) => idx !== i));
  }
  function handleStart() {
    const valid = names.map((n) => n.trim()).filter(Boolean);
    if (valid.length < 4) return setError("Need at least 4 players.");
    if (new Set(valid.map((n) => n.toLowerCase())).size !== valid.length) {
      return setError("Player names must be unique.");
    }
    setError(null);
    onStart(valid.map((name) => ({ name, photoUrl: null })));
  }

  return (
    <main className="mx-auto w-full max-w-md space-y-4 px-5 py-4">
      <GlassPanel className="space-y-3">
        <h2 className="font-display text-lg uppercase text-ink">Add Players</h2>
        <p className="-mt-2 text-xs text-muted">
          Pass the phone around so everyone enters their name. Roles are dealt
          secretly after.
        </p>
        {names.map((name, i) => (
          <div key={i} className="flex items-center gap-2">
            <Avatar name={name || "?"} size={36} />
            <input
              value={name}
              onChange={(e) => update(i, e.target.value)}
              placeholder={`Player ${i + 1}`}
              className="flex-1 rounded-xl border border-white/15 bg-vice-night/60 px-3 py-2 text-ink outline-none focus:border-neon-teal"
            />
            {names.length > 4 && (
              <button onClick={() => removePlayer(i)} className="text-muted active:scale-90">
                ✕
              </button>
            )}
          </div>
        ))}
        <NeonButton variant="ghost" size="sm" fullWidth onClick={addPlayer} disabled={names.length >= 12}>
          + Add player
        </NeonButton>
      </GlassPanel>

      {error && <p className="text-center text-sm text-neon-pink neon-text">{error}</p>}

      <NeonButton variant="pink" size="lg" fullWidth glow onClick={handleStart}>
        Deal Roles →
      </NeonButton>
    </main>
  );
}"""

setup_screen_new = """function SetupScreen({ onStart }: { onStart: (players: { name: string; photoUrl: string | null }[], composition: Record<string, number>) => void }) {
  const [players, setPlayers] = useState<{name: string, photoUrl: string | null}[]>([
    {name: "", photoUrl: null},
    {name: "", photoUrl: null},
    {name: "", photoUrl: null},
    {name: "", photoUrl: null},
  ]);
  const [error, setError] = useState<string | null>(null);
  
  const [roles, setRoles] = useState({
    mafia: 1,
    doctor: 1,
    detective: 1,
    sheriff: 0,
    jester: 0,
  });

  function updateName(i: number, v: string) {
    setPlayers((prev) => prev.map((p, idx) => (idx === i ? { ...p, name: v } : p)));
  }

  function handlePhoto(i: number, e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const url = ev.target?.result as string;
      setPlayers((prev) => prev.map((p, idx) => (idx === i ? { ...p, photoUrl: url } : p)));
    };
    reader.readAsDataURL(file);
  }

  function addPlayer() {
    setPlayers((prev) => [...prev, {name: "", photoUrl: null}]);
  }
  function removePlayer(i: number) {
    setPlayers((prev) => prev.filter((_, idx) => idx !== i));
  }
  function handleStart() {
    const valid = players.filter(p => p.name.trim() !== "");
    if (valid.length < 4) return setError("Need at least 4 players.");
    if (new Set(valid.map((p) => p.name.toLowerCase())).size !== valid.length) {
      return setError("Player names must be unique.");
    }
    
    const specialCount = roles.mafia + roles.doctor + roles.detective + roles.sheriff + roles.jester;
    const civCount = valid.length - specialCount;
    if (civCount < 0) {
      return setError("Too many special roles for this player count!");
    }

    setError(null);
    onStart(valid.map(p => ({name: p.name.trim(), photoUrl: p.photoUrl})), roles);
  }

  return (
    <main className="mx-auto w-full max-w-md space-y-4 px-5 py-4">
      <GlassPanel className="space-y-3">
        <h2 className="font-display text-lg uppercase text-ink">Add Players</h2>
        <p className="-mt-2 text-xs text-muted">
          Pass the phone around so everyone enters their name and photo.
        </p>
        {players.map((p, i) => (
          <div key={i} className="flex items-center gap-2">
            <div className="relative">
              <Avatar name={p.name || "?"} photoUrl={p.photoUrl} size={36} />
              <input
                type="file"
                accept="image/*"
                onChange={(e) => handlePhoto(i, e)}
                className="absolute inset-0 z-10 w-full h-full opacity-0 cursor-pointer"
              />
            </div>
            <input
              value={p.name}
              onChange={(e) => updateName(i, e.target.value)}
              placeholder={`Player ${i + 1}`}
              className="flex-1 rounded-xl border border-white/15 bg-vice-night/60 px-3 py-2 text-ink outline-none focus:border-neon-teal"
            />
            {players.length > 4 && (
              <button onClick={() => removePlayer(i)} className="text-muted active:scale-90">
                ✕
              </button>
            )}
          </div>
        ))}
        <NeonButton variant="ghost" size="sm" fullWidth onClick={addPlayer} disabled={players.length >= 12}>
          + Add player
        </NeonButton>
      </GlassPanel>

      <GlassPanel className="space-y-3">
        <div className="mb-3 font-display text-xs uppercase tracking-[0.3em] text-muted">
          Role Settings
        </div>
        <div className="space-y-2">
          <RoleCounter label="Mafia" value={roles.mafia} onChange={(v) => setRoles(prev => ({...prev, mafia: v}))} />
          <RoleCounter label="Doctor" value={roles.doctor} onChange={(v) => setRoles(prev => ({...prev, doctor: v}))} />
          <RoleCounter label="Detective" value={roles.detective} onChange={(v) => setRoles(prev => ({...prev, detective: v}))} />
          <RoleCounter label="Sheriff" value={roles.sheriff} onChange={(v) => setRoles(prev => ({...prev, sheriff: v}))} />
          <RoleCounter label="Jester" value={roles.jester} onChange={(v) => setRoles(prev => ({...prev, jester: v}))} />
          
          {(() => {
            const specialCount = roles.mafia + roles.doctor + roles.detective + roles.sheriff + roles.jester;
            const civCount = players.length - specialCount;
            return (
              <>
                <div className="mt-2 flex items-center justify-between rounded-2xl bg-white/5 p-3 opacity-50">
                  <span className="font-display text-sm uppercase text-ink">Civilians</span>
                  <span className="w-4 text-center font-bold text-ink">{civCount}</span>
                </div>
              </>
            );
          })()}
        </div>
      </GlassPanel>

      {error && <p className="text-center text-sm text-neon-pink neon-text">{error}</p>}

      <NeonButton variant="pink" size="lg" fullWidth glow onClick={handleStart}>
        Deal Roles →
      </NeonButton>
    </main>
  );
}

function RoleCounter({ label, value, onChange }: { label: string; value: number; onChange: (v: number) => void; }) {
  return (
    <div className="flex items-center justify-between rounded-2xl bg-white/5 p-3">
      <span className="font-display text-sm uppercase text-ink">{label}</span>
      <div className="flex items-center gap-3">
        <button
          onClick={() => onChange(Math.max(0, value - 1))}
          className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/10 active:scale-95"
        >
          -
        </button>
        <span className="w-4 text-center font-bold text-ink">{value}</span>
        <button
          onClick={() => onChange(value + 1)}
          className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/10 active:scale-95"
        >
          +
        </button>
      </div>
    </div>
  );
}"""

# Fix the render of SetupScreen to pass composition
content = content.replace(
    '<SetupScreen onStart={(p) => dispatch({ type: "START", players: p })} />',
    '<SetupScreen onStart={(p, c) => dispatch({ type: "START", players: p, composition: c })} />'
)

content = content.replace(setup_screen_old, setup_screen_new)

with open("src/app/pass-and-play/page.tsx", "w") as f:
    f.write(content)

