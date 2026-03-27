// src/components/master-drive/ColaboradorMultiSelect.tsx

import { useState, useEffect, useRef } from 'react';
import { Check, ChevronsUpDown, User, Search, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Colaborador } from '@/types/masterDrive';

interface ColaboradorMultiSelectProps {
  colaboradores: Colaborador[];
  value: string[]; // Array de IDs selecionados
  onChange: (value: string[]) => void;
  placeholder?: string;
  disabled?: boolean;
  required?: boolean;
  className?: string;
}

export const ColaboradorMultiSelect = ({
  colaboradores,
  value,
  onChange,
  placeholder = "Selecionar colaboradores...",
  disabled = false,
  required = false,
  className
}: ColaboradorMultiSelectProps) => {
  const [open, setOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filteredColaboradores, setFilteredColaboradores] = useState<Colaborador[]>(colaboradores);
  const containerRef = useRef<HTMLDivElement>(null);

  const selectedColaboradores = colaboradores.filter(col => value.includes(col.id));

  // Filtrar colaboradores baseado no termo de busca
  useEffect(() => {
    if (searchTerm.trim() === '') {
      setFilteredColaboradores(colaboradores);
    } else {
      const term = searchTerm.toLowerCase();
      const filtered = colaboradores.filter(col => 
        !value.includes(col.id) && (
          col.nome_completo.toLowerCase().includes(term) ||
          col.funcao_atual.toLowerCase().includes(term) ||
          (col.matricula && col.matricula.toLowerCase().includes(term))
        )
      );
      setFilteredColaboradores(filtered);
    }
  }, [searchTerm, colaboradores, value]);

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
    if (!value.includes(colaboradorId)) {
      onChange([...value, colaboradorId]);
    }
    setSearchTerm('');
  };

  const handleRemove = (colaboradorId: string) => {
    onChange(value.filter(id => id !== colaboradorId));
  };

  const handleClear = () => {
    onChange([]);
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
          "w-full justify-start min-h-10 bg-slate-950 border-slate-700 text-white hover:bg-slate-800 hover:text-white",
          value.length === 0 && "text-slate-400",
          required && value.length === 0 && "border-red-500/50",
          className
        )}
      >
        <div className="flex flex-wrap items-center gap-1.5 flex-1">
          {selectedColaboradores.length === 0 ? (
            <span className="text-slate-400">{placeholder}</span>
          ) : (
            selectedColaboradores.map(col => (
              <Badge
                key={col.id}
                variant="secondary"
                className="bg-slate-800 hover:bg-slate-700 text-slate-200 gap-1"
              >
                {col.nome_completo.split(' ')[0]}
                <X
                  className="h-3 w-3 cursor-pointer hover:text-red-400"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleRemove(col.id);
                  }}
                />
              </Badge>
            ))
          )}
        </div>
        <div className="flex items-center gap-1 ml-2">
          {value.length > 0 && (
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
        <div className="absolute z-50 mt-1 w-full bg-slate-900 border border-slate-700 rounded-md shadow-lg overflow-hidden">
          <div className="p-2 border-b border-slate-700">
            <div className="relative">
              <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
              <Input
                type="text"
                placeholder="Buscar colaborador..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-8 bg-slate-950 border-slate-700 text-white text-sm"
                autoFocus
              />
            </div>
          </div>
          <div className="max-h-64 overflow-y-auto">
            {filteredColaboradores.length === 0 ? (
              <div className="py-6 text-center text-sm text-slate-400">
                {searchTerm ? 'Nenhum colaborador encontrado.' : 'Todos os colaboradores já estão selecionados.'}
              </div>
            ) : (
              filteredColaboradores.map((col) => (
                <div
                  key={col.id}
                  onClick={() => handleSelect(col.id)}
                  className="flex items-start gap-2 px-3 py-2 cursor-pointer hover:bg-slate-800 transition-colors"
                >
                  <User className="mt-0.5 h-4 w-4 text-slate-500" />
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