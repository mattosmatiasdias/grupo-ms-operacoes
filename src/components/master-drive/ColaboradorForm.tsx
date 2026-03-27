// src/components/master-drive/ColaboradorForm.tsx

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { UserPlus } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface ColaboradorFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export const ColaboradorForm = ({ open, onOpenChange, onSuccess }: ColaboradorFormProps) => {
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const [formData, setFormData] = useState({
    nome_completo: '',
    funcao_atual: '',
    cpf: '',
    matricula: ''
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.nome_completo.trim()) {
      toast({ title: "Erro", description: "Nome é obrigatório", variant: "destructive" });
      return;
    }
    if (!formData.funcao_atual.trim()) {
      toast({ title: "Erro", description: "Função é obrigatória", variant: "destructive" });
      return;
    }

    setLoading(true);

    try {
      const { error } = await supabase
        .from('colaboradores')
        .insert([{
          nome_completo: formData.nome_completo,
          funcao_atual: formData.funcao_atual,
          cpf: formData.cpf || null,
          matricula: formData.matricula || null,
          ativo: true
        }]);

      if (error) throw error;

      toast({ title: "Sucesso", description: "Colaborador cadastrado com sucesso!" });
      onSuccess();
      onOpenChange(false);
      setFormData({ nome_completo: '', funcao_atual: '', cpf: '', matricula: '' });
    } catch (error: any) {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-slate-900 border-slate-800 text-white max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="h-5 w-5 text-emerald-400" />
            Novo Colaborador
          </DialogTitle>
          <DialogDescription className="text-slate-400">
            Preencha os dados do novo colaborador
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label className="text-slate-300">Nome Completo *</Label>
            <Input
              value={formData.nome_completo}
              onChange={(e) => setFormData({ ...formData, nome_completo: e.target.value })}
              placeholder="Digite o nome completo"
              required
              className="bg-slate-950 border-slate-700 text-white"
            />
          </div>

          <div className="space-y-2">
            <Label className="text-slate-300">Função *</Label>
            <Input
              value={formData.funcao_atual}
              onChange={(e) => setFormData({ ...formData, funcao_atual: e.target.value })}
              placeholder="Ex: Truck, Pipa, Carreteiro, Mecânico"
              required
              className="bg-slate-950 border-slate-700 text-white"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-slate-300">CPF</Label>
              <Input
                value={formData.cpf}
                onChange={(e) => setFormData({ ...formData, cpf: e.target.value })}
                placeholder="000.000.000-00"
                className="bg-slate-950 border-slate-700 text-white"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-slate-300">Matrícula</Label>
              <Input
                value={formData.matricula}
                onChange={(e) => setFormData({ ...formData, matricula: e.target.value })}
                placeholder="Número de matrícula"
                className="bg-slate-950 border-slate-700 text-white"
              />
            </div>
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
            <Button type="submit" disabled={loading} className="bg-emerald-600 hover:bg-emerald-700">
              {loading ? "Cadastrando..." : "Cadastrar"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};