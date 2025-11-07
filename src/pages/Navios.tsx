// src/pages/Navios.tsx
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Plus, Pencil, Ship, Calendar, Package, Anchor, BarChart3 } from 'lucide-react';
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
  created_at: string;
}

const Navios = () => {
  const navigate = useNavigate();
  const [viagens, setViagens] = useState<Viagem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchViagens = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from('navios')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (!error) setViagens(data || []);
      setLoading(false);
    };
    fetchViagens();
  }, []);

  const formatDate = (dateString: string | null) => 
    dateString ? new Date(dateString).toLocaleDateString('pt-BR') : 'N/A';

  const getStatusColor = (concluido: boolean) => 
    concluido ? 'bg-blue-500/20 text-blue-300 border-blue-300/30' : 'bg-green-500/20 text-green-300 border-green-300/30';

  const calcularDiasOperacao = (inicio: string | null, final: string | null) => {
    if (!inicio) return 0;
    const inicioDate = new Date(inicio);
    const finalDate = final ? new Date(final) : new Date();
    const diffTime = Math.abs(finalDate.getTime() - inicioDate.getTime());
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-900 via-blue-800 to-blue-900">
      {/* Header */}
      <div className="bg-blue-800/50 backdrop-blur-sm border-b border-blue-600/30">
        <div className="px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Button 
                variant="ghost" 
                onClick={() => navigate('/')} 
                className="text-white hover:bg-white/20 px-4 py-2 rounded-lg transition-all"
              >
                <ArrowLeft className="h-5 w-5 mr-2" />
                Voltar
              </Button>
              <div>
                <h1 className="text-2xl font-bold text-white">Gestão de Navios</h1>
                <p className="text-blue-200 text-sm">
                  {viagens.length} viagens registradas no sistema
                </p>
              </div>
            </div>
            <Button 
              onClick={() => navigate('/novo-navio')} 
              className="bg-orange-500 hover:bg-orange-600 text-white px-6 py-2.5 rounded-lg font-semibold transition-all shadow-sm hover:shadow-md"
            >
              <Plus className="h-4 w-4 mr-2" />
              Novo Navio/Viagem
            </Button>
          </div>
        </div>
      </div>

      {/* Cards de Resumo */}
      <div className="px-6 py-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <Card className="bg-white/10 backdrop-blur-sm border-blue-200/30 hover:shadow-lg transition-shadow">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-blue-200">Total de Viagens</p>
                  <p className="text-2xl font-bold text-white">{viagens.length}</p>
                </div>
                <div className="p-3 rounded-lg bg-blue-500/20">
                  <Ship className="h-6 w-6 text-blue-300" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white/10 backdrop-blur-sm border-blue-200/30 hover:shadow-lg transition-shadow">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-blue-200">Em Andamento</p>
                  <p className="text-2xl font-bold text-white">
                    {viagens.filter(v => !v.concluido).length}
                  </p>
                </div>
                <div className="p-3 rounded-lg bg-green-500/20">
                  <Calendar className="h-6 w-6 text-green-300" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white/10 backdrop-blur-sm border-blue-200/30 hover:shadow-lg transition-shadow">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-blue-200">Concluídas</p>
                  <p className="text-2xl font-bold text-white">
                    {viagens.filter(v => v.concluido).length}
                  </p>
                </div>
                <div className="p-3 rounded-lg bg-blue-500/20">
                  <Package className="h-6 w-6 text-blue-300" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white/10 backdrop-blur-sm border-blue-200/30 hover:shadow-lg transition-shadow">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-blue-200">Média CBs</p>
                  <p className="text-2xl font-bold text-white">
                    {viagens.length > 0 
                      ? Math.round(viagens.reduce((acc, v) => acc + (v.media_cb || 0), 0) / viagens.length)
                      : 0
                    }
                  </p>
                </div>
                <div className="p-3 rounded-lg bg-purple-500/20">
                  <BarChart3 className="h-6 w-6 text-purple-300" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Tabela de Viagens */}
      <div className="px-6">
        <Card className="bg-white/10 backdrop-blur-sm border-blue-200/30">
          <CardHeader className="border-b border-blue-200/30">
            <CardTitle className="text-white flex items-center space-x-2">
              <Ship className="h-5 w-5" />
              <span>Viagens Registradas</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader className="bg-blue-500/10">
                  <TableRow>
                    <TableHead className="font-semibold text-blue-200 py-3">Navio</TableHead>
                    <TableHead className="font-semibold text-blue-200 py-3">Carga</TableHead>
                    <TableHead className="font-semibold text-blue-200 py-3">Berço</TableHead>
                    <TableHead className="font-semibold text-blue-200 py-3">Quantidade</TableHead>
                    <TableHead className="font-semibold text-blue-200 py-3">CBs</TableHead>
                    <TableHead className="font-semibold text-blue-200 py-3">Início</TableHead>
                    <TableHead className="font-semibold text-blue-200 py-3">Dias</TableHead>
                    <TableHead className="font-semibold text-blue-200 py-3">Status</TableHead>
                    <TableHead className="font-semibold text-blue-200 py-3 text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    <TableRow>
                      <TableCell colSpan={9} className="text-center py-8">
                        <div className="flex justify-center">
                          <div className="w-8 h-8 border-4 border-blue-200 border-t-white rounded-full animate-spin"></div>
                        </div>
                        <p className="text-blue-200 mt-2">Carregando viagens...</p>
                      </TableCell>
                    </TableRow>
                  ) : viagens.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={9} className="text-center py-12">
                        <div className="space-y-3">
                          <Ship className="h-12 w-12 text-blue-300/50 mx-auto" />
                          <p className="text-lg font-medium text-white">Nenhuma viagem registrada</p>
                          <p className="text-blue-300">Cadastre a primeira viagem para começar</p>
                          <Button 
                            onClick={() => navigate('/novo-navio')}
                            className="bg-orange-500 hover:bg-orange-600 text-white mt-2"
                          >
                            <Plus className="h-4 w-4 mr-2" />
                            Cadastrar Primeira Viagem
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : (
                    viagens.map((viagem) => {
                      const diasOperacao = calcularDiasOperacao(viagem.inicio_operacao, viagem.final_operacao);
                      
                      return (
                        <TableRow key={viagem.id} className="hover:bg-white/5 transition-colors border-b border-blue-200/10">
                          <TableCell className="py-4">
                            <div className="flex items-center space-x-3">
                              <div className="p-2 rounded-lg bg-blue-500/20">
                                <Ship className="h-4 w-4 text-blue-300" />
                              </div>
                              <div>
                                <div className="font-medium text-white">{viagem.nome_navio}</div>
                                {viagem.inicio_operacao && (
                                  <div className="text-xs text-blue-300">
                                    Iniciou: {formatDate(viagem.inicio_operacao)}
                                  </div>
                                )}
                              </div>
                            </div>
                          </TableCell>
                          <TableCell className="py-4">
                            <div className="font-medium text-white">{viagem.carga || 'N/A'}</div>
                          </TableCell>
                          <TableCell className="py-4">
                            <div className="flex items-center space-x-2">
                              <Anchor className="h-4 w-4 text-blue-300" />
                              <span className="text-white">{viagem.berco || 'N/A'}</span>
                            </div>
                          </TableCell>
                          <TableCell className="py-4">
                            <div className="text-white">
                              {viagem.quantidade_prevista?.toLocaleString('pt-BR') || 'N/A'}
                            </div>
                          </TableCell>
                          <TableCell className="py-4">
                            <Badge variant="outline" className="bg-blue-500/20 text-blue-300 border-blue-300/30">
                              {viagem.cbs_total || 0} CBs
                            </Badge>
                          </TableCell>
                          <TableCell className="py-4">
                            <div className="text-sm text-white">
                              {formatDate(viagem.inicio_operacao)}
                            </div>
                          </TableCell>
                          <TableCell className="py-4">
                            <Badge variant="outline" className="bg-purple-500/20 text-purple-300 border-purple-300/30">
                              {diasOperacao} dias
                            </Badge>
                          </TableCell>
                          <TableCell className="py-4">
                            <Badge 
                              variant="outline" 
                              className={getStatusColor(viagem.concluido)}
                            >
                              {viagem.concluido ? 'Concluído' : 'Em Andamento'}
                            </Badge>
                          </TableCell>
                          <TableCell className="py-4 text-right space-x-2">
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => navigate(`/navio/${viagem.id}/editar`)}
                              className="border-blue-300 text-white hover:bg-white/20 bg-white/10"
                            >
                              <Pencil className="h-3 w-3 mr-1" />
                              Editar
                            </Button>
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => navigate(`/navio/${viagem.id}/producao`)}
                              className="border-green-300 text-white hover:bg-green-500/20 bg-green-500/10"
                            >
                              <Plus className="h-3 w-3 mr-1" />
                              Produção
                            </Button>
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Navios;