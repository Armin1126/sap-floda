import { cn } from '../../utils/cn'
export const Card=({className='',children})=><section className={cn('card',className)}>{children}</section>
export const Button=({className='',variant='primary',...p})=><button className={cn('btn',`btn-${variant}`,className)} {...p}/>
export const Badge=({className='',kind='neutral',children})=><span className={cn('badge',`badge-${kind}`,className)}>{children}</span>
export const Skeleton=({className=''})=><div className={cn('skeleton',className)}/>
