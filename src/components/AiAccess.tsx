import { createContext, useContext, type ReactNode } from 'react';
import type { UserWithPlan } from '../utils/plan';
export function canUseAI(user:UserWithPlan|null):boolean{return user?.role==='coach' && (user.platformAdmin===true || user.aiEnabled===true);}
const AiContext=createContext(false);
export function AiAccessProvider({user,children}:{user:UserWithPlan|null;children:ReactNode}){return <AiContext.Provider value={canUseAI(user)}>{children}</AiContext.Provider>;}
export function useAiAccess(){return useContext(AiContext);}
export function AiOnly({children}:{children:ReactNode}){return useAiAccess()?<>{children}</>:null;}
