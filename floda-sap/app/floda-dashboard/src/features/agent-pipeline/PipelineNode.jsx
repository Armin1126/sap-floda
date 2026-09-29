export default function PipelineNode({ icon: Icon, label, active }) {
  return (
    <div className={`node-wrap ${active ? 'active' : ''}`}>
      <div className="node">{Icon && <Icon size={22} />}</div>
      <b>{label}</b>
    </div>
  );
}

