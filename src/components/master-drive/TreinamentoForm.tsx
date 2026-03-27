// src/components/master-drive/TreinamentoForm.tsx

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { CalendarIcon, Users, Plus, BookOpen } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Colaborador, TipoTreinamento } from '@/types/masterDrive';
import { ColaboradorMultiSelect } from './ColaboradorMultiSelect';
import { ColaboradorForm } from './ColaboradorForm';

interface TreinamentoFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  colaboradores: Colaborador[];
  tiposTreinamento: TipoTreinamento[];
  onSubmit: (data: any, participantes: string[]) => Promise<void>;
  onColaboradorCadastrado: () => void;
}

export const TreinamentoForm = ({
  open,
  onOpenChange,
  colaboradores,
  tiposTreinamento,
  onSubmit,
  onColaboradorCadastrado
}: TreinamentoFormProps) => {
  const [loading, setLoading] = useState(false);
  const [colaboradorFormOpen, setColaboradorFormOpen] = useState(false);
  const [formData, setFormData] = useState({
    tipo_treinamento_id: '',
    topico_treinamento: '', // Agora é texto
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

  // Calcular total de horas baseado no número de participantes
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
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
      await onSubmit({
        ...formData,
        data_treinamento: format(formData.data_treinamento, 'yyyy-MM-dd'),
        carga_horaria_base: formData.carga_horaria_base
      }, participantesIds);
      
      onOpenChange(false);
      setFormData({
        tipo_treinamento_id: '',
        topico_treinamento: '',
        equipamento: '',
        data_treinamento: new Date(),
        carga_horaria_base: '',
        instrutor: '',
        local: '',
        observacoes: ''
      });
      setParticipantesIds([]);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const totalHoras = calcularTotalHoras();

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="bg-slate-900 border-slate-800 text-white max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Registrar Treinamento</DialogTitle>
            <DialogDescription className="text-slate-400">
              Preencha os dados do treinamento e selecione os participantes
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-slate-300">Data *</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal bg-slate-950 border-slate-700 text-white",
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
                  <PopoverContent className="w-auto p-0 bg-slate-900 border-slate-700">
                    <Calendar
                      mode="single"
                      selected={formData.data_treinamento}
                      onSelect={(date) => date && setFormData({ ...formData, data_treinamento: date })}
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
                  className="bg-slate-950 border-slate-700 text-white"
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
                  <SelectTrigger className="bg-slate-950 border-slate-700 text-white">
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-900 border-slate-700">
                    {tiposTreinamento.map(tipo => (
                      <SelectItem key={tipo.id} value={tipo.id}>
                        {tipo.nome}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Tópico - Campo de texto livre com sugestões */}
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
                  list="topicos-sugeridos"
                  className="bg-slate-950 border-slate-700 text-white"
                />
                <datalist id="topicos-sugeridos">
                  {topicosSugeridos.map((topico, index) => (
                    <option key={index} value={topico} />
                  ))}
                </datalist>
                <p className="text-xs text-slate-500">
                  Você pode digitar qualquer tópico ou escolher uma sugestão
                </p>
              </div>

              <div className="space-y-2">
                <Label className="text-slate-300">Equipamento</Label>
                <Input
                  value={formData.equipamento}
                  onChange={(e) => setFormData({ ...formData, equipamento: e.target.value })}
                  placeholder="Ex: Caminhão Basculante"
                  className="bg-slate-950 border-slate-700 text-white"
                />
              </div>

              <div className="space-y-2">
                <Label className="text-slate-300">Instrutor</Label>
                <Input
                  value={formData.instrutor}
                  onChange={(e) => setFormData({ ...formData, instrutor: e.target.value })}
                  className="bg-slate-950 border-slate-700 text-white"
                />
              </div>

              <div className="space-y-2">
                <Label className="text-slate-300">Local</Label>
                <Input
                  value={formData.local}
                  onChange={(e) => setFormData({ ...formData, local: e.target.value })}
                  className="bg-slate-950 border-slate-700 text-white"
                />
              </div>
            </div>

            {/* Seleção de Participantes */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-slate-300 flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  Participantes *
                </Label>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setColaboradorFormOpen(true)}
                  className="text-emerald-400 hover:text-emerald-300"
                >
                  <Plus className="h-3 w-3 mr-1" />
                  Novo Colaborador
                </Button>
              </div>
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
                className="bg-slate-950 border-slate-700 text-white"
              />
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                className="border-slate-700 text-slate-400 hover:text-white"
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={loading} className="bg-blue-600 hover:bg-blue-700">
                {loading ? "Salvando..." : "Registrar Treinamento"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Modal de cadastro de colaborador */}
      <ColaboradorForm
        open={colaboradorFormOpen}
        onOpenChange={setColaboradorFormOpen}
        onSuccess={() => {
          onColaboradorCadastrado();
          setColaboradorFormOpen(false);
        }}
      />
    </>
  );
};