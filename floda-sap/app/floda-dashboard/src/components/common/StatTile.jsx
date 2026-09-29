export default function StatTile({label,value,detail}){return <div className="stat"><span>{label}</span><strong>{value}</strong>{detail&&<small>{detail}</small>}</div>}
