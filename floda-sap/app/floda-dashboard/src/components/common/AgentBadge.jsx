import {Badge} from '../ui';import{agentLabel}from '../../utils/agentColors';export default function AgentBadge({actor}){return <Badge kind="agent">{agentLabel(actor)}</Badge>}
