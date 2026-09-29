export const score=v=>Number(v||0).toFixed(2); export const date=v=>v?new Date(v).toLocaleString(): '—'; export const pct=v=>`${Math.round(Number(v||0)*100)}%`
