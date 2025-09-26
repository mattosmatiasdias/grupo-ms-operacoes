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
import { useAuth } from '@/hooks/useAuth';
import { formatTag } from '@/utils/formatTag';

const EditarNavio = () => {
  const { id: navioId } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();
  const [isSaving, setIsSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [formData, setFormData] = useState<any>({});
  const [equipamentosNavio, setEquipamentosNavio] = useState<Array<{id: string, tag: string, motorista_operador: string, hora_inicial?: string, hora_final?: string}>>([]);

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
      setFormData(data);

      // Carrega equipamentos associados
      const { data: equipamentosData, error: equipError } = await supabase
        .from('equipamentos')
        .select('*')
        .eq('local', 'NAVIO')
        .eq('grupo_operacao', 'Operação Navio')
        .eq('registro_operacoes_id', null)
        .eq('navio_id', navioId);
      
      if (!equipError) {
        setEquipamentosNavio(
          (equipamentosData || []).map(eq => ({
            id: eq.id.toString(),
            tag: eq.tag || '',
            motorista_operador: eq.motorista_operador || '',
            hora_inicial: eq.hora_inicial || '', // ← NOVO
            hora_final: eq.hora_final || ''      // ← NOVO
          }))
        );
      }
    }
    setLoading(false);
  }, [navioId, navigate, toast]);

  useEffect(() => {
    fetchNavio();
  }, [fetchNavio]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { id, value } = e.target;
    setFormData(prev => ({ ...prev, [id]: value }));
  };

  const handleSwitchChange = (checked: boolean) => {
    setFormData(prev => ({ ...prev, concluido: checked }));
  };

  const addEquipamentoNavio = (count = 1) => { 
    const n = []; 
    for (let i = 0; i < count; i++) { 
        n.push({ id: `${Date.now()}-${i}`, tag: '', motorista_operador: '', hora_inicial: '', hora_final: '' }); 
    } 
    setEquipamentosNavio([...equipamentosNavio, ...n]); 
  };

  const updateEquipamentoNavio = (id: string, field: 'tag' | 'motorista_operador' | 'hora_inicial' | 'hora_final', value: string) => { 
    setEquipamentosNavio(equipamentosNavio.map(eq => eq.id === id ? { ...eq, [field]: field === 'tag' ? formatTag(value) : value } : eq)); 
  };

  const removeEquipamentoNavio = (id: string) => { 
    setEquipamentosNavio(equipamentosNavio.filter(eq => eq.id !== id)); 
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!navioId) return;
    setIsSaving(true);
    try {
      const { id, created_at, updated_at, user_id, ...updateData } = formData;
      if (updateData.inicio_operacao === '') updateData.inicio_operacao = null;
      if (updateData.final_operacao === '') updateData.final_operacao = null;

      const { error } = await supabase.from('navios').update(updateData).eq('id', navioId);
      if (error) throw error;

      // Atualiza equipamentos
      await supabase.from('equipamentos').delete().eq('navio_id', navioId);
      if (equipamentosNavio.length > 0) {
        const equipamentosParaSalvar = equipamentosNavio
          .filter(eq => eq.tag)
          .map(eq => ({
            navio_id: navioId,
            local: 'NAVIO',
            tag: eq.tag,
            motorista_operador: eq.motorista_operador,
            grupo_operacao: 'Operação Navio',
            registro_operacoes_id: null,
            hora_inicial: eq.hora_inicial || null, // ← NOVO
            hora_final: eq.hora_final || null,     // ← NOVO
          }));
        await supabase.from('equipamentos').insert(equipamentosParaSalvar);
      }

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
              <div className="space-y-2"><Label htmlFor="nome_navio">Nome do Navio*</Label><Input id="nome_navio" value={formData.nome_navio || ''} onChange={handleChange} required /></div>
              <div className="space-y-2"><Label htmlFor="carga">Carga</Label><Input id="carga" value={formData.carga || ''} onChange={handleChange} /></div>
              <div className="space-y-2"><Label htmlFor="berco">Berço</Label><Input id="berco" value={formData.berco || ''} onChange={handleChange} /></div>
              <div className="space-y-2"><Label htmlFor="quantidade_prevista">Quantidade Prevista</Label><Input id="quantidade_prevista" type="number" step="0.01" value={formData.quantidade_prevista || ''} onChange={handleChange} /></div>
              <div className="space-y-2"><Label htmlFor="cbs_total">Total de CBs</Label><Input id="cbs_total" type="number" value={formData.cbs_total || ''} onChange={handleChange} /></div>
              <div className="space-y-2"><Label htmlFor="media_cb">Média por CB</Label><Input id="media_cb" type="number" step="0.0001" value={formData.media_cb || ''} onChange={handleChange} /></div>
              <div className="space-y-2"><Label htmlFor="inicio_operacao">Início da Operação</Label><Input id="inicio_operacao" type="datetime-local" value={formData.inicio_operacao || ''} onChange={handleChange} /></div>
              <div className="space-y-2"><Label htmlFor="final_operacao">Final da Operação</Label><Input id="final_operacao" type="datetime-local" value={formData.final_operacao || ''} onChange={handleChange} /></div>
              <div className="flex items-center space-x-2"><Switch id="concluido" checked={formData.concluido} onCheckedChange={handleSwitchChange} /><Label htmlFor="concluido">Marcar como Concluído</Label></div>
              <div className="sm:col-span-2">
                <Button type="submit" className="w-full mt-4" disabled={isSaving}>{isSaving ? 'Atualizando...' : 'Salvar Alterações'}</Button>
              </div>
            </CardContent>
          </Card>
        </form>

        <Card className="mt-6">
          <CardHeader><CardTitle>Equipamentos Associados</CardTitle></CardHeader>
          <CardContent>
            <div className="space-y-2">
              {equipamentosNavio.map(eq => (
                <div key={eq.id} className="flex items-center gap-2">
                  <Input 
                    placeholder="Ex: CB-123, EST-5" 
                    value={eq.tag} 
                    onChange={(e) => updateEquipamentoNavio(eq.id, 'tag', e.target.value)} 
                  />
                  <Input 
                    placeholder="OPERADOR" 
                    value={eq.motorista_operador} 
                    onChange={(e) => updateEquipamentoNavio(eq.id, 'motorista_operador', e.target.value)} 
                  />
                  <Input 
                    type="time" 
                    placeholder="Início" 
                    value={eq.hora_inicial || ''} 
                    onChange={(e) => updateEquipamentoNavio(eq.id, 'hora_inicial', e.target.value)} 
                    className="w-28"
                  />
                  <Input 
                    type="time" 
                    placeholder="Fim" 
                    value={eq.hora_final || ''} 
                    onChange={(e) => updateEquipamentoNavio(eq.id, 'hora_final', e.target.value)} 
                    className="w-28"
                  />
                  <Button variant="ghost" size="icon" onClick={() => removeEquipamentoNavio(eq.id)}>
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </Button>
                </div>
              ))}
            </div>
            <div className="flex gap-2 mt-4">
              <Button type="button" onClick={() => addEquipamentoNavio(1)} className="flex-1">+1 Equipamento</Button>
              <Button type="button" onClick={() => addEquipamentoNavio(10)} variant="secondary" className="flex-1">+10 Equipamentos</Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default EditarNavio;