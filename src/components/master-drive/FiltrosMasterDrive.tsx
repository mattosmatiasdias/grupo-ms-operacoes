// src/components/master-drive/FiltrosMasterDrive.tsx

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent } from '@/components/ui/card';
import { Filter, X, BookOpen } from 'lucide-react';
import { FiltrosMasterDrive, Colaborador, TipoTreinamento } from '@/types/masterDrive';
import { ColaboradorSearch } from './ColaboradorSearch';

interface FiltrosMasterDriveProps {
  filtros: FiltrosMasterDrive;
  setFiltros: (filtros: FiltrosMasterDrive) => void;
  colaboradores: Colaborador[];
  tiposTreinamento: TipoTreinamento[];
  onLimpar: () => void;
}

export const FiltrosMasterDrive = ({
  filtros,
  setFiltros,
  colaboradores,
  tiposTreinamento,
  onLimpar
}: FiltrosMasterDriveProps) => {
  const handleChange = (key: keyof FiltrosMasterDrive, value: string) => {
    setFiltros({ ...filtros, [key]: value || undefined });
  };

  return (
    <Card className="bg-slate-800/50 border-slate-700">
      <CardContent className="pt-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-slate-400" />
            <h3 className="text-sm font-medium text-slate-200">Filtros</h3>
          </div>
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={onLimpar}
            className="text-slate-400 hover:text-white hover:bg-slate-700"
          >
            <X className="h-3 w-3 mr-1" />
            Limpar
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          <div className="space-y-2">
            <Label className="text-xs text-slate-400">Data Início</Label>
            <Input
              type="date"
              value={filtros.dataInicio || ''}
              onChange={(e) => handleChange('dataInicio', e.target.value)}
              className="bg-slate-900 border-slate-700 text-white focus:border-blue-500"
            />
          </div>

          <div className="space-y-2">
            <Label className="text-xs text-slate-400">Data Fim</Label>
            <Input
              type="date"
              value={filtros.dataFim || ''}
              onChange={(e) => handleChange('dataFim', e.target.value)}
              className="bg-slate-900 border-slate-700 text-white focus:border-blue-500"
            />
          </div>

          <div className="space-y-2">
            <Label className="text-xs text-slate-400">Colaborador</Label>
            <ColaboradorSearch
              colaboradores={colaboradores}
              value={filtros.colaboradorId || ''}
              onChange={(value) => handleChange('colaboradorId', value)}
              placeholder="Todos os colaboradores"
            />
          </div>

          <div className="space-y-2">
            <Label className="text-xs text-slate-400">Tipo Treinamento</Label>
            <Select
              value={filtros.tipoTreinamentoId || ''}
              onValueChange={(v) => handleChange('tipoTreinamentoId', v)}
            >
              <SelectTrigger className="bg-slate-900 border-slate-700 text-white">
                <SelectValue placeholder="Todos" />
              </SelectTrigger>
              <SelectContent className="bg-slate-800 border-slate-700">
                {tiposTreinamento.map(tipo => (
                  <SelectItem key={tipo.id} value={tipo.id} className="text-slate-300">
                    {tipo.nome}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label className="text-xs text-slate-400 flex items-center gap-1">
              <BookOpen className="h-3 w-3" />
              Tópico
            </Label>
            <Input
              type="text"
              value={filtros.topico || ''}
              onChange={(e) => handleChange('topico', e.target.value)}
              placeholder="Digite para filtrar por tópico"
              className="bg-slate-900 border-slate-700 text-white focus:border-blue-500"
            />
          </div>

          <div className="space-y-2">
            <Label className="text-xs text-slate-400">Situação Desvio</Label>
            <Select
              value={filtros.situacaoDesvio || ''}
              onValueChange={(v) => handleChange('situacaoDesvio', v)}
            >
              <SelectTrigger className="bg-slate-900 border-slate-700 text-white">
                <SelectValue placeholder="Todos" />
              </SelectTrigger>
              <SelectContent className="bg-slate-800 border-slate-700">
                <SelectItem value="EM_ABERTO" className="text-slate-300">Em Aberto</SelectItem>
                <SelectItem value="TRATADO" className="text-slate-300">Tratado</SelectItem>
                <SelectItem value="CANCELADO" className="text-slate-300">Cancelado</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};