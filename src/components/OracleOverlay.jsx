const OracleOverlay = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  const moods = [
    { label: 'Brain Mush', icon: '🥴' },
    { label: 'Adrenaline', icon: '🍿' },
    { label: 'Mind-Bending', icon: '🧠' },
    { label: 'Sick Day', icon: '🤒' }
  ];

  return (
    <div className="fixed inset-0 z-[100] flex items-start justify-center bg-black/90 p-4 pt-[15vh] backdrop-blur-xl">
      <div className="w-full max-w-xl rounded-2xl border border-white/10 bg-zinc-950 p-6 shadow-2xl">
        <div className="mb-6">
          <h2 className="text-xl font-bold text-white flex items-center gap-2">✨ The Oracle</h2>
          <p className="text-sm text-zinc-500">What are we watching tonight, Josh?</p>
        </div>

        <div className="grid grid-cols-2 gap-3 mb-6">
          {moods.map((m) => (
            <button key={m.label} className="flex flex-col items-start rounded-xl bg-zinc-900/50 p-4 hover:bg-zinc-800 transition-all hover:scale-[1.02] border border-white/5">
              <span className="text-2xl mb-1">{m.icon}</span>
              <span className="font-bold text-xs uppercase text-zinc-300">{m.label}</span>
            </button>
          ))}
        </div>

        <button onClick={onClose} className="w-full py-2 text-xs font-bold text-zinc-600 hover:text-white uppercase tracking-widest transition-colors">
          Close [Esc]
        </button>
      </div>
    </div>
  );
};

export default OracleOverlay;
