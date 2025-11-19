// src/pages/RdoSantosBrasil.tsx
import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Search, Filter, Calendar, Building2, Download, RefreshCw } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface OperacaoSantosBrasil {
  id: string;
  op: string;
  data: string;
  hora_inicial: string;
  hora_final: string;
  observacao: string | null;
  carga: string | null;
  created_at: string;
  equipamentos: Array<{
    id: string;
    tag: string;
    motorista_operador: string;
    horas_trabalhadas: number;
    grupo_operacao: string;
    hora_inicial: string | null;
    hora_final: string | null;
  }>;
  ajudantes: Array<{
    id: string;
    nome: string;
    hora_inicial: string;
    hora_final: string;
    observacao: string;
    data: string;
  }>;
  ausencias: Array<{
    id: string;
    nome: string;
    justificado: boolean;
    obs: string;
    data: string;
  }>;
}

const RdoSantosBrasil = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [operacoes, setOperacoes] = useState<OperacaoSantosBrasil[]>([]);
  const [loading, setLoading] = useState(true);
  const [atualizando, setAtualizando] = useState(false);
  const [dataFiltro, setDataFiltro] = useState('');
  const [operadorFiltro, setOperadorFiltro] = useState('');

  // Função para corrigir o fuso horário
  const corrigirFusoHorarioData = (dataString: string) => {
    try {
      if (dataString.match(/^\d{4}-\d{2}-\d{2}$/)) {
        return dataString;
      }
      const data = new Date(dataString);
      const offset = data.getTimezoneOffset();
      data.setMinutes(data.getMinutes() - offset);
      return data.toISOString().split('T')[0];
    } catch (error) {
      console.error('Erro ao corrigir fuso horário:', error);
      return dataString;
    }
  };

  // Função para formatar data no formato brasileiro
  const formatarDataBR = (dataString: string) => {
    try {
      const data = new Date(dataString + 'T00:00:00');
      return data.toLocaleDateString('pt-BR');
    } catch (error) {
      console.error('Erro ao formatar data:', error);
      return dataString;
    }
  };

  // Buscar a última data disponível no banco de dados
  const buscarUltimaData = async () => {
    try {
      const { data, error } = await supabase
        .from('registro_operacoes')
        .select('data')
        .eq('op', 'SANTOS BRASIL')
        .order('data', { ascending: false })
        .limit(1)
        .single();

      if (error) throw error;

      if (data?.data) {
        return corrigirFusoHorarioData(data.data);
      }
      
      return new Date().toISOString().split('T')[0];
    } catch (error) {
      console.error('Erro ao buscar última data:', error);
      return new Date().toISOString().split('T')[0];
    }
  };

  const fetchOperacoesSantosBrasil = async (dataEspecifica?: string) => {
    setLoading(true);
    try {
      console.log('🔍 Buscando operações SANTOS BRASIL...');
      
      // Determinar qual data usar para o filtro
      let dataParaFiltrar = dataEspecifica || dataFiltro;
      if (!dataParaFiltrar) {
        dataParaFiltrar = await buscarUltimaData();
        setDataFiltro(dataParaFiltrar);
      }

      console.log('📅 Data para filtrar:', dataParaFiltrar);

      // Buscar APENAS operações do tipo SANTOS BRASIL
      let queryOperacoes = supabase
        .from('registro_operacoes')
        .select(`
          *
        `)
        .eq('op', 'SANTOS BRASIL'); // FILTRO EXCLUSIVO PARA SANTOS BRASIL

      // Aplicar filtro de data
      if (dataParaFiltrar) {
        queryOperacoes = queryOperacoes.eq('data', dataParaFiltrar);
      }

      const { data: operacoesData, error: operacoesError } = await queryOperacoes
        .order('data', { ascending: false })
        .order('hora_inicial', { ascending: false });

      if (operacoesError) {
        console.error('❌ Erro ao carregar operações:', operacoesError);
        throw new Error(`Erro ao carregar operações: ${operacoesError.message}`);
      }

      if (!operacoesData || operacoesData.length === 0) {
        console.log('📭 Nenhuma operação SANTOS BRASIL encontrada para a data:', dataParaFiltrar);
        setOperacoes([]);
        setLoading(false);
        return;
      }

      console.log('✅ Operações SANTOS BRASIL carregadas:', operacoesData.length);
      
      // Corrigir fusos horários das datas
      const operacoesComFusoCorrigido = operacoesData.map(op => ({
        ...op,
        data: corrigirFusoHorarioData(op.data)
      }));

      // Buscar dados relacionados para cada operação SANTOS BRASIL
      const operacoesCompletas = await Promise.all(
        operacoesComFusoCorrigido.map(async (operacao) => {
          try {
            // Buscar equipamentos da operação SANTOS BRASIL
            const { data: equipamentos, error: equipamentosError } = await supabase
              .from('equipamentos')
              .select('*')
              .eq('registro_operacoes_id', operacao.id);

            if (equipamentosError) {
              console.error(`❌ Erro ao carregar equipamentos para operação ${operacao.id}:`, equipamentosError);
            }

            // Buscar ajudantes e corrigir fusos horários
            const { data: ajudantes, error: ajudantesError } = await supabase
              .from('ajudantes')
              .select('*')
              .eq('registro_operacoes_id', operacao.id);

            let ajudantesCorrigidos = [];
            if (ajudantes) {
              ajudantesCorrigidos = ajudantes.map(ajudante => ({
                ...ajudante,
                data: corrigirFusoHorarioData(ajudante.data)
              }));
            }

            if (ajudantesError) {
              console.error(`❌ Erro ao carregar ajudantes para operação ${operacao.id}:`, ajudantesError);
            }

            // Buscar ausências e corrigir fusos horários
            const { data: ausencias, error: ausenciasError } = await supabase
              .from('ausencias')
              .select('*')
              .eq('registro_operacoes_id', operacao.id);

            let ausenciasCorrigidas = [];
            if (ausencias) {
              ausenciasCorrigidas = ausencias.map(ausencia => ({
                ...ausencia,
                data: corrigirFusoHorarioData(ausencia.data)
              }));
            }

            if (ausenciasError) {
              console.error(`❌ Erro ao carregar ausências para operação ${operacao.id}:`, ausenciasError);
            }

            return {
              ...operacao,
              equipamentos: equipamentos || [],
              ajudantes: ajudantesCorrigidos,
              ausencias: ausenciasCorrigidas,
            };
          } catch (error) {
            console.error(`❌ Erro ao carregar dados relacionados para operação ${operacao.id}:`, error);
            return {
              ...operacao,
              equipamentos: [],
              ajudantes: [],
              ausencias: [],
            };
          }
        })
      );

      console.log('✅ Dados SANTOS BRASIL carregados:', operacoesCompletas.length, 'operações completas');
      setOperacoes(operacoesCompletas);
      
    } catch (error: any) {
      console.error('❌ Erro ao carregar operações SANTOS BRASIL:', error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar os dados da Santos Brasil.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOperacoesSantosBrasil();
  }, []);

  const handleAtualizarDados = async () => {
    setAtualizando(true);
    try {
      await fetchOperacoesSantosBrasil();
      toast({
        title: "Dados atualizados",
        description: "Os dados da Santos Brasil foram atualizados com sucesso."
      });
    } catch (error) {
      console.error('Erro ao atualizar dados:', error);
    } finally {
      setAtualizando(false);
    }
  };

  const aplicarFiltros = () => {
    console.log('🎯 Aplicando filtros SANTOS BRASIL com data:', dataFiltro);
    fetchOperacoesSantosBrasil(dataFiltro);
  };

  const limparFiltros = () => {
    setOperadorFiltro('');
    setDataFiltro('');
  };

  // Filtrar operações por operador (frontend)
  const operacoesFiltradas = operacoes.filter(op => {
    const operadorMatch = operadorFiltro.trim() === '' || 
      op.equipamentos.some(eq => 
        eq.motorista_operador?.toLowerCase().includes(operadorFiltro.toLowerCase())
      );
    return operadorMatch;
  });

  // Calcular totais
  const totais = {
    operacoes: operacoesFiltradas.length,
    equipamentos: operacoesFiltradas.reduce((sum, op) => sum + op.equipamentos.length, 0),
    horasTrabalhadas: operacoesFiltradas.reduce((sum, op) => 
      sum + op.equipamentos.reduce((eqSum, eq) => eqSum + (Number(eq.horas_trabalhadas) || 0), 0), 0
    ),
    ajudantes: operacoesFiltradas.reduce((sum, op) => sum + op.ajudantes.length, 0),
    ausencias: operacoesFiltradas.reduce((sum, op) => sum + op.ausencias.length, 0)
  };

  const formatarHoras = (horas: number) => {
    return `${horas.toFixed(2)}h`;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-900 via-blue-800 to-blue-900 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-200 border-t-white rounded-full animate-spin mx-auto mb-4"></div>
          <h2 className="text-2xl font-bold text-white mb-2">Carregando Operações</h2>
          <p className="text-blue-200">Buscando dados da Santos Brasil...</p>
        </div>
      </div>
    );
  }

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
                <h1 className="text-2xl font-bold text-white">RDO Santos Brasil</h1>
                <p className="text-blue-200 text-sm">
                  Operações e equipamentos exclusivos da Santos Brasil
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <Button 
                onClick={handleAtualizarDados}
                disabled={atualizando}
                className="flex items-center space-x-2 bg-white text-blue-900 hover:bg-blue-100 font-medium"
              >
                <RefreshCw className={`h-4 w-4 ${atualizando ? 'animate-spin' : ''}`} />
                <span>Atualizar</span>
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Cards de Estatísticas */}
      <div className="px-6 py-4">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <Card className="bg-white/10 backdrop-blur-sm border-blue-200/30">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-blue-200">Operações</p>
                  <p className="text-2xl font-bold text-white">{totais.operacoes}</p>
                </div>
                <div className="p-3 rounded-lg bg-blue-500/20">
                  <Building2 className="h-6 w-6 text-blue-300" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white/10 backdrop-blur-sm border-green-200/30">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-blue-200">Equipamentos</p>
                  <p className="text-2xl font-bold text-white">{totais.equipamentos}</p>
                </div>
                <div className="p-3 rounded-lg bg-green-500/20">
                  <Building2 className="h-6 w-6 text-green-300" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white/10 backdrop-blur-sm border-orange-200/30">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-blue-200">Horas Trabalhadas</p>
                  <p className="text-2xl font-bold text-white">{formatarHoras(totais.horasTrabalhadas)}</p>
                </div>
                <div className="p-3 rounded-lg bg-orange-500/20">
                  <Building2 className="h-6 w-6 text-orange-300" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white/10 backdrop-blur-sm border-teal-200/30">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-blue-200">Ajudantes</p>
                  <p className="text-2xl font-bold text-white">{totais.ajudantes}</p>
                </div>
                <div className="p-3 rounded-lg bg-teal-500/20">
                  <Building2 className="h-6 w-6 text-teal-300" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white/10 backdrop-blur-sm border-purple-200/30">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-blue-200">Ausências</p>
                  <p className="text-2xl font-bold text-white">{totais.ausencias}</p>
                </div>
                <div className="p-3 rounded-lg bg-purple-500/20">
                  <Building2 className="h-6 w-6 text-purple-300" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Filtros */}
      <div className="px-6 py-4 border-b border-blue-600/30 bg-blue-800/30 backdrop-blur-sm">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="space-y-2">
            <Label className="text-sm font-medium text-white flex items-center space-x-2">
              <Calendar className="h-4 w-4 text-blue-300" />
              <span>Data da Operação</span>
            </Label>
            <div className="flex space-x-2">
              <Input 
                type="date" 
                value={dataFiltro}
                onChange={(e) => setDataFiltro(e.target.value)}
                className="h-10 bg-white/5 border-blue-300/30 text-white focus:border-blue-300 transition-colors"
              />
              <Button 
                onClick={aplicarFiltros}
                className="h-10 bg-blue-500 hover:bg-blue-600 text-white"
              >
                <Search className="h-4 w-4" />
              </Button>
            </div>
            <p className="text-xs text-blue-300">
              {dataFiltro ? `Mostrando: ${formatarDataBR(dataFiltro)}` : 'Selecione uma data'}
            </p>
          </div>
          
          <div className="space-y-2">
            <Label className="text-sm font-medium text-white flex items-center space-x-2">
              <Search className="h-4 w-4 text-blue-300" />
              <span>Operador</span>
            </Label>
            <Input 
              type="text"
              value={operadorFiltro}
              onChange={(e) => setOperadorFiltro(e.target.value)}
              placeholder="Buscar por operador..."
              className="h-10 bg-white/5 border-blue-300/30 text-white focus:border-blue-300 transition-colors"
            />
          </div>
          
          <div className="space-y-2">
            <Label className="text-sm font-medium text-white opacity-0">Ações</Label>
            <Button 
              onClick={aplicarFiltros}
              className="w-full h-10 bg-green-600 hover:bg-green-700 text-white font-medium"
            >
              <Filter className="h-4 w-4 mr-2" />
              Aplicar Filtros
            </Button>
          </div>

          <div className="space-y-2">
            <Label className="text-sm font-medium text-white opacity-0">Limpar</Label>
            <Button 
              onClick={limparFiltros}
              className="w-full h-10 bg-gray-600 hover:bg-gray-700 text-white font-medium"
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Limpar Filtros
            </Button>
          </div>
        </div>
      </div>

      {/* Conteúdo Principal */}
      <div className="p-6">
        <Card className="bg-white/10 backdrop-blur-sm border-blue-200/30">
          <CardHeader>
            <CardTitle className="text-white flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Building2 className="h-5 w-5" />
                <span>Operações Santos Brasil</span>
                <span className="text-blue-300 text-sm font-normal">
                  {operacoesFiltradas.length} operação(ões) encontrada(s)
                </span>
              </div>
              <Button
                variant="outline"
                className="text-white border-green-300 hover:bg-green-500/20"
              >
                <Download className="h-4 w-4 mr-2" />
                Exportar
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {operacoesFiltradas.length === 0 ? (
              <div className="text-center py-12">
                <Building2 className="h-12 w-12 text-blue-300/50 mx-auto mb-4" />
                <p className="text-white text-lg mb-2">Nenhuma operação encontrada</p>
                <p className="text-blue-200 mb-4">
                  {operacoes.length === 0 
                    ? "Não há operações da Santos Brasil cadastradas"
                    : "Nenhuma operação corresponde aos filtros aplicados"
                  }
                </p>
              </div>
            ) : (
              <div className="space-y-6">
                {operacoesFiltradas.map((operacao) => (
                  <Card key={operacao.id} className="bg-white/5 border-blue-200/20 hover:border-blue-300/40 transition-all duration-300">
                    <CardContent className="p-6">
                      {/* Cabeçalho da Operação */}
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center space-x-4">
                          <div className="bg-red-500/20 p-3 rounded-xl">
                            <Building2 className="h-6 w-6 text-red-400" />
                          </div>
                          <div>
                            <h3 className="text-white font-semibold text-lg">SANTOS BRASIL</h3>
                            <div className="flex items-center space-x-4 text-blue-200 text-sm mt-1">
                              <div className="flex items-center space-x-1">
                                <Calendar className="h-4 w-4" />
                                <span>{formatarDataBR(operacao.data)}</span>
                              </div>
                              {operacao.hora_inicial && (
                                <div className="flex items-center space-x-1">
                                  <span>⏰ {operacao.hora_inicial}</span>
                                  {operacao.hora_final && <span> - {operacao.hora_final}</span>}
                                </div>
                              )}
                            </div>
                            {operacao.observacao && (
                              <p className="text-blue-300 text-sm mt-2">{operacao.observacao}</p>
                            )}
                          </div>
                        </div>
                        <div className="text-right">
                          <Badge className="bg-green-500/20 text-green-300 text-lg px-3 py-1">
                            Total: {formatarHoras(operacao.equipamentos.reduce((sum, eq) => sum + (Number(eq.horas_trabalhadas) || 0), 0))}
                          </Badge>
                        </div>
                      </div>

                      {/* Tabela de Equipamentos */}
                      {operacao.equipamentos.length > 0 && (
                        <div className="mt-4">
                          <h4 className="text-white font-semibold mb-3">Equipamentos ({operacao.equipamentos.length})</h4>
                          <Table>
                            <TableHeader className="bg-blue-500/10">
                              <TableRow>
                                <TableHead className="font-semibold text-blue-200 py-3">Equipamento</TableHead>
                                <TableHead className="font-semibold text-blue-200 py-3">Operador</TableHead>
                                <TableHead className="font-semibold text-blue-200 py-3">Grupo</TableHead>
                                <TableHead className="font-semibold text-blue-200 py-3">Horário</TableHead>
                                <TableHead className="font-semibold text-blue-200 py-3">Horas Trabalhadas</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {operacao.equipamentos.map((eq) => {
                                const horasTrabalhadas = Number(eq.horas_trabalhadas) || 0;
                                
                                return (
                                  <TableRow key={eq.id} className="hover:bg-white/5 transition-colors border-b border-blue-200/10">
                                    <TableCell className="py-3">
                                      <div className="font-medium text-white">{eq.tag}</div>
                                    </TableCell>
                                    <TableCell className="py-3">
                                      <div className="font-medium text-white">{eq.motorista_operador}</div>
                                    </TableCell>
                                    <TableCell className="py-3">
                                      <Badge variant="outline" className="bg-blue-500/20 text-blue-300 border-blue-300/30">
                                        {eq.grupo_operacao}
                                      </Badge>
                                    </TableCell>
                                    <TableCell className="py-3">
                                      <div className="flex items-center space-x-2">
                                        <Badge variant="outline" className="bg-blue-500/20 text-blue-300 border-blue-300/30 text-xs">
                                          {eq.hora_inicial}
                                        </Badge>
                                        <span className="text-blue-400">→</span>
                                        <Badge variant="outline" className="bg-green-500/20 text-green-300 border-green-300/30 text-xs">
                                          {eq.hora_final}
                                        </Badge>
                                      </div>
                                    </TableCell>
                                    <TableCell className="py-3">
                                      <div className="text-center">
                                        <Badge className="bg-green-500/20 text-green-300 hover:bg-green-500/20 border-0 text-sm font-medium">
                                          {horasTrabalhadas.toFixed(1)}h
                                        </Badge>
                                      </div>
                                    </TableCell>
                                  </TableRow>
                                );
                              })}
                            </TableBody>
                          </Table>
                        </div>
                      )}

                      {/* Ajudantes */}
                      {operacao.ajudantes.length > 0 && (
                        <div className="mt-6">
                          <h4 className="text-white font-semibold mb-3">Ajudantes ({operacao.ajudantes.length})</h4>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            {operacao.ajudantes.map((ajudante) => (
                              <Card key={ajudante.id} className="bg-blue-500/10 border-blue-300/20">
                                <CardContent className="p-3">
                                  <div className="flex items-center justify-between">
                                    <div>
                                      <p className="font-medium text-white">{ajudante.nome}</p>
                                      <p className="text-sm text-blue-300">
                                        {ajudante.hora_inicial} - {ajudante.hora_final}
                                      </p>
                                    </div>
                                    {ajudante.observacao && (
                                      <Badge variant="outline" className="bg-blue-500/20 text-blue-300 border-blue-300/30">
                                        {ajudante.observacao}
                                      </Badge>
                                    )}
                                  </div>
                                </CardContent>
                              </Card>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Ausências */}
                      {operacao.ausencias.length > 0 && (
                        <div className="mt-6">
                          <h4 className="text-white font-semibold mb-3">Ausências ({operacao.ausencias.length})</h4>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            {operacao.ausencias.map((ausencia) => (
                              <Card key={ausencia.id} className="bg-red-500/10 border-red-300/20">
                                <CardContent className="p-3">
                                  <div className="flex items-center justify-between">
                                    <div>
                                      <p className="font-medium text-white">{ausencia.nome}</p>
                                      <p className="text-sm text-red-300">
                                        {ausencia.justificado ? 'Justificado' : 'Não Justificado'}
                                      </p>
                                    </div>
                                    {ausencia.obs && (
                                      <Badge variant="outline" className="bg-red-500/20 text-red-300 border-red-300/30">
                                        {ausencia.obs}
                                      </Badge>
                                    )}
                                  </div>
                                </CardContent>
                              </Card>
                            ))}
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default RdoSantosBrasil;