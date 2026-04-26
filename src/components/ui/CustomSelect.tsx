import React, { useState, useEffect, useRef } from 'react';
import { ChevronDown } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../../lib/utils';

export function CustomSelect({ 
  value, 
  onChange, 
  options, 
  placeholder, 
  disabled, 
  className 
}: { 
  value: string; 
  onChange: (val: string) => void; 
  options: { value: string; label: string }[]; 
  placeholder: string; 
  disabled?: boolean; 
  className?: string; 
}) {
  const [isOpen, setIsOpen] = useState(false);
  const selectRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (selectRef.current && !selectRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const selectedOption = options.find(o => o.value === value || o.value === String(value));
  
  return (
    <div className={cn("relative", className)} ref={selectRef}>
      <div 
        className={cn("glass-input flex items-center justify-between cursor-pointer font-bold select-none", disabled && "opacity-30 cursor-not-allowed")}
        onClick={() => !disabled && setIsOpen(!isOpen)}
      >
         <span className="truncate">{selectedOption ? selectedOption.label : placeholder}</span>
         <ChevronDown className={cn("w-4 h-4 ml-2 opacity-50 flex-shrink-0 transition-transform", isOpen && "rotate-180")} />
      </div>
      
      <AnimatePresence>
      {isOpen && !disabled && (
        <motion.div
           initial={{ opacity: 0, y: -10 }}
           animate={{ opacity: 1, y: 0 }}
           exit={{ opacity: 0, y: -10 }}
           transition={{ duration: 0.15 }}
           className="absolute z-50 w-full mt-2 py-2 bg-[color:var(--bg-secondary)] border border-[color:var(--glass-border)] rounded-xl shadow-2xl max-h-60 overflow-y-auto"
        >
           {options.map(opt => (
             <div
               key={opt.value}
               className={cn(
                 "px-4 py-2.5 cursor-pointer hover:bg-white/10 transition-colors text-sm text-[color:var(--text-primary)]",
                 value === opt.value && "bg-white/10 font-bold"
               )}
               onClick={() => {
                  onChange(opt.value);
                  setIsOpen(false);
               }}
             >
               {opt.label}
             </div>
           ))}
        </motion.div>
      )}
      </AnimatePresence>
    </div>
  );
}
