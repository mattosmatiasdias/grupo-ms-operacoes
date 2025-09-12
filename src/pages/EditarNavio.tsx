// src/pages/EditarNavio.tsx
import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from "@/components/ui/switch";
import { ArrowLeft } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

const EditarNavio = () => {
  const { id: navioId } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [isSaving, setIsSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [formData, setFormData] = useState<any>({});

  const fetchNavio = useCallback(async () => {
    if (!navioId) return;
    setLoading(true);
    const { data, error } = await supabase.from('navios').select('*').eq('id', navioId).single();
    if (error || !data) {
      toast({ title: "Erro", description: "Navio não encontrado.", variant: "destructive" });
      navigate('/navios');
    } else {
      data.inicio_operacao = data.inicio_operacao ? new Date(data.inicio_operacao).toISOString().slice(0, 16) : '';
      data.final_operacao = data.final_operacao ? new Date(data.final_operacao).toISOString().slice(0, 16) : '';
      setFormData({
        ...data,
        nome_navio: data.nome_navio?.toUpperCase() || '',
        carga: data.carga?.toUpperCase() || '',
        berco: data.berco?.toUpperCase() || '',
      });
    }
    setLoading(false);
  }, [navioId, navigate, toast]);

  useEffect(() => {
    fetchNavio();
  }, [fetchNavio]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { id, value } = e.target;
    // Converte para maiúsculas imediatamente
    setFormData(prev => ({ ...prev, [id]: value.toUpperCase() }));
  };

  const handleSwitchChange = (checked: boolean) => {
    setFormData(prev => ({ ...prev, concluido: checked }));
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!navioId) return;
    setIsSaving(true);
    try {
      const { id, created_at, updated_at, user_id, ...updateData } = formData;
      // *** CORREÇÃO APLICADA AQUI ***
      // Converte campos de data vazios para null antes de enviar
      if (updateData.inicio_operacao === '') {
        updateData.inicio_operacao = null;
      }
      if (updateData.final_operacao === '') {
        updateData.final_operacao = null;
      }
      const { error } = await supabase.from('navios').update(updateData).eq('id', navioId);
      if (error) throw error;
      toast({ title: "Sucesso!", description: "Dados do navio atualizados." });
      navigate('/navios');
    } catch (error) {
      console.error("Erro ao atualizar dados:", error);
      toast({ title: "Erro", description: (error as Error).message || "Não foi possível atualizar os dados.", variant: "destructive" });
    } finally {
      setIsSaving(false);
    }
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--gradient-primary)' }}><p className="text-white">Carregando dados do navio...</p></div>;

  return (
    <div className="min-h-screen" style={{ background: 'var(--gradient-primary)' }}>
      <div className="flex items-center p-4 text-white">
        <Button variant="ghost" onClick={() => navigate('/navios')} className="text-white hover:bg-white/20 mr-4"><ArrowLeft className="h-5 w-5" /></Button>
        <h1 className="text-xl font-bold">Editar Viagem: {formData.nome_navio}</h1>
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
                  value={formData.nome_navio || ''} 
                  onChange={handleChange} 
                  required 
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="carga">Carga</Label>
                <Input 
                  id="carga" 
                  value={formData.carga || ''} 
                  onChange={handleChange} 
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="berco">Berço</Label>
                <Input 
                  id="berco" 
                  value={formData.berco || ''} 
                  onChange={handleChange} 
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="quantidade_prevista">Quantidade Prevista</Label>
                <Input 
                  id="quantidade_prevista" 
                  type="number" 
                  step="0.01" 
                  value={formData.quantidade_prevista || ''} 
                  onChange={handleChange} 
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="cbs_total">Total de CBs</Label>
                <Input 
                  id="cbs_total" 
                  type="number" 
                  value={formData.cbs_total || ''} 
                  onChange={handleChange} 
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="media_cb">Média por CB</Label>
                <Input 
                  id="media_cb" 
                  type="number" 
                  step="0.0001" 
                  value={formData.media_cb || ''} 
                  onChange={handleChange} 
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="inicio_operacao">Início da Operação</Label>
                <Input 
                  id="inicio_operacao" 
                  type="datetime-local" 
                  value={formData.inicio_operacao || ''} 
                  onChange={handleChange} 
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="final_operacao">Final da Operação</Label>
                <Input 
                  id="final_operacao" 
                  type="datetime-local" 
                  value={formData.final_operacao || ''} 
                  onChange={handleChange} 
                />
              </div>
              <div className="flex items-center space-x-2">
                <Switch id="concluido" checked={formData.concluido} onCheckedChange={handleSwitchChange} />
                <Label htmlFor="concluido">Marcar como Concluído</Label>
              </div>
              <div className="sm:col-span-2">
                <Button type="submit" className="w-full mt-4" disabled={isSaving}>{isSaving ? 'Atualizando...' : 'Salvar Alterações'}</Button>
              </div>
            </CardContent>
          </Card>
        </form>
      </div>
    </div>
  );
};

export default EditarNavio;