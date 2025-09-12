// src/pages/NovoNavio.tsx
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ArrowLeft } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';

const NovoNavio = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();
  const [isSaving, setIsSaving] = useState(false);
  const [formData, setFormData] = useState({
    nome_navio: '',
    carga: '',
    berco: '',
    quantidade_prevista: '',
    cbs_total: '',
    inicio_operacao: '',
    final_operacao: '',
    media_cb: '',
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { id, value } = e.target;
    setFormData(prev => ({ ...prev, [id]: value.toUpperCase() }));
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.nome_navio || !user) {
      toast({ title: "Erro", description: "O nome do navio é obrigatório.", variant: "destructive" });
      return;
    }
    setIsSaving(true);
    try {
      const { error } = await supabase.from('navios').insert({
        nome_navio: formData.nome_navio.toUpperCase(),
        carga: formData.carga || null,
        berco: formData.berco || null,
        quantidade_prevista: formData.quantidade_prevista ? parseFloat(formData.quantidade_prevista) : null,
        cbs_total: formData.cbs_total ? parseInt(formData.cbs_total) : null,
        inicio_operacao: formData.inicio_operacao || null,
        final_operacao: formData.final_operacao || null,
        media_cb: formData.media_cb ? parseFloat(formData.media_cb) : null,
        user_id: user.id,
        concluido: false,
      });
      if (error) throw error;
      toast({ title: "Sucesso!", description: "Navio/Viagem registrada." });
      navigate('/navios');
    } catch (error) {
      toast({ title: "Erro", description: "Não foi possível salvar a viagem.", variant: "destructive" });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="min-h-screen" style={{ background: 'var(--gradient-primary)' }}>
      <div className="flex items-center p-4 text-white">
        <Button variant="ghost" onClick={() => navigate('/navios')} className="text-white hover:bg-white/20 mr-4"><ArrowLeft className="h-5 w-5" /></Button>
        <h1 className="text-xl font-bold">Cadastrar Novo Navio/Viagem</h1>
      </div>
      <div className="p-4">
        <form onSubmit={handleSave}>
          <Card>
            <CardHeader><CardTitle>Dados da Viagem</CardTitle></CardHeader>
            <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="nome_navio">Nome do Navio*</Label>
                <Input 
                  id="nome_navio" 
                  value={formData.nome_navio} 
                  onChange={handleChange} 
                  required 
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="carga">Carga</Label>
                <Input 
                  id="carga" 
                  value={formData.carga} 
                  onChange={handleChange} 
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="berco">Berço</Label>
                <Input 
                  id="berco" 
                  value={formData.berco} 
                  onChange={handleChange} 
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="quantidade_prevista">Quantidade Prevista</Label>
                <Input 
                  id="quantidade_prevista" 
                  type="number" 
                  step="0.01" 
                  value={formData.quantidade_prevista} 
                  onChange={handleChange} 
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="cbs_total">Total de CBs</Label>
                <Input 
                  id="cbs_total" 
                  type="number" 
                  value={formData.cbs_total} 
                  onChange={handleChange} 
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="media_cb">Média por CB</Label>
                <Input 
                  id="media_cb" 
                  type="number" 
                  step="0.0001" 
                  value={formData.media_cb} 
                  onChange={handleChange} 
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="inicio_operacao">Início da Operação</Label>
                <Input 
                  id="inicio_operacao" 
                  type="datetime-local" 
                  value={formData.inicio_operacao} 
                  onChange={handleChange} 
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="final_operacao">Final da Operação</Label>
                <Input 
                  id="final_operacao" 
                  type="datetime-local" 
                  value={formData.final_operacao} 
                  onChange={handleChange} 
                />
              </div>
              <div className="sm:col-span-2">
                <Button type="submit" className="w-full mt-4" disabled={isSaving}>{isSaving ? 'Salvando...' : 'Salvar Viagem'}</Button>
              </div>
            </CardContent>
          </Card>
        </form>
      </div>
    </div>
  );
};

export default NovoNavio;