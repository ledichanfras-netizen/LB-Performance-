import {useEffect,type RefObject} from 'react';
export function useAccessibleDialog(ref:RefObject<HTMLElement>,onClose:()=>void){
 useEffect(()=>{
  const el=ref.current;if(!el)return;
  const previous=document.activeElement as HTMLElement|null;
  const focusable=()=>Array.from(el.querySelectorAll<HTMLElement>('button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),a[href],[tabindex="0"]')).filter(x=>x.getClientRects().length>0);
  (focusable()[0]||el).focus();
  const key=(e:KeyboardEvent)=>{
   if(e.key==='Escape'){e.preventDefault();e.stopPropagation();onClose();return;}
   if(e.key!=='Tab')return;
   const items=focusable(),first=items[0],last=items.at(-1);
   if(!first){e.preventDefault();el.focus();return;}
   if(e.shiftKey&&(document.activeElement===first||!el.contains(document.activeElement))){e.preventDefault();last?.focus();}
   else if(!e.shiftKey&&(document.activeElement===last||!el.contains(document.activeElement))){e.preventDefault();first.focus();}
  };
  document.addEventListener('keydown',key,true);
  return()=>{document.removeEventListener('keydown',key,true);if(previous?.isConnected)previous.focus();};
 },[ref,onClose]);
}
