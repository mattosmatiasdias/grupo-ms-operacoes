// src/pages/ProducaoDiaria.tsx
import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { ArrowLeft, Plus, X } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';

interface RegistroProducao {
  id?: string;
  porao: string;
  tons_t1?: number; vols_t1?: number;
  tons_t2?: number; vols_t2?: number;
  tons_t3?: number; vols_t3?: number;
  tons_t4?: number; vols_t4?: number;
  observacao?: string;
}

const ProducaoDiaria = () => {
  const { id: navioId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  
  const [navio, setNavio] = useState<{ nome_navio: string } | null>(null);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [registros, setRegistros] = useState<RegistroProducao[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const fetchRegistrosDoDia = useCallback(async (data: string) => {
    setLoading(true);
    try {
      if (!navioId) return;
      const { data: navioData, error: navioError } = await supabase.from('navios').select('nome_navio').eq('id', navioId).single();
      if (navioError) throw navioError;
      setNavio(navioData);

      const { data: registrosData, error } = await supabase.from('registros_producao').select('*').eq('navio_id', navioId).eq('data', data);
      if (error) throw error;

      if (registrosData && registrosData.length > 0) {
        setRegistros(registrosData);
      } else {
        setRegistros([{ id: `new-${Date.now()}`, porao: '#01', tons_t1: 0, vols_t1: 0, tons_t2: 0, vols_t2: 0, tons_t3: 0, vols_t3: 0, tons_t4: 0, vols_t4: 0, observacao: '' }]);
      }
    } catch (error) {
      toast({ title: "Erro", description: "Não foi possível carregar os dados.", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, [navioId, toast]);

  useEffect(() => {
    fetchRegistrosDoDia(selectedDate);
  }, [selectedDate, fetchRegistrosDoDia]);

  const handleRegistroChange = (id: string, field: keyof RegistroProducao, value: string) => {
    setRegistros(prev => prev.map(r => r.id === id ? { ...r, [field]: isNaN(Number(value)) || value === '' ? value : Number(value) } : r));
  };

  const addPorao = () => {
    const nextPoraoNumber = registros.length + 1;
    setRegistros(prev => [...prev, { id: `new-${Date.now()}`, porao: `#${String(nextPoraoNumber).padStart(2, '0')}`, tons_t1: 0, vols_t1: 0, tons_t2: 0, vols_t2: 0, tons_t3: 0, vols_t3: 0, tons_t4: 0, vols_t4: 0, observacao: '' }]);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !navioId) return;
    setIsSaving(true);
    
    const dadosParaSalvar = registros.map(({ id, ...rest }) => ({
      ...rest,
      navio_id: navioId,
      data: selectedDate,
      user_id: user.id,
    }));

    try {
      const { error } = await supabase.from('registros_producao').upsert(dadosParaSalvar, { onConflict: 'navio_id, data, porao' });
      if (error) throw error;
      toast({ title: "Sucesso!", description: "Registros do dia salvos com sucesso." });
      fetchRegistrosDoDia(selectedDate); // Recarrega os dados para obter os IDs corretos
    } catch (error) {
      console.error(error);
      toast({ title: "Erro", description: "Não foi possível salvar os dados.", variant: "destructive" });
    } finally {
      setIsSaving(false);
    }
  };

  const turnos = [
    { id: 1, label: "01:00 - 07:00", tonsKey: "tons_t1", volsKey: "vols_t1" },
    { id: 2, label: "07:00 - 13:00", tonsKey: "tons_t2", volsKey: "vols_t2" },
    { id: 3, label: "13:00 - 19:00", tonsKey: "tons_t3", volsKey: "vols_t3" },
    { id: 4, label: "19:00 - 01:00", tonsKey: "tons_t4", volsKey: "vols_t4" },
  ];

  return (
    <div className="min-h-screen pb-10" style={{ background: 'var(--gradient-primary)' }}>
      <div className="flex items-center p-4 text-white">
        <Button variant="ghost" onClick={() => navigate('/navios')} className="text-white hover:bg-white/20 mr-4"><ArrowLeft className="h-5 w-5" /></Button>
        <h1 className="text-xl font-bold">Produção Diária: {navio?.nome_navio || '...'}</h1>
      </div>
      <div className="p-4">
        <form onSubmit={handleSave}>
          <Card>
            <CardHeader>
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center">
                <CardTitle>Registro do Dia</CardTitle>
                <div className="w-full sm:w-auto mt-2 sm:mt-0">
                  <Label htmlFor="data-selecao">Selecionar Data</Label>
                  <Input id="data-selecao" type="date" value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)} />
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {loading ? <p>Carregando...</p> : (
                <div className="space-y-6">
                  {registros.map(registro => (
                    <Card key={registro.id} className="p-4">
                      <div className="space-y-4">
                        <div>
                          <Label>Porão</Label>
                          <Input value={registro.porao} onChange={(e) => handleRegistroChange(registro.id!, 'porao', e.target.value)} />
                        </div>
                        {turnos.map(turno => (
                          <div key={turno.id} className="space-y-2">
                            <h4 className="font-semibold text-md border-b pb-1">{turno.label}</h4>
                            <div className="grid grid-cols-2 gap-4">
                              <div><Label htmlFor={`${registro.id}-${turno.tonsKey}`}>Toneladas</Label><Input id={`${registro.id}-${turno.tonsKey}`} type="number" step="0.01" value={registro[turno.tonsKey as keyof RegistroProducao] as number || 0} onChange={(e) => handleRegistroChange(registro.id!, turno.tonsKey as keyof RegistroProducao, e.target.value)} /></div>
                              <div><Label htmlFor={`${registro.id}-${turno.volsKey}`}>Volumes</Label><Input id={`${registro.id}-${turno.volsKey}`} type="number" step="0.01" value={registro[turno.volsKey as keyof RegistroProducao] as number || 0} onChange={(e) => handleRegistroChange(registro.id!, turno.volsKey as keyof RegistroProducao, e.target.value)} /></div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </Card>
                  ))}
                  <Button variant="outline" type="button" onClick={addPorao} className="w-full">Adicionar Porão</Button>
                  <Button type="submit" className="w-full mt-4" disabled={isSaving}>
                    {isSaving ? 'Salvando...' : 'Salvar Registros do Dia'}
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </form>
      </div>
    </div>
  );
};
export default ProducaoDiaria;