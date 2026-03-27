// src/components/master-drive/TreinamentoCard.tsx

import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  Clock, 
  Users, 
  BookOpen, 
  Truck, 
  User, 
  MapPin,
  Edit,
  Trash2,
  ChevronRight
} from 'lucide-react';
import { Treinamento, Colaborador } from '@/types/masterDrive';

interface TreinamentoCardProps {
  treinamento: Treinamento & { participantes?: Colaborador[] };
  onClick?: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
}

export const TreinamentoCard = ({ 
  treinamento, 
  onClick, 
  onEdit, 
  onDelete 
}: TreinamentoCardProps) => {
  const formatarIntervalo = (intervalo: string): string => {
    if (!intervalo) return '00:00';
    const parts = intervalo.split(':');
    if (parts.length === 3) {
      const horas = parseInt(parts[0]);
      const minutos = parseInt(parts[1]);
      if (horas > 0) {
        return `${horas}h ${minutos}min`;
      }
      return `${minutos}min`;
    }
    return intervalo;
  };

  // Função para formatar data sem timezone
  const formatarData = (dataString: string): string => {
    if (!dataString) return '';
    const [ano, mes, dia] = dataString.split('-');
    return `${dia}/${mes}/${ano}`;
  };

  // Função para abreviar nome do tipo (opcional, para não ocupar muito espaço)
  const abreviarTipo = (nome: string): string => {
    if (!nome) return 'Treinamento';
    // Abreviações comuns
    if (nome === 'TEÓRICO (INTERNO MS)') return 'TEÓRICO (INT)';
    if (nome === 'PRÁTICO (INTERNO MS)') return 'PRÁTICO (INT)';
    if (nome === 'TEÓRICO (EXTERNO FORN)') return 'TEÓRICO (EXT)';
    if (nome === 'PRÁTICO (EXTERNO FORN)') return 'PRÁTICO (EXT)';
    return nome;
  };

  const getTipoColor = (tipoNome: string) => {
    if (tipoNome?.includes('TEÓRICO')) return 'bg-blue-600/30 text-blue-300 border-blue-500/50';
    if (tipoNome?.includes('PRÁTICO')) return 'bg-emerald-600/30 text-emerald-300 border-emerald-500/50';
    return 'bg-slate-600/30 text-slate-300 border-slate-500/50';
  };

  const tipoNomeCompleto = treinamento.tipo_treinamento?.nome || 'Treinamento';
  const tipoNomeAbreviado = abreviarTipo(tipoNomeCompleto);

  return (
    <Card 
      className="bg-slate-800/60 border-slate-700 hover:border-blue-500/50 hover:shadow-lg hover:shadow-blue-500/10 transition-all cursor-pointer group"
      onClick={onClick}
    >
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2 flex-wrap">
              <Badge 
                className={getTipoColor(treinamento.tipo_treinamento?.nome || '')}
                title={tipoNomeCompleto}
              >
                {tipoNomeAbreviado}
              </Badge>
              <Badge variant="outline" className="border-slate-600 text-slate-300">
                {formatarData(treinamento.data_treinamento)}
              </Badge>
            </div>
            <div className="flex items-start gap-2">
              <BookOpen className="h-4 w-4 text-blue-400 mt-0.5 shrink-0" />
              <h3 className="text-white font-medium text-base leading-tight">
                {treinamento.topico_treinamento}
              </h3>
            </div>
          </div>
          <ChevronRight className="h-5 w-5 text-slate-500 group-hover:text-blue-400 transition-colors" />
        </div>
      </CardHeader>

      <CardContent className="pt-2 space-y-3">
        {/* Informações principais */}
        <div className="grid grid-cols-2 gap-3">
          <div className="flex items-center gap-2 text-sm text-slate-300">
            <Clock className="h-4 w-4 text-emerald-400" />
            <span>
              {formatarIntervalo(treinamento.carga_horaria_base)}/colab
            </span>
          </div>
          <div className="flex items-center gap-2 text-sm text-slate-300">
            <Users className="h-4 w-4 text-blue-400" />
            <span>
              {treinamento.qtd_participantes} participante(s)
            </span>
          </div>
        </div>

        {/* Informações adicionais */}
        <div className="space-y-2 pt-1">
          {treinamento.equipamento && (
            <div className="flex items-center gap-2 text-xs text-slate-400">
              <Truck className="h-3 w-3" />
              <span>{treinamento.equipamento}</span>
            </div>
          )}
          
          {treinamento.instrutor && (
            <div className="flex items-center gap-2 text-xs text-slate-400">
              <User className="h-3 w-3" />
              <span>Instrutor: {treinamento.instrutor}</span>
            </div>
          )}
          
          {treinamento.local && (
            <div className="flex items-center gap-2 text-xs text-slate-400">
              <MapPin className="h-3 w-3" />
              <span>{treinamento.local}</span>
            </div>
          )}
        </div>

        {/* Participantes preview */}
        {treinamento.participantes && treinamento.participantes.length > 0 && (
          <div className="flex flex-wrap gap-1 pt-2 border-t border-slate-700/50">
            {treinamento.participantes.slice(0, 4).map((participante, idx) => (
              <Badge key={idx} variant="secondary" className="bg-slate-700 text-slate-300 text-xs">
                {participante.nome_completo?.split(' ')[0]}
              </Badge>
            ))}
            {treinamento.participantes.length > 4 && (
              <Badge variant="secondary" className="bg-slate-700 text-slate-300 text-xs">
                +{treinamento.participantes.length - 4}
              </Badge>
            )}
          </div>
        )}

        {/* Total de horas */}
        <div className="flex justify-end pt-2">
          <div className="text-xs font-medium px-2 py-1 rounded bg-amber-500/20 text-amber-300">
            Total: {formatarIntervalo(treinamento.carga_horaria_total)}
          </div>
        </div>

        {/* Botões de ação (aparecem no hover) */}
        <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
          <Button
            variant="ghost"
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              onEdit?.();
            }}
            className="h-7 px-2 text-slate-400 hover:text-blue-400 hover:bg-blue-500/10"
          >
            <Edit className="h-3.5 w-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              onDelete?.();
            }}
            className="h-7 px-2 text-slate-400 hover:text-red-400 hover:bg-red-500/10"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};