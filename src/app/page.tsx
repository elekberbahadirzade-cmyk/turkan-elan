"use client";

import React, { useEffect, useMemo, useState } from "react";

// ---- Types
type Source = "bina" | "tap";
interface Listing {
  id: string;
  title: string;
  price: number;
  region: string;
  owner: boolean;
  source: Source;
  url: string;
  img: string;
  date: string;
}

/** Hydration problemlərini aradan qaldırmaq üçün client-only wrapper */
function ClientOnly({ children }: { children: React.ReactNode }) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  if (!mounted) return null;
  return <>{children}</>;
}

function AppCore() {
  // ---- UI State
  const [email, setEmail] = useState("");
  const [minPrice, setMinPrice] = useState(0);
  const [maxPrice, setMaxPrice] = useState(4000);
  const [region, setRegion] = useState<string[]>(["Türkan"]);
  const [ownerOnly, setOwnerOnly] = useState(true);
  const [sources, setSources] = useState<Record<Source, boolean>>({
    bina: true,
    tap: true,
  });
  const [sendReady, setSendReady] = useState(false);
  const [query, setQuery] = useState("");

  // ---- Axtarış state-ləri
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [results, setResults] = useState<Listing[] | null>(null);

  // ---- Demo data (fallback)
  const mockListings = useMemo<Listing[]>(
    () => [
      {
        id: "b1",
        title: "Torpaq sahəsi (demo)",
        price: 3500,
        region: "Türkan",
        owner: true,
        source: "bina",
        url: "#",
        img: "https://images.unsplash.com/photo-1500382017468-9049fed747ef?q=80&w=800&auto=format&fit=crop",
        date: "2025-10-29",
      },
      {
        id: "t1",
        title: "Torpaq sahəsi, təcili (demo)",
        price: 2800,
        region: "Türkan",
        owner: true,
        source: "tap",
        url: "#",
        img: "https://images.unsplash.com/photo-1599824701905-81daab7c99be?q=80&w=800&auto=format&fit=crop",
        date: "2025-10-30",
      },
    ],
    []
  );

  // UI filter-ləri mock üzərinə də tətbiq edək (results olmayanda)
  const filtered = useMemo(() => {
    return mockListings
      .filter((x) => (sources.bina || sources.tap ? sources[x.source] : true))
      .filter((x) => (ownerOnly ? x.owner : true))
      .filter((x) =>
        region.length
          ? region.some((r) => x.region.toLowerCase().includes(r.toLowerCase()))
          : true
      )
      .filter((x) => x.price >= minPrice && x.price <= maxPrice)
      .filter((x) =>
        query ? x.title.toLowerCase().includes(query.toLowerCase()) : true
      )
      .sort((a, b) => (a.date < b.date ? 1 : -1));
  }, [mockListings, ownerOnly, region, minPrice, maxPrice, sources, query]);

  // Nəticə olaraq ekranda nə göstərək?
  const listingsToShow = results && results.length > 0 ? results : filtered;
  const uniqueCount = listingsToShow.length;

  // ---- Torpaq axtarış düyməsi
  const onSearchLand = async () => {
    try {
      setLoading(true);
      setError(null);
      setResults(null);

      const res = await fetch("/api/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "land", // yalnız torpaq
          region,
          ownerOnly,
          minPrice,
          maxPrice,
          sources, // {bina, tap}
          query,   // əlavə açar söz
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Axtarışda xəta baş verdi");

      // Gələn nəticələri Listing formatına salırıq
      const mapped: Listing[] = (data?.items || []).map((x: any, i: number) => ({
        id: x.id ?? `${x.source}-${i}`,
        title: x.title ?? "Torpaq sahəsi",
        price: Number(x.price ?? 0),
        region: x.region ?? (region[0] || "Türkan"),
        owner: Boolean(x.owner ?? true),
        source: (x.source === "tap" ? "tap" : "bina") as Source,
        url: x.url ?? "#",
        img:
          x.img ??
          "https://images.unsplash.com/photo-1500382017468-9049fed747ef?q=80&w=800&auto=format&fit=crop",
        date: x.date ?? "",
      }));

      setResults(mapped);
    } catch (e: any) {
      setError(e?.message || "Xəta");
    } finally {
      setLoading(false);
    }
  };

  // ---- Mail göndərmək (hazır backend /api/send varsa işləyəcək)
  const onSend = async () => {
    if (!sendReady) {
      alert("Zəhmət olmasa əvvəlcə 'Elanlar göndərilsin' seçimindən istifadə edin.");
      return;
    }
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      alert("Düzgün e-poçt daxil edin.");
      return;
    }
    if (uniqueCount === 0) {
      alert("Göndəriləcək uyğun elan tapılmadı.");
      return;
    }

    try {
      const res = await fetch("/api/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          filters: { region, minPrice, maxPrice, ownerOnly, sources, query },
          items: listingsToShow.map(
            ({ id, title, price, region, source, url, img, date, owner }) => ({
              id,
              title,
              price,
              region,
              source,
              url,
              img,
              date,
              owner,
            })
          ),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Mail xətası");
      alert("Göndərildi ✅");
    } catch (err: any) {
      console.error(err);
      alert("Göndərmək alınmadı ❌ " + (err?.message || ""));
    }
  };

  const toggleSource = (key: Source) =>
    setSources((s) => ({ ...s, [key]: !s[key] }));

  // ---- UI
  return (
    <div className="min-h-screen w-full bg-neutral-950 text-white text-slate-50 relative overflow-hidden selection:bg-red-500/30 selection:text-white">
      <div className="pointer-events-none fixed inset-0 -z-10">
        <div className="absolute -top-32 -left-32 h-96 w-96 rounded-full bg-red-500/20 blur-3xl" />
        <div className="absolute bottom-0 right-0 h-[28rem] w-[28rem] rounded-full bg-red-700/20 blur-3xl" />
        <div className="absolute inset-0 bg-[radial-gradient(50%_50%_at_50%_0%,rgba(255,255,255,0.06)_0%,rgba(0,0,0,0)_60%)]" />
      </div>

      <div className="mx-auto max-w-7xl px-4 py-6 md:py-10">
        {/* Header */}
        <header className="mb-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-2xl bg-white/10 backdrop-blur ring-1 ring-white/15" />
            <h1 className="text-xl font-semibold tracking-tight md:text-2xl">
              Türkan Elan Takip
            </h1>
          </div>
          <div className="text-xs md:text-sm text-slate-300">
            Sürətli · Minimal · Fərqli görünüş
          </div>
        </header>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-12 md:gap-6">
          {/* Sol panel */}
          <section className="md:col-span-4 rounded-3xl bg-white/5 backdrop-blur-xl p-4 md:p-6 shadow-2xl ring-1 ring-white/10 shadow-[0_0_40px_-10px_rgba(239,68,68,0.35)]">
            <h2 className="mb-4 text-lg font-semibold">Ayarlar</h2>

            {/* Mail */}
            <div className="mb-3">
              <label className="mb-2 block text-sm text-slate-200">
                Göndəriləcək e-poçt
              </label>
              <input
                type="email"
                placeholder="ornek@mail.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-xl border border-white/10 bg-white/10 px-3 py-2 text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-red-400/70"
              />
            </div>

            {/* Torpaq axtar */}
            <button
              onClick={onSearchLand}
              className="mb-3 w-full rounded-2xl bg-white/10 px-4 py-3 text-sm font-semibold text-slate-200 ring-1 ring-white/15 hover:bg-white/20 disabled:opacity-60"
              disabled={loading}
            >
              {loading ? "Axtarılır..." : "Torpaq axtar"}
            </button>

            {/* Min/Max Qiymət */}
            <div className="mb-4 grid grid-cols-2 gap-3">
              <div>
                <label className="mb-2 block text-sm text-slate-200">
                  Min qiymət
                </label>
                <input
                  type="number"
                  min={0}
                  value={minPrice}
                  onChange={(e) => setMinPrice(Number(e.target.value))}
                  className="w-full rounded-xl border border-white/10 bg-white/10 px-3 py-2 text-slate-100 focus:outline-none focus:ring-2 focus:ring-red-400/70"
                />
              </div>
              <div>
                <label className="mb-2 block text-sm text-slate-200">
                  Max qiymət
                </label>
                <input
                  type="number"
                  min={0}
                  value={maxPrice}
                  onChange={(e) => setMaxPrice(Number(e.target.value))}
                  className="w-full rounded-xl border border-white/10 bg-white/10 px-3 py-2 text-slate-100 focus:outline-none focus:ring-2 focus:ring-red-400/70"
                />
              </div>
            </div>

            {/* Region */}
            <div className="mb-4">
              <label className="mb-2 block text-sm text-slate-200">Ərazi</label>
              <select
                multiple
                value={region}
                onChange={(e) =>
                  setRegion(Array.from(e.target.selectedOptions, (o) => o.value))
                }
                className="w-full rounded-xl border border-white/10 bg-black/40 px-3 py-2 text-red-200 focus:ring-2 focus:ring-red-500/70"
              >
                <option value="Türkan">Türkan</option>
                <option value="Buzovna">Buzovna</option>
                <option value="Zabrat">Zabrat</option>
              </select>
            </div>

            {/* Yalnız sahibindən */}
            <div className="mb-4 flex items-center justify-between rounded-2xl border border-white/10 bg-white/5 backdrop-blur-xl p-3">
              <div>
                <div className="text-sm font-medium">Yalnız sahibindən</div>
                <div className="text-xs text-slate-300">
                  Makler elanlarını gizlət
                </div>
              </div>
              <button
                onClick={() => setOwnerOnly((v) => !v)}
                className={`relative h-7 w-14 rounded-full transition-all ${
                  ownerOnly ? "bg-red-500/90" : "bg-slate-600"
                }`}
                aria-pressed={ownerOnly}
              >
                <span
                  className={`absolute top-1/2 -translate-y-1/2 h-5 w-5 rounded-full bg-white shadow transition-all ${
                    ownerOnly ? "left-8" : "left-2"
                  }`}
                />
              </button>
            </div>

            {/* Mənbələr */}
            <div className="mb-4">
              <div className="mb-2 text-sm font-medium">Mənbələr</div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setSources((s) => ({ ...s, bina: !s.bina }))}
                  className={`rounded-xl px-3 py-2 text-sm ring-1 transition ${
                    sources.bina
                      ? "bg-red-500/20 ring-red-400/50"
                      : "bg-white/5 ring-white/10"
                  }`}
                >
                  bina.az
                </button>
                <button
                  onClick={() => setSources((s) => ({ ...s, tap: !s.tap }))}
                  className={`rounded-xl px-3 py-2 text-sm ring-1 transition ${
                    sources.tap
                      ? "bg-red-500/20 ring-red-400/50"
                      : "bg-white/5 ring-white/10"
                  }`}
                >
                  Tap.az
                </button>
              </div>
            </div>

            {/* Axtarış (əlavə açar söz) */}
            <div className="mb-5">
              <label className="mb-2 block text-sm text-slate-200">Axtarış</label>
              <input
                type="text"
                placeholder="məs: çıxarışlı, əsas yola yaxın..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="w-full rounded-xl border border-white/10 bg-white/10 px-3 py-2 text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-red-400/70"
              />
            </div>

            {/* Göndərmə toggle + düymə */}
            <div className="mb-4 flex items-center justify-between rounded-2xl border border-white/10 bg-white/5 backdrop-blur-xl p-3">
              <div>
                <div className="text-sm font-medium">Elanlar göndərilsin</div>
                <div className="text-xs text-slate-300">
                  Tapılan uyğun elanlar seçilən mail-ə
                </div>
              </div>
              <button
                onClick={() => setSendReady((v) => !v)}
                className={`relative h-7 w-14 rounded-full transition-all ${
                  sendReady ? "bg-red-500/90" : "bg-slate-600"
                }`}
                aria-pressed={sendReady}
              >
                <span
                  className={`absolute top-1/2 -translate-y-1/2 h-5 w-5 rounded-full bg-white shadow transition-all ${
                    sendReady ? "left-8" : "left-2"
                  }`}
                />
              </button>
            </div>

            <button
              onClick={onSend}
              className="w-full rounded-2xl bg-red-500/90 px-4 py-3 text-sm font-semibold text-slate-900 shadow-lg shadow-red-500/30 transition hover:bg-red-400"
            >
              Göndər ({uniqueCount})
            </button>
          </section>

          {/* Sağ panel: nəticələr */}
          <section className="md:col-span-8 rounded-3xl bg-white/5 backdrop-blur-xl p-4 md:p-6 shadow-2xl ring-1 ring-white/10 shadow-[0_0_40px_-10px_rgba(239,68,68,0.35)]">
            {error && (
              <div className="mb-4 rounded-xl border border-red-500/40 bg-red-500/10 p-3 text-sm text-red-200">
                {error}
              </div>
            )}

            <div className="mb-4 flex items-end justify-between gap-2">
              <div>
                <h2 className="text-lg font-semibold">Tapılan elanlar</h2>
                <div className="text-xs text-slate-300">
                  {results ? "Backend nəticələri" : "Demo filtrlənmiş nəticələr"}
                </div>
              </div>
              <div className="text-sm text-slate-200">
                {loading ? "Axtarılır..." : `${uniqueCount} nəticə`}
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
              {listingsToShow.map((x) => (
                <article
                  key={x.id}
                  className="group overflow-hidden rounded-2xl border border-white/10 bg-white/5 backdrop-blur-xl transition hover:border-red-500/70 hover:bg-red-500/10 shadow-[0_0_40px_-10px_rgba(239,68,68,0.35)]"
                >
                  <div className="relative h-40 w-full overflow-hidden">
                    <img
                      src={x.img}
                      alt={x.title}
                      className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                    />
                    <div className="absolute left-3 top-3 rounded-full bg-black/50 px-2 py-1 text-xs">
                      {x.source === "bina" ? "bina.az" : "Tap.az"}
                    </div>
                  </div>
                  <div className="space-y-2 p-3">
                    <div className="flex items-center justify-between">
                      <h3 className="line-clamp-1 text-sm font-medium">
                        {x.title}
                      </h3>
                      <span className="rounded-lg bg-red-500/20 px-2 py-1 text-xs text-red-300">
                        ₼{x.price}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-xs text-slate-300">
                      <span>{x.region}</span>
                      <span className={x.owner ? "text-red-300" : "text-amber-300"}>
                        {x.owner ? "Sahibindən" : "Makler"}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-[11px] text-slate-400">
                      <span>{x.date}</span>
                      <a
                        href={x.url}
                        className="underline decoration-dotted underline-offset-4 hover:text-slate-200"
                        target="_blank"
                        rel="noreferrer"
                      >
                        Orijinal elan
                      </a>
                    </div>
                  </div>
                </article>
              ))}
            </div>

            {uniqueCount === 0 && !loading && (
              <div className="mt-8 rounded-2xl border border-white/10 bg-white/5 backdrop-blur-xl p-6 text-center text-sm text-slate-300">
                Uyğun elan tapılmadı. Filtrləri dəyişməyi yoxlayın.
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}

export default function Page() {
  return (
    <ClientOnly>
      <AppCore />
    </ClientOnly>
  );
}
