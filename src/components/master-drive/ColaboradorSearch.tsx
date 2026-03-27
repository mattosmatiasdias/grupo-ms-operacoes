// src/components/master-drive/ColaboradorSearch.tsx

import { useState, useEffect, useRef } from 'react';
import { Check, ChevronsUpDown, User, Search, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Colaborador } from '@/types/masterDrive';

interface ColaboradorSearchProps {
  colaboradores: Colaborador[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  required?: boolean;
  className?: string;
}

export const ColaboradorSearch = ({
  colaboradores,
  value,
  onChange,
  placeholder = "Buscar colaborador...",
  disabled = false,
  required = false,
  className
}: ColaboradorSearchProps) => {
  const [open, setOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filteredColaboradores, setFilteredColaboradores] = useState<Colaborador[]>(colaboradores);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const selectedColaborador = colaboradores.find(col => col.id === value);

  // Filtrar colaboradores baseado no termo de busca
  useEffect(() => {
    if (searchTerm.trim() === '') {
      setFilteredColaboradores(colaboradores);
    } else {
      const term = searchTerm.toLowerCase();
      const filtered = colaboradores.filter(col => 
        col.nome_completo.toLowerCase().includes(term) ||
        col.funcao_atual.toLowerCase().includes(term) ||
        (col.matricula && col.matricula.toLowerCase().includes(term))
      );
      setFilteredColaboradores(filtered);
    }
  }, [searchTerm, colaboradores]);

  // Fechar ao clicar fora
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false);
        setSearchTerm('');
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelect = (colaboradorId: string) => {
    onChange(colaboradorId === value ? '' : colaboradorId);
    setOpen(false);
    setSearchTerm('');
  };

  const handleClear = () => {
    onChange('');
    setSearchTerm('');
  };

  return (
    <div ref={containerRef} className={cn("relative", className)}>
      <Button
        type="button"
        variant="outline"
        disabled={disabled}
        onClick={() => setOpen(!open)}
        className={cn(
          "w-full justify-between bg-slate-900 border-slate-700 text-white hover:bg-slate-800 hover:text-white",
          !value && "text-slate-400",
          required && !value && "border-red-500/50",
          className
        )}
      >
        <div className="flex items-center gap-2 truncate">
          <User className="h-4 w-4 shrink-0 text-slate-500" />
          <span className="truncate">
            {selectedColaborador
              ? `${selectedColaborador.nome_completo} (${selectedColaborador.funcao_atual})`
              : placeholder}
          </span>
        </div>
        <div className="flex items-center gap-1">
          {value && (
            <X
              className="h-4 w-4 opacity-50 hover:opacity-100 cursor-pointer"
              onClick={(e) => {
                e.stopPropagation();
                handleClear();
              }}
            />
          )}
          <ChevronsUpDown className="h-4 w-4 shrink-0 opacity-50" />
        </div>
      </Button>

      {open && (
        <div className="absolute z-50 mt-1 w-full bg-slate-800 border border-slate-700 rounded-md shadow-lg overflow-hidden">
          <div className="p-2 border-b border-slate-700">
            <div className="relative">
              <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
              <Input
                ref={inputRef}
                type="text"
                placeholder="Digite para buscar..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-8 bg-slate-900 border-slate-700 text-white text-sm"
                autoFocus
              />
            </div>
          </div>
          <div className="max-h-64 overflow-y-auto">
            {filteredColaboradores.length === 0 ? (
              <div className="py-6 text-center text-sm text-slate-400">
                Nenhum colaborador encontrado.
              </div>
            ) : (
              filteredColaboradores.map((col) => (
                <div
                  key={col.id}
                  onClick={() => handleSelect(col.id)}
                  className={cn(
                    "flex items-start gap-2 px-3 py-2 cursor-pointer hover:bg-slate-700 transition-colors",
                    value === col.id && "bg-slate-700/50"
                  )}
                >
                  <Check
                    className={cn(
                      "mt-0.5 h-4 w-4 shrink-0",
                      value === col.id ? "opacity-100 text-emerald-400" : "opacity-0"
                    )}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-white text-sm truncate">
                      {col.nome_completo}
                    </div>
                    <div className="text-xs text-slate-400">
                      {col.funcao_atual}
                      {col.matricula && ` • ${col.matricula}`}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};