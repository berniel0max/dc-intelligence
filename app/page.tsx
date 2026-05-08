import SupplyChainMap from '@/src/components/SupplyChainMap';
import IndustryOverview from '@/src/components/IndustryOverview';
import DataSourceNotice from '@/src/components/DataSourceNotice';

export default function Home() {
  return (
    <main className="min-h-screen px-6 py-10 sm:px-12" style={{ backgroundColor: '#0a0a0a' }}>
      <div className="max-w-[1400px] mx-auto">

        {/* Header */}
        <header className="mb-10">
          <div className="flex items-baseline gap-3 mb-1">
            <h1 className="text-2xl font-bold tracking-tight text-white">
              DC Intelligence
            </h1>
            <span
              className="text-xs font-semibold px-2 py-0.5 rounded"
              style={{ backgroundColor: '#b1ff5618', color: '#b1ff56', border: '1px solid #b1ff5630' }}
            >
              BETA
            </span>
          </div>
          <p className="text-sm" style={{ color: '#555' }}>
            AI infrastructure supply chain
          </p>
        </header>

        <DataSourceNotice />
        <IndustryOverview />
        <SupplyChainMap />

        <footer className="mt-12 pt-5" style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}>
          <p className="text-xs text-center" style={{ color: '#333' }}>
            Data is illustrative. Updated quarterly.
          </p>
        </footer>

      </div>
    </main>
  );
}
