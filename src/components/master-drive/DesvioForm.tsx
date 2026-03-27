// src/components/master-drive/DesvioForm.tsx

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
import { CalendarIcon, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Colaborador, Desvio } from '@/types/masterDrive';
import { ColaboradorSearch } from './ColaboradorSearch';

interface DesvioFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  colaboradores: Colaborador[];
  onSubmit: (data: Omit<Desvio, 'id' | 'created_at' | 'updated_at'>) => Promise<void>;
}

export const DesvioForm = ({
  open,
  onOpenChange,
  colaboradores,
  onSubmit
}: DesvioFormProps) => {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    colaborador_id: '',
    data_desvio: new Date(),
    descricao: '',
    tipo_desvio: '',
    responsavel: '',
    situacao: 'EM_ABERTO' as const
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.colaborador_id) {
      alert('Selecione um colaborador');
      return;
    }
    setLoading(true);

    try {
      await onSubmit({
        ...formData,
        data_desvio: format(formData.data_desvio, 'yyyy-MM-dd')
      });
      onOpenChange(false);
      setFormData({
        colaborador_id: '',
        data_desvio: new Date(),
        descricao: '',
        tipo_desvio: '',
        responsavel: '',
        situacao: 'EM_ABERTO'
      });
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-slate-800 border-slate-700 text-white max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-orange-400" />
            Registrar Desvio
          </DialogTitle>
          <DialogDescription className="text-slate-400">
            Registre ocorrências, acidentes ou falhas operacionais
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Colaborador com busca */}
            <div className="space-y-2 md:col-span-2">
              <Label className="text-slate-300">Colaborador *</Label>
              <ColaboradorSearch
                colaboradores={colaboradores}
                value={formData.colaborador_id}
                onChange={(value) => setFormData({ ...formData, colaborador_id: value })}
                placeholder="Buscar colaborador..."
                required
              />
            </div>

            <div className="space-y-2">
              <Label className="text-slate-300">Data do Desvio *</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal bg-slate-900 border-slate-700 text-white hover:bg-slate-800",
                      !formData.data_desvio && "text-slate-400"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {formData.data_desvio ? (
                      format(formData.data_desvio, "dd/MM/yyyy", { locale: ptBR })
                    ) : (
                      <span>Selecione uma data</span>
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0 bg-slate-800 border-slate-700">
                  <Calendar
                    mode="single"
                    selected={formData.data_desvio}
                    onSelect={(date) => date && setFormData({ ...formData, data_desvio: date })}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>

            <div className="space-y-2">
              <Label className="text-slate-300">Tipo de Desvio</Label>
              <Select
                value={formData.tipo_desvio}
                onValueChange={(v) => setFormData({ ...formData, tipo_desvio: v })}
              >
                <SelectTrigger className="bg-slate-900 border-slate-700 text-white">
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent className="bg-slate-800 border-slate-700">
                  <SelectItem value="Colisão">Colisão</SelectItem>
                  <SelectItem value="Falha Mecânica">Falha Mecânica</SelectItem>
                  <SelectItem value="Operacional">Operacional</SelectItem>
                  <SelectItem value="Manobra">Manobra</SelectItem>
                  <SelectItem value="Velocidade">Velocidade</SelectItem>
                  <SelectItem value="Outro">Outro</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="text-slate-300">Responsável</Label>
              <Input
                value={formData.responsavel}
                onChange={(e) => setFormData({ ...formData, responsavel: e.target.value })}
                className="bg-slate-900 border-slate-700 text-white"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-slate-300">Descrição *</Label>
            <Textarea
              value={formData.descricao}
              onChange={(e) => setFormData({ ...formData, descricao: e.target.value })}
              rows={4}
              required
              className="bg-slate-900 border-slate-700 text-white"
            />
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="border-slate-600 text-slate-400 hover:text-white hover:bg-slate-700"
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={loading} className="bg-orange-600 hover:bg-orange-700">
              {loading ? "Salvando..." : "Registrar Desvio"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};