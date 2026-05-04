import { Globe, BarChart3, ListChecks, Info, Rocket, Calendar } from 'lucide-react';
import InfoCard from '../components/InfoCard';

export default function Step1({ data, onRefresh, loading }) {
  if (!data && !loading) return null;

  if (loading) {
    return (
      <div className="flex-center" style={{ padding: '4rem', minHeight: '400px' }}>
        <div className="spinner"></div>
        <p style={{ marginTop: '1.5rem', color: 'var(--text-secondary)', fontWeight: 500 }}>正在判斷品牌身份、主題與差異點...</p>
      </div>
    );
  }

  return (
    <div className="animate-fade-in">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem', gap: '1rem' }}>
        <div>
          <h2 className="outfit" style={{ margin: 0 }}>Step 1｜品牌與主題判斷</h2>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '0.4rem' }}>來源網址：{data.sourceUrl}</p>
        </div>
        <button type="button" onClick={() => onRefresh(1, data.sourceUrl)} className="step-item" style={{ background: 'rgba(255,255,255,0.05)' }}>
          <Calendar size={14} style={{ marginRight: '6px' }} /> 重新分析
        </button>
      </div>

      <div className="grid-30">
        <InfoCard title="1. 品牌身份" content={data.brandIdentity} icon={<Globe size={20} />} />
        <InfoCard title="2. 核心產品/服務/內容" content={data.offerings} icon={<BarChart3 size={20} />} />
        <InfoCard title="3. AI 歸類主題/品類/情境" content={data.categories} icon={<ListChecks size={20} />} />
        <InfoCard title="4. 使用者角色" content={data.audiences} icon={<Info size={20} />} />
        <InfoCard title="5. 競品差異點" content={data.differentiation} icon={<Rocket size={20} />} />
        <InfoCard title="6. 判斷依據" content={data.evidence} icon={<Info size={20} />} />
      </div>
    </div>
  );
}
