// src/pages/Navios.tsx
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ArrowLeft, Plus, Pencil } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface Viagem {
  id: string;
  nome_navio: string;
  carga: string | null;
  berco: string | null;
  quantidade_prevista: number | null;
  cbs_total: number | null;
  inicio_operacao: string | null;
  final_operacao: string | null;
  media_cb: number | null;
  concluido: boolean;
}

const Navios = () => {
  const navigate = useNavigate();
  const [viagens, setViagens] = useState<Viagem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchViagens = async () => {
      setLoading(true);
      const { data, error } = await supabase.from('navios').select('*').order('created_at', { ascending: false });
      if (!error) setViagens(data || []);
      setLoading(false);
    };
    fetchViagens();
  }, []);

  const formatDate = (dateString: string | null) => dateString ? new Date(dateString).toLocaleDateString('pt-BR') : 'N/A';

  return (
    <div className="min-h-screen pb-10" style={{ background: 'var(--gradient-primary)' }}>
      <div className="flex items-center justify-between p-4 text-white">
        <div className="flex items-center">
          <Button variant="ghost" onClick={() => navigate('/')} className="text-white hover:bg-white/20 mr-4"><ArrowLeft className="h-5 w-5" /></Button>
          <h1 className="text-xl font-bold">Gestão de Navios / Viagens</h1>
        </div>
      </div>
      <div className="px-4 mb-4">
        <Button onClick={() => navigate('/novo-navio')} className="w-full h-12 bg-secondary hover:bg-secondary/90 text-white font-semibold">
          <Plus className="h-5 w-5 mr-2" />Cadastrar Novo Navio/Viagem
        </Button>
      </div>
      <div className="px-4">
        <Card>
          <CardHeader><CardTitle>Viagens Registradas</CardTitle></CardHeader>
          <CardContent className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Navio</TableHead>
                  <TableHead>Carga</TableHead>
                  <TableHead>Berço</TableHead>
                  <TableHead>Quantidade</TableHead>
                  <TableHead>CBs</TableHead>
                  <TableHead>Início</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? <TableRow><TableCell colSpan={8} className="text-center">Carregando...</TableCell></TableRow>
                 : viagens.length === 0 ? <TableRow><TableCell colSpan={8} className="text-center">Nenhuma viagem registrada.</TableCell></TableRow>
                 : viagens.map((viagem) => (
                    <TableRow key={viagem.id}>
                      <TableCell className="font-medium">{viagem.nome_navio}</TableCell>
                      <TableCell>{viagem.carga}</TableCell>
                      <TableCell>{viagem.berco}</TableCell>
                      <TableCell>{viagem.quantidade_prevista}</TableCell>
                      <TableCell>{viagem.cbs_total}</TableCell>
                      <TableCell>{formatDate(viagem.inicio_operacao)}</TableCell>
                      <TableCell><span className={`px-2 py-1 text-xs rounded-full ${viagem.concluido ? 'bg-gray-200' : 'bg-green-200'}`}>{viagem.concluido ? 'Concluído' : 'Em Andamento'}</span></TableCell>
                      <TableCell className="text-right space-x-2">
                        <Button variant="outline" size="sm" onClick={() => navigate(`/navio/${viagem.id}/editar`)}><Pencil className="h-4 w-4 mr-1"/> Editar</Button>
                        <Button variant="outline" size="sm" onClick={() => navigate(`/navio/${viagem.id}/producao`)}>Lançar Produção</Button>
                      </TableCell>
                    </TableRow>
                  ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
export default Navios;