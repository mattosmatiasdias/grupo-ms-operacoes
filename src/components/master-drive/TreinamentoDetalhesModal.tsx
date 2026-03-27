// src/components/master-drive/TreinamentoDetalhesModal.tsx

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { 
  CalendarIcon, 
  Clock, 
  Users, 
  BookOpen, 
  Truck, 
  User, 
  MapPin, 
  Edit, 
  Save, 
  X,
  Trash2,
  AlertTriangle
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Treinamento, Colaborador, TipoTreinamento } from '@/types/masterDrive';
import { ColaboradorMultiSelect } from './ColaboradorMultiSelect';

interface TreinamentoDetalhesModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  treinamento: (Treinamento & { participantes?: Colaborador[] }) | null;
  tiposTreinamento: TipoTreinamento[];
  colaboradores: Colaborador[];
  onSave: (updatedData: any, participantesIds: string[]) => Promise<void>;
  onDelete?: () => Promise<void>;
}

export const TreinamentoDetalhesModal = ({
  open,
  onOpenChange,
  treinamento,
  tiposTreinamento,
  colaboradores,
  onSave,
  onDelete
}: TreinamentoDetalhesModalProps) => {
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [datePickerOpen, setDatePickerOpen] = useState(false);
  
  const [formData, setFormData] = useState({
    tipo_treinamento_id: '',
    topico_treinamento: '',
    equipamento: '',
    data_treinamento: new Date(),
    carga_horaria_base: '',
    instrutor: '',
    local: '',
    observacoes: ''
  });
  
  const [participantesIds, setParticipantesIds] = useState<string[]>([]);

  // Sugestões de tópicos comuns
  const topicosSugeridos = [
    'Limite de Velocidade',
    'Condução Veicular Segura e Eficaz',
    'Obrigatoriedade da Utilização dos Calços de Rodas',
    'Segurança no Transporte de Contêineres',
    'Manuseio Correto de Disco e Aparelho de Tacógrafo',
    'Controle de Velocidade e Frenagem',
    'Condução em Espaço Confinado',
    'Regeneração do Sistema ARLA 32',
    'Uso Correto do Tacômetro',
    'Preenchimento Correto de Check List',
    'Aplicação, Uso e Manuseio Correto de Pneus',
    'Transposição de Lombadas',
    'Cuidados com a Suspensão',
    'Condução Econômica',
    'Direção Defensiva'
  ];

  // Função para formatar data para exibição sem timezone
  const formatarDataExibicao = (dataString: string): string => {
    if (!dataString) return '';
    const [ano, mes, dia] = dataString.split('-');
    const data = new Date(parseInt(ano), parseInt(mes) - 1, parseInt(dia));
    return format(data, "dd 'de' MMMM 'de' yyyy", { locale: ptBR });
  };

  const formatarDataSimples = (dataString: string): string => {
    if (!dataString) return '';
    const [ano, mes, dia] = dataString.split('-');
    return `${dia}/${mes}/${ano}`;
  };

  // Carregar dados do treinamento quando abrir
  useEffect(() => {
    if (treinamento && open) {
      // Converter a string YYYY-MM-DD para Date sem timezone
      const [ano, mes, dia] = treinamento.data_treinamento.split('-');
      const dataObj = new Date(parseInt(ano), parseInt(mes) - 1, parseInt(dia));
      
      setFormData({
        tipo_treinamento_id: treinamento.tipo_treinamento_id || '',
        topico_treinamento: treinamento.topico_treinamento || '',
        equipamento: treinamento.equipamento || '',
        data_treinamento: dataObj,
        carga_horaria_base: treinamento.carga_horaria_base || '',
        instrutor: treinamento.instrutor || '',
        local: treinamento.local || '',
        observacoes: treinamento.observacoes || ''
      });
      setParticipantesIds(treinamento.participantes?.map(p => p.id) || []);
    }
  }, [treinamento, open]);

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

  const calcularTotalHoras = () => {
    if (!formData.carga_horaria_base || participantesIds.length === 0) return '00:00:00';
    const partes = formData.carga_horaria_base.split(':');
    const horasBase = parseInt(partes[0]) || 0;
    const minutosBase = parseInt(partes[1]) || 0;
    
    const totalMinutos = (horasBase * 60 + minutosBase) * participantesIds.length;
    const horasTotal = Math.floor(totalMinutos / 60);
    const minutosTotal = totalMinutos % 60;
    return `${horasTotal.toString().padStart(2, '0')}:${minutosTotal.toString().padStart(2, '0')}:00`;
  };

  const handleSave = async () => {
    if (!formData.tipo_treinamento_id) {
      alert('Selecione o tipo de treinamento');
      return;
    }
    if (!formData.topico_treinamento.trim()) {
      alert('Informe o tópico do treinamento');
      return;
    }
    if (!formData.carga_horaria_base) {
      alert('Informe a carga horária base');
      return;
    }
    if (participantesIds.length === 0) {
      alert('Selecione pelo menos um participante');
      return;
    }

    setLoading(true);
    try {
      await onSave({
        ...formData,
        data_treinamento: format(formData.data_treinamento, 'yyyy-MM-dd'),
        carga_horaria_base: formData.carga_horaria_base,
        id: treinamento?.id
      }, participantesIds);
      setIsEditing(false);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    setLoading(true);
    try {
      await onDelete?.();
      onOpenChange(false);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
      setShowDeleteConfirm(false);
    }
  };

  const totalHoras = calcularTotalHoras();

  if (!treinamento) return null;

  // Função para abreviar nome do tipo para exibição (opcional, mas mantemos completo no modal)
  const getTipoNome = (tipo: any) => {
    return tipo?.nome || 'Treinamento';
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-slate-800 border-slate-700 text-white max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="flex items-center gap-2">
              {isEditing ? (
                <>
                  <Edit className="h-5 w-5 text-blue-400" />
                  Editar Treinamento
                </>
              ) : (
                <>
                  <BookOpen className="h-5 w-5 text-blue-400" />
                  Detalhes do Treinamento
                </>
              )}
            </DialogTitle>
            {!isEditing && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsEditing(true)}
                className="text-blue-400 hover:text-blue-300 hover:bg-blue-500/10"
              >
                <Edit className="h-4 w-4 mr-1" />
                Editar
              </Button>
            )}
          </div>
          <DialogDescription className="text-slate-400">
            {isEditing 
              ? 'Edite os dados do treinamento e os participantes'
              : 'Visualize as informações do treinamento realizado'}
          </DialogDescription>
        </DialogHeader>

        {/* Modo Visualização */}
        {!isEditing ? (
          <div className="space-y-6">
            {/* Header com tipo e data - exibindo nome completo */}
            <div className="flex items-center gap-3 flex-wrap">
              <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/30 px-3 py-1">
                {getTipoNome(treinamento.tipo_treinamento)}
              </Badge>
              <div className="flex items-center gap-1 text-slate-400">
                <CalendarIcon className="h-4 w-4" />
                <span className="text-sm">
                  {formatarDataExibicao(treinamento.data_treinamento)}
                </span>
              </div>
            </div>

            {/* Tópico */}
            <div>
              <Label className="text-slate-400 text-xs uppercase font-semibold">Tópico</Label>
              <p className="text-white text-lg font-medium mt-1">{treinamento.topico_treinamento}</p>
            </div>

            {/* Informações principais */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-slate-400 text-xs uppercase font-semibold flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  Carga Horária (por colaborador)
                </Label>
                <p className="text-emerald-400 font-medium mt-1">
                  {formatarIntervalo(treinamento.carga_horaria_base)}
                </p>
              </div>
              <div>
                <Label className="text-slate-400 text-xs uppercase font-semibold flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  Total de Horas
                </Label>
                <p className="text-amber-400 font-medium mt-1">
                  {formatarIntervalo(treinamento.carga_horaria_total)}
                </p>
              </div>
              <div>
                <Label className="text-slate-400 text-xs uppercase font-semibold flex items-center gap-1">
                  <Users className="h-3 w-3" />
                  Participantes
                </Label>
                <p className="text-blue-400 font-medium mt-1">
                  {treinamento.qtd_participantes} colaborador(es)
                </p>
              </div>
              {treinamento.equipamento && (
                <div>
                  <Label className="text-slate-400 text-xs uppercase font-semibold flex items-center gap-1">
                    <Truck className="h-3 w-3" />
                    Equipamento
                  </Label>
                  <p className="text-white mt-1">{treinamento.equipamento}</p>
                </div>
              )}
              {treinamento.instrutor && (
                <div>
                  <Label className="text-slate-400 text-xs uppercase font-semibold flex items-center gap-1">
                    <User className="h-3 w-3" />
                    Instrutor
                  </Label>
                  <p className="text-white mt-1">{treinamento.instrutor}</p>
                </div>
              )}
              {treinamento.local && (
                <div>
                  <Label className="text-slate-400 text-xs uppercase font-semibold flex items-center gap-1">
                    <MapPin className="h-3 w-3" />
                    Local
                  </Label>
                  <p className="text-white mt-1">{treinamento.local}</p>
                </div>
              )}
            </div>

            {/* Lista de participantes */}
            <div>
              <Label className="text-slate-400 text-xs uppercase font-semibold mb-2 block">
                Lista de Participantes
              </Label>
              <div className="bg-slate-700/30 rounded-lg p-3 space-y-2 max-h-60 overflow-y-auto">
                {treinamento.participantes && treinamento.participantes.length > 0 ? (
                  treinamento.participantes.map((participante, idx) => (
                    <div key={idx} className="flex items-center justify-between py-2 border-b border-slate-600 last:border-0">
                      <div>
                        <p className="text-white text-sm font-medium">{participante.nome_completo}</p>
                        <p className="text-xs text-slate-400">{participante.funcao_atual}</p>
                      </div>
                      <Badge variant="outline" className="border-slate-600 text-slate-300 text-xs">
                        {formatarIntervalo(treinamento.carga_horaria_base)}
                      </Badge>
                    </div>
                  ))
                ) : (
                  <p className="text-slate-500 text-center py-4">Nenhum participante registrado</p>
                )}
              </div>
            </div>

            {treinamento.observacoes && (
              <div>
                <Label className="text-slate-400 text-xs uppercase font-semibold">Observações</Label>
                <p className="text-slate-300 mt-1 text-sm bg-slate-700/30 p-3 rounded-lg">
                  {treinamento.observacoes}
                </p>
              </div>
            )}
          </div>
        ) : (
          // Modo Edição
          <form onSubmit={(e) => { e.preventDefault(); handleSave(); }} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-slate-300">Data *</Label>
                <Popover open={datePickerOpen} onOpenChange={setDatePickerOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal bg-slate-900 border-slate-700 text-white hover:bg-slate-800",
                        !formData.data_treinamento && "text-slate-400"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {formData.data_treinamento ? (
                        format(formData.data_treinamento, "dd/MM/yyyy", { locale: ptBR })
                      ) : (
                        <span>Selecione uma data</span>
                      )}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0 bg-slate-800 border-slate-700">
                    <Calendar
                      mode="single"
                      selected={formData.data_treinamento}
                      onSelect={(date) => {
                        if (date) {
                          setFormData({ ...formData, data_treinamento: date });
                          setDatePickerOpen(false);
                        }
                      }}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>

              <div className="space-y-2">
                <Label className="text-slate-300">Carga Horária (por colaborador) *</Label>
                <Input
                  value={formData.carga_horaria_base}
                  onChange={(e) => setFormData({ ...formData, carga_horaria_base: e.target.value })}
                  placeholder="HH:MM:SS"
                  required
                  className="bg-slate-900 border-slate-700 text-white"
                />
                {participantesIds.length > 0 && (
                  <p className="text-xs text-emerald-400 mt-1">
                    Total: {totalHoras} ({participantesIds.length} participantes × {formData.carga_horaria_base})
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label className="text-slate-300">Tipo de Treinamento *</Label>
                <Select
                  value={formData.tipo_treinamento_id}
                  onValueChange={(v) => setFormData({ ...formData, tipo_treinamento_id: v })}
                  required
                >
                  <SelectTrigger className="bg-slate-900 border-slate-700 text-white">
                    <SelectValue placeholder="Selecione" />
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
                <Label className="text-slate-300 flex items-center gap-2">
                  <BookOpen className="h-4 w-4" />
                  Tópico *
                </Label>
                <Input
                  value={formData.topico_treinamento}
                  onChange={(e) => setFormData({ ...formData, topico_treinamento: e.target.value })}
                  placeholder="Digite o tópico do treinamento"
                  required
                  list="topicos-sugeridos-edit"
                  className="bg-slate-900 border-slate-700 text-white"
                />
                <datalist id="topicos-sugeridos-edit">
                  {topicosSugeridos.map((topico, index) => (
                    <option key={index} value={topico} />
                  ))}
                </datalist>
              </div>

              <div className="space-y-2">
                <Label className="text-slate-300">Equipamento</Label>
                <Input
                  value={formData.equipamento}
                  onChange={(e) => setFormData({ ...formData, equipamento: e.target.value })}
                  placeholder="Ex: Caminhão Basculante"
                  className="bg-slate-900 border-slate-700 text-white"
                />
              </div>

              <div className="space-y-2">
                <Label className="text-slate-300">Instrutor</Label>
                <Input
                  value={formData.instrutor}
                  onChange={(e) => setFormData({ ...formData, instrutor: e.target.value })}
                  className="bg-slate-900 border-slate-700 text-white"
                />
              </div>

              <div className="space-y-2">
                <Label className="text-slate-300">Local</Label>
                <Input
                  value={formData.local}
                  onChange={(e) => setFormData({ ...formData, local: e.target.value })}
                  className="bg-slate-900 border-slate-700 text-white"
                />
              </div>
            </div>

            {/* Seleção de Participantes */}
            <div className="space-y-2">
              <Label className="text-slate-300 flex items-center gap-2">
                <Users className="h-4 w-4" />
                Participantes *
              </Label>
              <ColaboradorMultiSelect
                colaboradores={colaboradores}
                value={participantesIds}
                onChange={setParticipantesIds}
                placeholder="Selecione os colaboradores que participaram"
                required
              />
              {participantesIds.length > 0 && (
                <p className="text-xs text-slate-400">
                  {participantesIds.length} colaborador(es) selecionado(s)
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label className="text-slate-300">Observações</Label>
              <Textarea
                value={formData.observacoes}
                onChange={(e) => setFormData({ ...formData, observacoes: e.target.value })}
                rows={3}
                className="bg-slate-900 border-slate-700 text-white"
              />
            </div>

            <DialogFooter className="flex justify-between">
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setShowDeleteConfirm(true)}
                  className="text-red-400 hover:text-red-300 hover:bg-red-500/10"
                >
                  <Trash2 className="h-4 w-4 mr-1" />
                  Excluir
                </Button>
              </div>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsEditing(false)}
                  className="border-slate-600 text-slate-400 hover:text-white hover:bg-slate-700"
                >
                  <X className="h-4 w-4 mr-1" />
                  Cancelar
                </Button>
                <Button type="submit" disabled={loading} className="bg-blue-600 hover:bg-blue-700">
                  <Save className="h-4 w-4 mr-1" />
                  {loading ? "Salvando..." : "Salvar Alterações"}
                </Button>
              </div>
            </DialogFooter>
          </form>
        )}

        {/* Confirmar exclusão */}
        <Dialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
          <DialogContent className="bg-slate-800 border-slate-700 text-white max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-red-400">
                <AlertTriangle className="h-5 w-5" />
                Confirmar Exclusão
              </DialogTitle>
              <DialogDescription className="text-slate-400">
                Tem certeza que deseja excluir este treinamento? Esta ação não pode ser desfeita.
              </DialogDescription>
            </DialogHeader>
            <div className="bg-slate-700/30 p-3 rounded-lg">
              <p className="text-white font-medium">{treinamento.topico_treinamento}</p>
              <p className="text-sm text-slate-400">
                {formatarDataSimples(treinamento.data_treinamento)} • {treinamento.qtd_participantes} participantes
              </p>
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setShowDeleteConfirm(false)}
                className="border-slate-600 text-slate-400 hover:text-white hover:bg-slate-700"
              >
                Cancelar
              </Button>
              <Button
                onClick={handleDelete}
                disabled={loading}
                className="bg-red-600 hover:bg-red-700"
              >
                {loading ? "Excluindo..." : "Sim, Excluir"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </DialogContent>
    </Dialog>
  );
};