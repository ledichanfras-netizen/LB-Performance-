import { Zap } from 'lucide-react';

type MethodAction = { label: string; description: string; onClick: () => void };
export type MethodGroup = { title: string; methods: MethodAction[] };

export function AdvancedMethodsCard({ groups }: { groups: MethodGroup[] }) {
  const total = groups.reduce((count, group) => count + group.methods.length, 0);
  return (
    <section className="advanced-methods-master-card" aria-label="Métodos avançados">
      <header className="lb-methods-header">
        <span className="lb-methods-icon"><Zap size={21} aria-hidden="true" /></span>
        <div><div className="lb-methods-heading"><h5>Métodos avançados</h5><span className="lb-methods-count">{total} métodos</span></div><p>Adicione um método e ajuste a prescrição ao seu atleta.</p></div>
      </header>
      <div className="lb-methods-groups">{groups.map(group => (
        <div key={group.title}><h6>{group.title}</h6><div className="lb-methods-actions">{group.methods.map(method => (
          <button key={method.label} type="button" className="lb-method-button" onClick={method.onClick} title={method.description}>{method.label}</button>
        ))}</div></div>
      ))}</div>
    </section>
  );
}
