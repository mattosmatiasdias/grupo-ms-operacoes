import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { BarChart3, Filter, PieChart, ArrowLeft, Menu, X, Ship, Building2, Warehouse, Globe, Factory, Clock, Package, Home, Users, Calculator, RefreshCw, Database } from 'lucide-react';
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

// Interfaces para os dados
interface LocalData {
  local: string;
  horas: number;
  quantidade: number;
  porcentagem: number;
}

interface TagGenericoData {
  tag_generico: string;
  horas: number;
  quantidade: number;
  porcentagem?: number;
}

interface CategoriaData {
  categoria_nome: string;
  horas: number;
  quantidade: number;
  porcentagem?: number;
}

interface NavioCargaData {
  id: string;
  nome_navio: string;
  carga: string;
  navio_carga: string;
  horas: number;
  quantidade: number;
  quantidade_total: number;
  navio_id?: string;
}

interface RateioRHData {
  centro_resultado: string;
  truck: {
    horas: number;
    porcentagem: number;
  };
  operador: {
    horas: number;
    porcentagem: number;
  };
  carreteiro: {
    horas: number;
    porcentagem: number;
  };
}

type VistaAtiva = 'GERAL' | 'NAVIO' | 'ALBRAS' | 'SANTOS_BRASIL' | 'HYDRO' | 'RATEIO_RH';

const Visuais = () => {
  const navigate = useNavigate();
  const { userProfile } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [vistaAtiva, setVistaAtiva] = useState<VistaAtiva>('GERAL');
  const [atualizandoCR, setAtualizandoCR] = useState(false);
  
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

  // Função para obter o período de 16 a 15 do mês seguinte
  const getPeriodoPadrao = () => {
    const hoje = new Date();
    const anoAtual = hoje.getFullYear();
    const mesAtual = hoje.getMonth() + 1;
    
    let dataInicial, dataFinal;
    
    if (hoje.getDate() >= 16) {
      dataInicial = `${anoAtual}-${String(mesAtual).padStart(2, '0')}-16`;
      
      let proximoMes = mesAtual + 1;
      let proximoAno = anoAtual;
      if (proximoMes > 12) {
        proximoMes = 1;
        proximoAno = anoAtual + 1;
      }
      dataFinal = `${proximoAno}-${String(proximoMes).padStart(2, '0')}-15`;
    } else {
      let mesAnterior = mesAtual - 1;
      let anoAnterior = anoAtual;
      if (mesAnterior < 1) {
        mesAnterior = 12;
        anoAnterior = anoAtual - 1;
      }
      dataInicial = `${anoAnterior}-${String(mesAnterior).padStart(2, '0')}-16`;
      dataFinal = `${anoAtual}-${String(mesAtual).padStart(2, '0')}-15`;
    }
    
    return { dataInicial, dataFinal };
  };

  // Função para obter períodos disponíveis
  const getPeriodosDisponiveis = () => {
    const periodos = [];
    const hoje = new Date();
    const anoAtual = hoje.getFullYear();
    const mesAtual = hoje.getMonth() + 1;
    
    for (let i = 0; i < 6; i++) {
      let mes = mesAtual - i;
      let ano = anoAtual;
      
      while (mes < 1) {
        mes += 12;
        ano -= 1;
      }
      
      const dataInicial = `${ano}-${String(mes).padStart(2, '0')}-16`;
      
      let proximoMes = mes + 1;
      let proximoAno = ano;
      if (proximoMes > 12) {
        proximoMes = 1;
        proximoAno = ano + 1;
      }
      const dataFinal = `${proximoAno}-${String(proximoMes).padStart(2, '0')}-15`;
      
      periodos.push({
        value: `${dataInicial}_${dataFinal}`,
        label: `${formatarDataBR(dataInicial)} a ${formatarDataBR(dataFinal)}`
      });
    }
    
    return periodos;
  };

  // Estados
  const [filtros, setFiltros] = useState({
    periodo: '',
    local: 'todos'
  });

  const [dadosGeral, setDadosGeral] = useState<{
    locais: LocalData[];
    tags: TagGenericoData[];
    categorias: CategoriaData[];
  }>({ locais: [], tags: [], categorias: [] });

  const [dadosNavio, setDadosNavio] = useState<{
    navios: NavioCargaData[];
    detalhesNavios: Record<string, TagGenericoData[]>;
    categoriasNavios: Record<string, CategoriaData[]>;
  }>({ navios: [], detalhesNavios: {}, categoriasNavios: {} });

  const [dadosAlbras, setDadosAlbras] = useState<{
    tags: TagGenericoData[];
    categorias: CategoriaData[];
  }>({ tags: [], categorias: [] });

  const [dadosSantosBrasil, setDadosSantosBrasil] = useState<{
    tags: TagGenericoData[];
    categorias: CategoriaData[];
  }>({ tags: [], categorias: [] });

  const [dadosHydro, setDadosHydro] = useState<{
    tags: TagGenericoData[];
    categorias: CategoriaData[];
  }>({ tags: [], categorias: [] });

  const [dadosRateioRH, setDadosRateioRH] = useState<RateioRHData[]>([]);
  
  const [carregando, setCarregando] = useState(false);
  const [inicializando, setInicializando] = useState(true);
  const [periodos, setPeriodos] = useState<{value: string, label: string}[]>([]);
  const [totais, setTotais] = useState({ horas: 0, quantidade: 0 });

  // Locais disponíveis para filtro
  const locais = [
    { value: 'todos', label: 'Todos os Locais' },
    { value: 'HYDRO', label: 'HYDRO' },
    { value: 'ALBRAS', label: 'ALBRAS' },
    { value: 'SANTOS BRASIL', label: 'SANTOS BRASIL' },
    { value: 'NAVIO', label: 'NAVIOS' },
    { value: 'NÃO INFORMADO', label: 'Não Informado' }
  ];

  // Botões do menu lateral (ADICIONANDO RATEIO RH)
  const botoesMenu = [
    {
      id: 'GERAL' as VistaAtiva,
      icon: Globe,
      label: 'VISÃO GERAL',
      color: 'bg-blue-600 hover:bg-blue-700',
      iconBg: 'bg-blue-500/20',
      iconColor: 'text-blue-300'
    },
    {
      id: 'HYDRO' as VistaAtiva,
      icon: Factory,
      label: 'HYDRO',
      color: 'bg-cyan-600 hover:bg-cyan-700',
      iconBg: 'bg-cyan-500/20',
      iconColor: 'text-cyan-300'
    },
    {
      id: 'NAVIO' as VistaAtiva,
      icon: Ship,
      label: 'NAVIOS',
      color: 'bg-purple-600 hover:bg-purple-700',
      iconBg: 'bg-purple-500/20',
      iconColor: 'text-purple-300'
    },
    {
      id: 'ALBRAS' as VistaAtiva,
      icon: Warehouse,
      label: 'ALBRAS',
      color: 'bg-amber-600 hover:bg-amber-700',
      iconBg: 'bg-amber-500/20',
      iconColor: 'text-amber-300'
    },
    {
      id: 'SANTOS_BRASIL' as VistaAtiva,
      icon: Building2,
      label: 'SANTOS BRASIL',
      color: 'bg-red-600 hover:bg-red-700',
      iconBg: 'bg-red-500/20',
      iconColor: 'text-red-300'
    },
    {
      id: 'RATEIO_RH' as VistaAtiva,
      icon: Users,
      label: 'RATEIO RH',
      color: 'bg-green-600 hover:bg-green-700',
      iconBg: 'bg-green-500/20',
      iconColor: 'text-green-300'
    }
  ];

  // Inicializar períodos
  useEffect(() => {
    const inicializar = async () => {
      setInicializando(true);
      try {
        const periodosDisponiveis = getPeriodosDisponiveis();
        setPeriodos(periodosDisponiveis);
        
        const periodoPadrao = getPeriodoPadrao();
        const periodoAtual = `${periodoPadrao.dataInicial}_${periodoPadrao.dataFinal}`;
        
        setFiltros({
          periodo: periodoAtual,
          local: 'todos'
        });

        console.log('📅 Período inicializado:', periodoAtual);
      } catch (error) {
        console.error('Erro ao inicializar:', error);
      } finally {
        setInicializando(false);
      }
    };

    inicializar();
  }, []);

  // Função para executar o comando SQL de atualização de CR
  const executarAtualizacaoCR = async () => {
    setAtualizandoCR(true);
    
    try {
      toast.info('Iniciando atualização de Centros de Resultado...', {
        duration: 3000,
      });

      // Executar o SQL de atualização usando rpc (Remote Procedure Call)
      const { data, error } = await supabase.rpc('executar_sql_direto', {
        sql_query: `
          UPDATE public.registro_operacoes ro
          SET centro_resultado = 
              CASE 
                  -- 1. Todas as operações HYDRO (independente de navio ou carga)
                  WHEN ro.op = 'HYDRO' THEN 'HYDRO - OPERACAO PORTUARIA CARVAO BAUXITA'
                  
                  -- 2. Todas as operações SANTOS BRASIL
                  WHEN ro.op = 'SANTOS BRASIL' THEN 'SANTOS BRASIL - PRANCHA'
                  
                  -- 3. Operações ALBRAS baseadas na CARGA DA TABELA registro_operacoes
                  WHEN ro.op = 'ALBRAS' AND UPPER(TRIM(ro.carga)) IN ('COQUE', 'PICHE', 'FLUORETO', 'OUTROS') 
                      THEN 'ALBRAS - COQUE, PICHE E FLUORETO'
                  
                  WHEN ro.op = 'ALBRAS' AND UPPER(TRIM(ro.carga)) = 'LINGOTE' 
                      THEN 'ALBRAS - CINTAGEM E TRANSPORTE DE ALUMÍNIO'
                  
                  -- 4. Operações baseadas na CARGA DO NAVIO (tabela navios) quando não se enquadrarem acima
                  WHEN EXISTS (
                      SELECT 1 FROM public.navios n 
                      WHERE n.id = ro.navio_id 
                      AND UPPER(TRIM(n.carga)) IN ('HIDRATO', 'CARVAO', 'BAUXITA')
                  ) THEN 'HYDRO - OPERACAO PORTUARIA CARVAO BAUXITA'
                  
                  WHEN EXISTS (
                      SELECT 1 FROM public.navios n 
                      WHERE n.id = ro.navio_id 
                      AND UPPER(TRIM(n.carga)) IN ('COQUE', 'PICHE', 'FLUORETO')
                  ) THEN 'ALBRAS - COQUE, PICHE E FLUORETO'
                  
                  WHEN EXISTS (
                      SELECT 1 FROM public.navios n 
                      WHERE n.id = ro.navio_id 
                      AND UPPER(TRIM(n.carga)) = 'LINGOTE'
                  ) THEN 'ALBRAS - CINTAGEM E TRANSPORTE DE ALUMÍNIO'
                  
                  -- Caso padrão (manter NULL se não se enquadrar)
                  ELSE centro_resultado
              END
          WHERE ro.centro_resultado IS NULL;
        `
      });

      if (error) {
        console.error('❌ Erro ao executar atualização de CR:', error);
        
        // Tentar método alternativo se o rpc não estiver disponível
        toast.error('Erro ao executar atualização. Tentando método alternativo...', {
          duration: 3000,
        });
        
        await executarAtualizacaoCRAlternativo();
        return;
      }

      toast.success('Centros de Resultado atualizados com sucesso!', {
        duration: 5000,
      });

      // Atualizar os dados após a execução
      if (filtros.periodo) {
        buscarDadosEquipamentos();
      }

    } catch (error: any) {
      console.error('❌ Erro na atualização de CR:', error);
      toast.error(`Erro: ${error.message}`, {
        duration: 5000,
      });
    } finally {
      setAtualizandoCR(false);
    }
  };

  // Método alternativo para atualização de CR (usando uma função SQL criada)
  const executarAtualizacaoCRAlternativo = async () => {
    try {
      // Primeiro, vamos verificar quantos registros precisam ser atualizados
      const { count, error: countError } = await supabase
        .from('registro_operacoes')
        .select('*', { count: 'exact', head: true })
        .is('centro_resultado', null);

      if (countError) throw countError;

      const totalParaAtualizar = count || 0;

      toast.info(`Encontrados ${totalParaAtualizar} registros sem Centro de Resultado`, {
        duration: 3000,
      });

      // Se não há registros para atualizar
      if (totalParaAtualizar === 0) {
        toast.success('Todos os registros já possuem Centro de Resultado definido!', {
          duration: 3000,
        });
        return;
      }

      // Vamos atualizar em lotes para evitar timeouts
      const batchSize = 100;
      let registrosAtualizados = 0;
      let offset = 0;
      let hasMore = true;

      while (hasMore && offset < 1000) { // Limite de segurança
        // Buscar registros sem centro_resultado
        const { data: registros, error: fetchError } = await supabase
          .from('registro_operacoes')
          .select('id, op, carga, navio_id')
          .is('centro_resultado', null)
          .range(offset, offset + batchSize - 1);

        if (fetchError) throw fetchError;

        if (!registros || registros.length === 0) {
          hasMore = false;
          break;
        }

        // Para cada registro, determinar o centro_resultado
        const updates = [];
        for (const registro of registros) {
          let centroResultado = null;

          // 1. Todas as operações HYDRO
          if (registro.op === 'HYDRO') {
            centroResultado = 'HYDRO - OPERACAO PORTUARIA CARVAO BAUXITA';
          }
          // 2. Todas as operações SANTOS BRASIL
          else if (registro.op === 'SANTOS BRASIL') {
            centroResultado = 'SANTOS BRASIL - PRANCHA';
          }
          // 3. Operações ALBRAS baseadas na CARGA
          else if (registro.op === 'ALBRAS') {
            const cargaUpper = registro.carga ? registro.carga.toUpperCase().trim() : '';
            if (['COQUE', 'PICHE', 'FLUORETO', 'OUTROS'].includes(cargaUpper)) {
              centroResultado = 'ALBRAS - COQUE, PICHE E FLUORETO';
            } else if (cargaUpper === 'LINGOTE') {
              centroResultado = 'ALBRAS - CINTAGEM E TRANSPORTE DE ALUMÍNIO';
            }
          }

          // 4. Se ainda não determinou, buscar info do navio
          if (!centroResultado && registro.navio_id) {
            const { data: navio, error: navioError } = await supabase
              .from('navios')
              .select('carga')
              .eq('id', registro.navio_id)
              .single();

            if (!navioError && navio) {
              const cargaNavio = navio.carga ? navio.carga.toUpperCase().trim() : '';
              
              if (['HIDRATO', 'CARVAO', 'BAUXITA'].includes(cargaNavio)) {
                centroResultado = 'HYDRO - OPERACAO PORTUARIA CARVAO BAUXITA';
              } else if (['COQUE', 'PICHE', 'FLUORETO'].includes(cargaNavio)) {
                centroResultado = 'ALBRAS - COQUE, PICHE E FLUORETO';
              } else if (cargaNavio === 'LINGOTE') {
                centroResultado = 'ALBRAS - CINTAGEM E TRANSPORTE DE ALUMÍNIO';
              }
            }
          }

          // Adicionar à lista de updates se encontrou um centro_resultado
          if (centroResultado) {
            updates.push({
              id: registro.id,
              centro_resultado: centroResultado
            });
          }
        }

        // Executar updates em lote
        if (updates.length > 0) {
          for (const update of updates) {
            const { error: updateError } = await supabase
              .from('registro_operacoes')
              .update({ centro_resultado: update.centro_resultado })
              .eq('id', update.id);

            if (updateError) {
              console.error('Erro ao atualizar registro:', update.id, updateError);
            } else {
              registrosAtualizados++;
            }
          }
        }

        offset += batchSize;

        // Atualizar progresso
        if (offset % 500 === 0) {
          toast.info(`Processados ${offset} registros...`, {
            duration: 2000,
          });
        }
      }

      toast.success(`Atualização concluída! ${registrosAtualizados} registros foram atualizados.`, {
        duration: 5000,
      });

      // Atualizar os dados após a execução
      if (filtros.periodo) {
        buscarDadosEquipamentos();
      }

    } catch (error: any) {
      console.error('❌ Erro no método alternativo:', error);
      toast.error(`Erro no método alternativo: ${error.message}`, {
        duration: 5000,
      });
    }
  };

  // Função para buscar dados com paginação
  const buscarDadosEquipamentos = async () => {
    setCarregando(true);
    
    try {
      if (!filtros.periodo) {
        console.log('❌ Período não selecionado');
        limparDados();
        return;
      }

      const [dataInicial, dataFinal] = filtros.periodo.split('_');
      
      console.log('🔍 Buscando dados para período:', {
        dataInicial: formatarDataBR(dataInicial),
        dataFinal: formatarDataBR(dataFinal),
        local: filtros.local
      });

      // 1. Primeiro buscar todos os navios para ter a informação de carga e quantidade total
      const { data: todosNavios, error: errorNavios } = await supabase
        .from('navios')
        .select('id, nome_navio, carga, quantidade_prevista');
      
      if (errorNavios) {
        console.error('❌ Erro ao buscar navios:', errorNavios);
        throw new Error(`Erro ao buscar navios: ${errorNavios.message}`);
      }

      // Criar mapa de navios para acesso rápido
      const naviosMap = new Map();
      todosNavios?.forEach(navio => {
        naviosMap.set(navio.id, {
          nome_navio: navio.nome_navio,
          carga: navio.carga || 'NÃO INFORMADO',
          quantidade_total: navio.quantidade_prevista || 0
        });
      });

      console.log('✅ Navios carregados:', todosNavios?.length);

      // 2. Buscar operações com paginação
      const allOperacoes = await buscarComPaginacao(
        supabase.from('registro_operacoes')
          .select('id, op, data, navio_id, carga, centro_resultado')
          .gte('data', dataInicial)
          .lte('data', dataFinal)
          .order('data', { ascending: false })
      );

      console.log('✅ Total de operações encontradas:', allOperacoes.length);

      if (allOperacoes.length === 0) {
        console.log('📭 Nenhuma operação encontrada');
        limparDados();
        return;
      }

      // 3. Buscar equipamentos INCLUINDO todos os dados
      let queryEquipamentos = supabase
        .from('equipamentos')
        .select('local, horas_trabalhadas, registro_operacoes_id, tag_generico, tag, categoria_nome')
        .in('registro_operacoes_id', allOperacoes.map(op => op.id));

      if (filtros.local !== 'todos') {
        queryEquipamentos = queryEquipamentos.eq('local', filtros.local);
      }

      const allEquipamentos = await buscarComPaginacao(queryEquipamentos);
      console.log('✅ Total de equipamentos encontrados:', allEquipamentos.length);

      if (allEquipamentos.length === 0) {
        console.log('📭 Nenhum equipamento encontrado');
        limparDados();
        return;
      }

      // Processar dados para todas as vistas
      processarDadosParaVistas(allEquipamentos, allOperacoes, naviosMap);

    } catch (error: any) {
      console.error('❌ Erro ao processar dados:', error);
      limparDados();
    } finally {
      setCarregando(false);
    }
  };

  // Função auxiliar para busca com paginação
  const buscarComPaginacao = async (query: any) => {
    let allData: any[] = [];
    let page = 0;
    const pageSize = 1000;
    let hasMore = true;

    while (hasMore) {
      const from = page * pageSize;
      const to = from + pageSize - 1;

      const { data, error } = await query.range(from, to);

      if (error) throw error;

      if (data) {
        allData = [...allData, ...data];
      }

      hasMore = data && data.length === pageSize;
      page++;
    }

    return allData;
  };

  // Limpar dados
  const limparDados = () => {
    setDadosGeral({ locais: [], tags: [], categorias: [] });
    setDadosNavio({ navios: [], detalhesNavios: {}, categoriasNavios: {} });
    setDadosAlbras({ tags: [], categorias: [] });
    setDadosSantosBrasil({ tags: [], categorias: [] });
    setDadosHydro({ tags: [], categorias: [] });
    setDadosRateioRH([]);
    setTotais({ horas: 0, quantidade: 0 });
  };

  // Processar dados para Rateio RH
  const processarDadosRateioRH = (equipamentos: any[], operacoes: any[]) => {
    // Criar mapa de operações para acesso rápido ao centro_resultado
    const operacoesMap = new Map();
    operacoes.forEach(op => {
      operacoesMap.set(op.id, {
        centro_resultado: op.centro_resultado || 'NÃO INFORMADO'
      });
    });

    // Filtar apenas categorias TRUCK, OPERADOR, CARRETEIRO
    const categoriasFiltradas = ['TRUCK', 'OPERADOR', 'CARRETEIRO'];
    const equipamentosFiltrados = equipamentos.filter(equip => 
      categoriasFiltradas.includes(equip.categoria_nome)
    );

    console.log('🔍 Equipamentos filtrados para rateio RH:', equipamentosFiltrados.length);

    // Agrupar por centro_resultado e categoria
    const agrupadoPorCentroCategoria: Record<string, Record<string, number>> = {};

    equipamentosFiltrados.forEach(equipamento => {
      const operacao = operacoesMap.get(equipamento.registro_operacoes_id);
      if (!operacao) return;

      const centroResultado = operacao.centro_resultado || 'NÃO INFORMADO';
      const categoria = equipamento.categoria_nome;
      const horas = Number(equipamento.horas_trabalhadas) || 0;

      // Inicializar estrutura se não existir
      if (!agrupadoPorCentroCategoria[centroResultado]) {
        agrupadoPorCentroCategoria[centroResultado] = {
          TRUCK: 0,
          OPERADOR: 0,
          CARRETEIRO: 0
        };
      }

      // Acumular horas por categoria
      if (agrupadoPorCentroCategoria[centroResultado][categoria] !== undefined) {
        agrupadoPorCentroCategoria[centroResultado][categoria] += horas;
      }
    });

    // Calcular totais por categoria
    const totaisCategorias = {
      TRUCK: 0,
      OPERADOR: 0,
      CARRETEIRO: 0
    };

    Object.values(agrupadoPorCentroCategoria).forEach(centroData => {
      totaisCategorias.TRUCK += centroData.TRUCK;
      totaisCategorias.OPERADOR += centroData.OPERADOR;
      totaisCategorias.CARRETEIRO += centroData.CARRETEIRO;
    });

    // Converter para array de RateioRHData
    const rateioData: RateioRHData[] = Object.entries(agrupadoPorCentroCategoria)
      .map(([centro_resultado, categorias]) => {
        return {
          centro_resultado,
          truck: {
            horas: parseFloat(categorias.TRUCK.toFixed(3)),
            porcentagem: totaisCategorias.TRUCK > 0 ? 
              parseFloat(((categorias.TRUCK / totaisCategorias.TRUCK) * 100).toFixed(2)) : 0
          },
          operador: {
            horas: parseFloat(categorias.OPERADOR.toFixed(3)),
            porcentagem: totaisCategorias.OPERADOR > 0 ? 
              parseFloat(((categorias.OPERADOR / totaisCategorias.OPERADOR) * 100).toFixed(2)) : 0
          },
          carreteiro: {
            horas: parseFloat(categorias.CARRETEIRO.toFixed(3)),
            porcentagem: totaisCategorias.CARRETEIRO > 0 ? 
              parseFloat(((categorias.CARRETEIRO / totaisCategorias.CARRETEIRO) * 100).toFixed(2)) : 0
          }
        };
      })
      .sort((a, b) => {
        // Ordenar por HYDRO primeiro, depois ALBRAS, SANTOS BRASIL, outros
        const ordem = [
          'HYDRO - OPERACAO PORTUARIA CARVAO BAUXITA',
          'ALBRAS - CINTAGEM E TRANSPORTE DE ALUMÍNIO',
          'ALBRAS - COQUE, PICHE E FLUORETO',
          'SANTOS BRASIL - PRANCHA'
        ];
        const indexA = ordem.indexOf(a.centro_resultado);
        const indexB = ordem.indexOf(b.centro_resultado);
        
        if (indexA !== -1 && indexB !== -1) return indexA - indexB;
        if (indexA !== -1) return -1;
        if (indexB !== -1) return 1;
        return a.centro_resultado.localeCompare(b.centro_resultado);
      });

    // Adicionar linha de total
    if (Object.keys(agrupadoPorCentroCategoria).length > 0) {
      rateioData.push({
        centro_resultado: 'TOTAL',
        truck: {
          horas: parseFloat(totaisCategorias.TRUCK.toFixed(3)),
          porcentagem: 100
        },
        operador: {
          horas: parseFloat(totaisCategorias.OPERADOR.toFixed(3)),
          porcentagem: 100
        },
        carreteiro: {
          horas: parseFloat(totaisCategorias.CARRETEIRO.toFixed(3)),
          porcentagem: 100
        }
      });
    }

    setDadosRateioRH(rateioData);
  };

  // Processar dados para todas as vistas
  const processarDadosParaVistas = (
    equipamentos: any[], 
    operacoes: any[],
    naviosMap: Map<any, any>
  ) => {
    // Mapear operações para acesso rápido
    const operacoesMap = new Map();
    operacoes.forEach(op => {
      let nome_navio = 'NÃO INFORMADO';
      let carga = op.carga || 'NÃO INFORMADO';
      let quantidade_total = 0;
      
      if (op.navio_id) {
        const navioInfo = naviosMap.get(op.navio_id);
        if (navioInfo) {
          nome_navio = navioInfo.nome_navio;
          if (carga === 'NÃO INFORMADO' && navioInfo.carga) {
            carga = navioInfo.carga;
          }
          quantidade_total = navioInfo.quantidade_total || 0;
        }
      }
      
      operacoesMap.set(op.id, {
        navio_id: op.navio_id,
        carga: carga,
        nome_navio: nome_navio,
        quantidade_total: quantidade_total,
        centro_resultado: op.centro_resultado
      });
    });

    // Calcular totais gerais
    const horasTotais = equipamentos.reduce((sum, equip) => sum + (Number(equip.horas_trabalhadas) || 0), 0);
    const quantidadeTotal = equipamentos.length;
    
    setTotais({
      horas: parseFloat(horasTotais.toFixed(1)),
      quantidade: quantidadeTotal
    });

    // 1. Dados para VISÃO GERAL
    processarDadosGeral(equipamentos);
    
    // 2. Dados para NAVIOS
    processarDadosNavios(equipamentos, operacoesMap);
    
    // 3. Dados para HYDRO
    processarDadosPorLocal(equipamentos, 'HYDRO', setDadosHydro);
    
    // 4. Dados para ALBRAS
    processarDadosPorLocal(equipamentos, 'ALBRAS', setDadosAlbras);
    
    // 5. Dados para SANTOS BRASIL
    processarDadosPorLocal(equipamentos, 'SANTOS BRASIL', setDadosSantosBrasil);
    
    // 6. Dados para RATEIO RH
    processarDadosRateioRH(equipamentos, operacoes);
  };

  // Processar dados para visão geral (com categorias)
  const processarDadosGeral = (equipamentos: any[]) => {
    console.log('🔍 DEBUG: Total de equipamentos no processarDadosGeral:', equipamentos.length);
    
    // Agrupar por local
    const agrupadoPorLocal = equipamentos.reduce((acc, equipamento) => {
      const local = equipamento.local || 'NÃO INFORMADO';
      const localNormalizado = local.includes('NAVIO') ? 'NAVIO' : local;
      
      if (!acc[localNormalizado]) {
        acc[localNormalizado] = { horas: 0, quantidade: 0 };
      }
      
      acc[localNormalizado].horas += Number(equipamento.horas_trabalhadas) || 0;
      acc[localNormalizado].quantidade += 1;
      
      return acc;
    }, {} as Record<string, { horas: number; quantidade: number }>);

    // Filtrar locais principais
    const locaisPrincipais = ['HYDRO', 'NAVIO', 'SANTOS BRASIL', 'ALBRAS'];
    const dadosLocalFiltrado = Object.entries(agrupadoPorLocal)
      .filter(([local]) => locaisPrincipais.includes(local))
      .map(([local, dados]) => ({
        local,
        horas: parseFloat(dados.horas.toFixed(1)),
        quantidade: dados.quantidade,
        porcentagem: 0
      }))
      .sort((a, b) => b.horas - a.horas);

    const totalHorasLocais = dadosLocalFiltrado.reduce((sum, item) => sum + item.horas, 0);
    const dadosLocaisComPorcentagem = dadosLocalFiltrado.map(item => ({
      ...item,
      porcentagem: totalHorasLocais > 0 ? Math.round((item.horas / totalHorasLocais) * 100) : 0
    }));

    // Agrupar por tag genérico (incluindo valores vazios como "SEM TAG")
    const agrupadoPorTag = equipamentos.reduce((acc, equipamento) => {
      const tagGenerico = equipamento.tag_generico || 'OUTROS';
      
      if (!acc[tagGenerico]) {
        acc[tagGenerico] = { horas: 0, quantidade: 0 };
      }
      
      acc[tagGenerico].horas += Number(equipamento.horas_trabalhadas) || 0;
      acc[tagGenerico].quantidade += 1;
      
      return acc;
    }, {} as Record<string, { horas: number; quantidade: number }>);

    const dadosTags = Object.entries(agrupadoPorTag)
      .map(([tag_generico, dados]) => ({
        tag_generico: tag_generico === '' ? 'OUTROS' : tag_generico,
        horas: parseFloat(dados.horas.toFixed(1)),
        quantidade: dados.quantidade
      }))
      .sort((a, b) => b.horas - a.horas);

    // Agrupar por categoria_nome
    const agrupadoPorCategoria = equipamentos.reduce((acc, equipamento) => {
      const categoria = equipamento.categoria_nome || 'OUTROS';
      
      if (!acc[categoria]) {
        acc[categoria] = { horas: 0, quantidade: 0 };
      }
      
      acc[categoria].horas += Number(equipamento.horas_trabalhadas) || 0;
      acc[categoria].quantidade += 1;
      
      return acc;
    }, {} as Record<string, { horas: number; quantidade: number }>);

    const dadosCategorias = Object.entries(agrupadoPorCategoria)
      .map(([categoria_nome, dados]) => ({
        categoria_nome,
        horas: parseFloat(dados.horas.toFixed(1)),
        quantidade: dados.quantidade
      }))
      .sort((a, b) => b.horas - a.horas);

    setDadosGeral({
      locais: dadosLocaisComPorcentagem,
      tags: dadosTags,
      categorias: dadosCategorias
    });
  };

  // Processar dados para navios (com categorias)
  const processarDadosNavios = (equipamentos: any[], operacoesMap: Map<any, any>) => {
    const agrupadoPorNavioCarga: Record<string, NavioCargaData> = {};
    const detalhesPorNavioCarga: Record<string, Record<string, { horas: number; quantidade: number }>> = {};
    const categoriasPorNavioCarga: Record<string, Record<string, { horas: number; quantidade: number }>> = {};

    equipamentos.forEach(equipamento => {
      const operacao = operacoesMap.get(equipamento.registro_operacoes_id);
      if (operacao && operacao.navio_id && operacao.nome_navio !== 'NÃO INFORMADO') {
        const nomeNavio = operacao.nome_navio;
        const carga = operacao.carga;
        const quantidadeTotal = operacao.quantidade_total || 0;
        const tagGenerico = equipamento.tag_generico || 'OUTROS';
        const categoria = equipamento.categoria_nome || 'OUTROS';
        
        const chaveNavioCarga = `${nomeNavio} - ${carga}`;
        const idUnico = `${nomeNavio}_${carga}_${operacao.navio_id}`;

        // Dados gerais do navio+carga
        if (!agrupadoPorNavioCarga[idUnico]) {
          agrupadoPorNavioCarga[idUnico] = {
            id: idUnico,
            nome_navio: nomeNavio,
            carga: carga,
            navio_carga: chaveNavioCarga,
            horas: 0,
            quantidade: 0,
            quantidade_total: quantidadeTotal,
            navio_id: operacao.navio_id
          };
        }
        agrupadoPorNavioCarga[idUnico].horas += Number(equipamento.horas_trabalhadas) || 0;
        agrupadoPorNavioCarga[idUnico].quantidade += 1;

        // Detalhes por tag genérico
        if (!detalhesPorNavioCarga[chaveNavioCarga]) {
          detalhesPorNavioCarga[chaveNavioCarga] = {};
        }
        if (!detalhesPorNavioCarga[chaveNavioCarga][tagGenerico]) {
          detalhesPorNavioCarga[chaveNavioCarga][tagGenerico] = { horas: 0, quantidade: 0 };
        }
        detalhesPorNavioCarga[chaveNavioCarga][tagGenerico].horas += Number(equipamento.horas_trabalhadas) || 0;
        detalhesPorNavioCarga[chaveNavioCarga][tagGenerico].quantidade += 1;

        // Detalhes por categoria
        if (!categoriasPorNavioCarga[chaveNavioCarga]) {
          categoriasPorNavioCarga[chaveNavioCarga] = {};
        }
        if (!categoriasPorNavioCarga[chaveNavioCarga][categoria]) {
          categoriasPorNavioCarga[chaveNavioCarga][categoria] = { horas: 0, quantidade: 0 };
        }
        categoriasPorNavioCarga[chaveNavioCarga][categoria].horas += Number(equipamento.horas_trabalhadas) || 0;
        categoriasPorNavioCarga[chaveNavioCarga][categoria].quantidade += 1;
      }
    });

    // Converter para arrays
    const naviosArray = Object.values(agrupadoPorNavioCarga)
      .sort((a, b) => b.horas - a.horas);

    const detalhesArray: Record<string, TagGenericoData[]> = {};
    Object.entries(detalhesPorNavioCarga).forEach(([navioCarga, tags]) => {
      detalhesArray[navioCarga] = Object.entries(tags)
        .map(([tag_generico, dados]) => ({
          tag_generico: tag_generico === '' ? 'OUTROS' : tag_generico,
          horas: parseFloat(dados.horas.toFixed(1)),
          quantidade: dados.quantidade
        }))
        .sort((a, b) => b.horas - a.horas);
    });

    const categoriasArray: Record<string, CategoriaData[]> = {};
    Object.entries(categoriasPorNavioCarga).forEach(([navioCarga, categorias]) => {
      categoriasArray[navioCarga] = Object.entries(categorias)
        .map(([categoria_nome, dados]) => ({
          categoria_nome,
          horas: parseFloat(dados.horas.toFixed(1)),
          quantidade: dados.quantidade
        }))
        .sort((a, b) => b.horas - a.horas);
    });

    setDadosNavio({
      navios: naviosArray,
      detalhesNavios: detalhesArray,
      categoriasNavios: categoriasArray
    });
  };

  // Processar dados por local específico (com categorias)
  const processarDadosPorLocal = (
    equipamentos: any[], 
    localFiltro: string,
    setState: React.Dispatch<React.SetStateAction<{tags: TagGenericoData[], categorias: CategoriaData[]}>>
  ) => {
    const equipamentosFiltrados = equipamentos.filter(
      equip => equip.local === localFiltro
    );

    console.log('🔍 DEBUG: Equipamentos filtrados para local', localFiltro, ':', equipamentosFiltrados.length);

    // Agrupar por tag genérico
    const agrupadoPorTag = equipamentosFiltrados.reduce((acc, equipamento) => {
      const tagGenerico = equipamento.tag_generico || 'OUTROS';
      
      if (!acc[tagGenerico]) {
        acc[tagGenerico] = { horas: 0, quantidade: 0 };
      }
      
      acc[tagGenerico].horas += Number(equipamento.horas_trabalhadas) || 0;
      acc[tagGenerico].quantidade += 1;
      
      return acc;
    }, {} as Record<string, { horas: number; quantidade: number }>);

    const dadosTags = Object.entries(agrupadoPorTag)
      .map(([tag_generico, dados]) => ({
        tag_generico: tag_generico === '' ? 'OUTROS' : tag_generico,
        horas: parseFloat(dados.horas.toFixed(1)),
        quantidade: dados.quantidade
      }))
      .sort((a, b) => b.horas - a.horas);

    // Agrupar por categoria
    const agrupadoPorCategoria = equipamentosFiltrados.reduce((acc, equipamento) => {
      const categoria = equipamento.categoria_nome || 'OUTROS';
      
      if (!acc[categoria]) {
        acc[categoria] = { horas: 0, quantidade: 0 };
      }
      
      acc[categoria].horas += Number(equipamento.horas_trabalhadas) || 0;
      acc[categoria].quantidade += 1;
      
      return acc;
    }, {} as Record<string, { horas: number; quantidade: number }>);

    const dadosCategorias = Object.entries(agrupadoPorCategoria)
      .map(([categoria_nome, dados]) => ({
        categoria_nome,
        horas: parseFloat(dados.horas.toFixed(1)),
        quantidade: dados.quantidade
      }))
      .sort((a, b) => b.horas - a.horas);

    setState({
      tags: dadosTags,
      categorias: dadosCategorias
    });
  };

  // Buscar dados quando filtros mudarem
  useEffect(() => {
    if (!inicializando && filtros.periodo) {
      buscarDadosEquipamentos();
    }
  }, [filtros, inicializando]);

  // Funções auxiliares
  const aplicarFiltros = () => {
    buscarDadosEquipamentos();
  };

  const limparFiltros = () => {
    const periodoPadrao = getPeriodoPadrao();
    const periodoAtual = `${periodoPadrao.dataInicial}_${periodoPadrao.dataFinal}`;
    
    setFiltros({
      periodo: periodoAtual,
      local: 'todos'
    });
  };

  // Renderizar gráfico de pizza
  const renderizarGraficoPizza = (dados: LocalData[]) => {
    if (dados.length === 0) return null;

    // Cores para o gráfico de pizza (mantido igual)
    const coresPizza = [
      '#3B82F6', '#10B981', '#8B5CF6', '#F59E0B', '#EF4444', '#06B6D4',
      '#8B5CF6', '#EC4899', '#84CC16', '#F97316', '#6366F1', '#14B8A6'
    ];

    return (
      <div className="relative w-64 h-64">
        <div className="absolute inset-0 rounded-full border-4 border-white/20">
          {dados.map((item, index) => {
            const porcentagemAcumulada = dados
              .slice(0, index)
              .reduce((acc, curr) => acc + curr.porcentagem, 0);
            
            return (
              <div
                key={item.local}
                className="absolute inset-0 rounded-full opacity-80"
                style={{
                  backgroundColor: coresPizza[index % coresPizza.length],
                  clipPath: `conic-gradient(from ${porcentagemAcumulada * 3.6}deg, transparent 0, transparent ${item.porcentagem * 3.6}deg, #0000 0)`
                }}
              />
            );
          })}
        </div>
        
        <div className="absolute inset-8 bg-blue-900/80 rounded-full backdrop-blur-sm flex items-center justify-center">
          <div className="text-center">
            <div className="text-white text-2xl font-bold">
              {dados.reduce((sum, item) => sum + item.horas, 0).toFixed(1)}h
            </div>
            <div className="text-blue-200 text-sm">Total</div>
          </div>
        </div>
      </div>
    );
  };

  // Renderizar visual de métricas para navios
  const renderizarMetricasNavios = (navios: NavioCargaData[], titulo: string) => {
    if (navios.length === 0) return null;

    const totalHoras = navios.reduce((sum, navio) => sum + navio.horas, 0);
    const totalEquipamentos = navios.reduce((sum, navio) => sum + navio.quantidade, 0);
    
    return (
      <div className="space-y-6">
        <h3 className="text-white font-semibold text-xl">{titulo}</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <Card className="bg-white/10 backdrop-blur-sm border-blue-200/30 text-white hover:shadow-lg transition-all hover:scale-[1.02]">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-blue-200 text-sm">Total Horas Trabalhadas</p>
                  <p className="text-3xl font-bold">{totalHoras.toFixed(1)}h</p>
                  <p className="text-blue-200 text-xs">Soma de horas dos navios</p>
                </div>
                <div className="bg-blue-500/20 p-3 rounded-xl">
                  <Clock className="h-6 w-6 text-blue-300" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white/10 backdrop-blur-sm border-green-200/30 text-white hover:shadow-lg transition-all hover:scale-[1.02]">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-blue-200 text-sm">Equipamentos Utilizados</p>
                  <p className="text-3xl font-bold">{totalEquipamentos}</p>
                  <p className="text-blue-200 text-xs">Quantidade total</p>
                </div>
                <div className="bg-green-500/20 p-3 rounded-xl">
                  <Package className="h-6 w-6 text-green-300" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Tabela de Detalhes por Navio */}
        <Card className="bg-white/10 backdrop-blur-sm border-blue-200/30">
          <CardContent className="p-6">
            <h4 className="text-white font-semibold text-lg mb-4">Detalhes por Navio + Carga</h4>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-white/20">
                    <th className="text-left py-3 px-4 text-white font-medium">Navio + Carga</th>
                    <th className="text-left py-3 px-4 text-white font-medium">Horas</th>
                    <th className="text-left py-3 px-4 text-white font-medium">Equipamentos</th>
                    <th className="text-left py-3 px-4 text-white font-medium">Quantidade Total</th>
                  </tr>
                </thead>
                <tbody>
                  {navios.slice(0, 10).map((navio, index) => (
                    <tr key={navio.id} className="border-b border-white/10 hover:bg-white/5">
                      <td className="py-3 px-4 text-white">
                        <div className="flex items-center">
                          <div 
                            className="w-3 h-3 rounded-full mr-3"
                            style={{ backgroundColor: `#3B82F6` }}
                          />
                          {navio.navio_carga}
                        </div>
                      </td>
                      <td className="py-3 px-4 text-white font-medium">{navio.horas.toFixed(1)}h</td>
                      <td className="py-3 px-4 text-blue-300">{navio.quantidade}</td>
                      <td className="py-3 px-4 text-amber-300">{navio.quantidade_total}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  };

  // Função para gerar gradiente de cores baseado no valor
  const getColorByValue = (value: number, maxValue: number, baseColor: string = '#3B82F6') => {
    if (maxValue === 0) return baseColor;
    
    // Calcula a intensidade baseada no valor relativo ao máximo
    const intensity = value / maxValue;
    
    // Para azul: mais escuro para valores maiores
    if (baseColor === '#3B82F6') {
      // Varia de azul claro (baixo) a azul escuro (alto)
      const darkenAmount = Math.floor(intensity * 40); // 0 a 40%
      return `hsl(217, 91%, ${60 - darkenAmount}%)`;
    }
    
    // Para outras cores base, ajuste similar
    return baseColor;
  };

  // Renderizar gráfico de barras vertical para tags ou categorias
  const renderizarGraficoBarrasVertical = (dados: any[], campoLabel: string, campoValor: string, titulo: string) => {
    if (dados.length === 0) return null;

    const maxValor = Math.max(...dados.map(item => item[campoValor]));
    const alturaFixa = 200; // Altura fixa para todas as colunas

    return (
      <div className="space-y-4">
        <h3 className="text-white font-semibold text-lg">{titulo}</h3>
        <div className="flex items-end space-x-2 h-80 overflow-x-auto pb-4">
          {dados.map((item, index) => {
            const cor = getColorByValue(item[campoValor], maxValor, '#3B82F6');
            
            return (
              <div key={index} className="flex flex-col items-center min-w-[100px]">
                {/* Coluna com altura fixa e borda branca */}
                <div className="relative">
                  <div
                    className="w-24 rounded-lg transition-all duration-500 hover:opacity-90 relative border-2 border-white shadow-lg" 
                    style={{
                      height: `${alturaFixa}px`,
                      backgroundColor: cor,
                    }}
                    title={`${item[campoLabel]}: ${item[campoValor].toFixed(1)}h`}
                  >
                    {/* Valor no meio da coluna com fundo semi-transparente */}
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="bg-black/40 backdrop-blur-sm rounded-md px-2 py-1">
                        <div className="text-white font-bold text-xl text-center">
                          {item[campoValor].toFixed(0)}h
                        </div>
                      </div>
                    </div>
                    
                    {/* Efeito de gradiente interno para mais profundidade */}
                    <div 
                      className="absolute inset-0 rounded-lg opacity-30"
                      style={{
                        background: `linear-gradient(to top, rgba(0,0,0,0.5) 0%, rgba(0,0,0,0) 50%)`
                      }}
                    />
                  </div>
                </div>
                
                {/* Descrição abaixo da coluna (acima da quantidade) */}
                <div className="text-sm text-white font-bold mt-2 h-auto max-h-20 text-center px-1">
                  {item[campoLabel]}
                </div>
                
                {/* MODIFICAÇÃO: Alterar "equip." para "apontamentos" */}
                <div className="text-xs text-white/70 mt-1">
                  {item.quantidade} apontamento{item.quantidade !== 1 ? 's' : ''}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  // Renderizar gráfico de barras horizontal
  const renderizarGraficoBarrasHorizontal = (dados: any[], campoLabel: string, campoValor: string, titulo: string) => {
    if (dados.length === 0) return null;

    const maxValor = Math.max(...dados.map(item => item[campoValor]));
    
    return (
      <div className="space-y-3">
        <h3 className="text-white font-semibold text-lg mb-4">{titulo}</h3>
        <div className="space-y-4">
          {dados.map((item, index) => {
            const porcentagem = (item[campoValor] / maxValor) * 100;
            const cor = getColorByValue(item[campoValor], maxValor, '#3B82F6');
            
            return (
              <div key={index} className="space-y-2">
                <div className="flex justify-between items-center">
                  <div>
                    {/* Descrição com fonte maior e negrito */}
                    <span className="text-white font-bold text-base">{item[campoLabel]}</span>
                    {/* Quantidade de equipamentos */}
                    <div className="text-xs text-blue-200 mt-1">
                      {item.quantidade} apontamento{item.quantidade !== 1 ? 's' : ''}
                    </div>
                  </div>
                  {/* Valor com fonte aumentada */}
                  <span className="text-blue-300 font-bold text-lg">{item[campoValor].toFixed(1)}h</span>
                </div>
                <div className="w-full bg-white/10 rounded-full h-6 relative">
                  <div 
                    className="h-6 rounded-full transition-all duration-500 relative border-2 border-white"
                    style={{
                      width: `${porcentagem}%`,
                      backgroundColor: cor,
                      minWidth: '40px'
                    }}
                  >
                    {/* Valor no meio da barra horizontal */}
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="bg-black/40 backdrop-blur-sm rounded-md px-2 py-1">
                        <span className="text-white font-bold text-sm">
                          {item[campoValor].toFixed(0)}h
                        </span>
                      </div>
                    </div>
                    
                    {/* Efeito de gradiente para barras horizontais */}
                    <div 
                      className="absolute inset-0 rounded-full opacity-50"
                      style={{
                        background: `linear-gradient(to right, rgba(255,255,255,0.3) 0%, rgba(255,255,255,0) 100%)`
                      }}
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  // Renderizar vista RATEIO RH
  const renderizarVistaRateioRH = () => {
    if (carregando) {
      return (
        <div className="flex justify-center items-center h-96">
          <div className="text-center">
            <div className="w-12 h-12 border-4 border-green-200 border-t-white rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-white">Carregando dados de rateio RH...</p>
          </div>
        </div>
      );
    }

    if (dadosRateioRH.length === 0) {
      return (
        <div className="flex justify-center items-center h-64">
          <Card className="bg-white/10 backdrop-blur-sm border-green-200/30">
            <CardContent className="p-6 text-center">
              <Calculator className="h-12 w-12 text-green-300 mx-auto mb-4" />
              <p className="text-white text-lg">Nenhum dado disponível para rateio RH</p>
              <p className="text-green-200 text-sm mt-2">
                Apenas categorias TRUCK, OPERADOR e CARRETEIRO são consideradas
              </p>
            </CardContent>
          </Card>
        </div>
      );
    }

    const totaisLinha = dadosRateioRH.find(item => item.centro_resultado === 'TOTAL');

    return (
      <>
        <Card className="mb-8 bg-white/10 backdrop-blur-sm border-green-200/30">
          <CardHeader>
            <CardTitle className="text-white">
              RATEIO RH - Distribuição por Centro de Resultado
            </CardTitle>
            <CardDescription className="text-green-200">
              Horas trabalhadas por categoria (TRUCK, OPERADOR, CARRETEIRO) distribuídas por Centro de Resultado
              {filtros.periodo && ` - Período: ${formatarDataBR(filtros.periodo.split('_')[0])} a ${formatarDataBR(filtros.periodo.split('_')[1])}`}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-white/20">
                    <th className="text-left py-3 px-4 text-white font-medium bg-green-900/30">CENTRO DE RESULTADO</th>
                    <th className="text-left py-3 px-4 text-white font-medium bg-blue-900/30">TRUCK</th>
                    <th className="text-left py-3 px-4 text-white font-medium bg-amber-900/30">OPERADOR</th>
                    <th className="text-left py-3 px-4 text-white font-medium bg-purple-900/30">CARRETEIRO</th>
                  </tr>
                </thead>
                <tbody>
                  {dadosRateioRH.map((item, index) => {
                    const isTotal = item.centro_resultado === 'TOTAL';
                    const bgClass = isTotal ? 'bg-green-900/20' : index % 2 === 0 ? 'bg-white/5' : 'bg-white/10';
                    
                    return (
                      <tr key={index} className={`border-b border-white/10 ${bgClass}`}>
                        <td className="py-3 px-4 text-white font-medium">
                          {item.centro_resultado}
                        </td>
                        <td className="py-3 px-4">
                          <div className="text-blue-300 font-bold">{item.truck.horas.toLocaleString('pt-BR', { minimumFractionDigits: 3 })}</div>
                          {!isTotal && (
                            <div className="text-blue-200 text-sm">{item.truck.porcentagem.toFixed(2)}%</div>
                          )}
                        </td>
                        <td className="py-3 px-4">
                          <div className="text-amber-300 font-bold">{item.operador.horas.toLocaleString('pt-BR', { minimumFractionDigits: 3 })}</div>
                          {!isTotal && (
                            <div className="text-amber-200 text-sm">{item.operador.porcentagem.toFixed(2)}%</div>
                          )}
                        </td>
                        <td className="py-3 px-4">
                          <div className="text-purple-300 font-bold">{item.carreteiro.horas.toLocaleString('pt-BR', { minimumFractionDigits: 3 })}</div>
                          {!isTotal && (
                            <div className="text-purple-200 text-sm">{item.carreteiro.porcentagem.toFixed(2)}%</div>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        {/* Totais por Categoria */}
        {totaisLinha && (
          <Card className="bg-white/10 backdrop-blur-sm border-green-200/30">
            <CardHeader>
              <CardTitle className="text-white">Totais por Categoria</CardTitle>
              <CardDescription className="text-green-200">
                Soma total de horas por categoria no período selecionado
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-blue-900/30 p-6 rounded-lg border border-blue-200/30">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-blue-200 text-sm">TRUCK</p>
                      <p className="text-3xl font-bold text-blue-300">
                        {totaisLinha.truck.horas.toLocaleString('pt-BR', { minimumFractionDigits: 3 })}
                      </p>
                      <p className="text-blue-200 text-xs">Total horas</p>
                    </div>
                    <div className="bg-blue-500/20 p-3 rounded-xl">
                      <Package className="h-6 w-6 text-blue-300" />
                    </div>
                  </div>
                </div>

                <div className="bg-amber-900/30 p-6 rounded-lg border border-amber-200/30">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-amber-200 text-sm">OPERADOR</p>
                      <p className="text-3xl font-bold text-amber-300">
                        {totaisLinha.operador.horas.toLocaleString('pt-BR', { minimumFractionDigits: 3 })}
                      </p>
                      <p className="text-amber-200 text-xs">Total horas</p>
                    </div>
                    <div className="bg-amber-500/20 p-3 rounded-xl">
                      <Users className="h-6 w-6 text-amber-300" />
                    </div>
                  </div>
                </div>

                <div className="bg-purple-900/30 p-6 rounded-lg border border-purple-200/30">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-purple-200 text-sm">CARRETEIRO</p>
                      <p className="text-3xl font-bold text-purple-300">
                        {totaisLinha.carreteiro.horas.toLocaleString('pt-BR', { minimumFractionDigits: 3 })}
                      </p>
                      <p className="text-purple-200 text-xs">Total horas</p>
                    </div>
                    <div className="bg-purple-500/20 p-3 rounded-xl">
                      <Ship className="h-6 w-6 text-purple-300" />
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </>
    );
  };

  // Renderizar vista ativa
  const renderizarVistaAtiva = () => {
    switch (vistaAtiva) {
      case 'GERAL':
        return (
          <>
            {/* Gráfico de Pizza por Local */}
            <Card className="mb-8 bg-white/10 backdrop-blur-sm border-blue-200/30">
              <CardHeader>
                <CardTitle className="text-white">Distribuição de Horas por Local</CardTitle>
                <CardDescription className="text-blue-200">
                  {filtros.periodo && `Período: ${formatarDataBR(filtros.periodo.split('_')[0])} a ${formatarDataBR(filtros.periodo.split('_')[1])}`}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {carregando ? (
                  <div className="flex justify-center items-center h-64">
                    <div className="text-center">
                      <div className="w-12 h-12 border-4 border-blue-200 border-t-white rounded-full animate-spin mx-auto mb-4"></div>
                      <p className="text-white">Carregando dados...</p>
                    </div>
                  </div>
                ) : dadosGeral.locais.length === 0 ? (
                  <div className="flex justify-center items-center h-64">
                    <p className="text-blue-200">Nenhum dado disponível</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    <div className="flex justify-center items-center">
                      {renderizarGraficoPizza(dadosGeral.locais)}
                    </div>
                    <div className="space-y-4">
                      <div className="grid grid-cols-1 gap-3">
                        {dadosGeral.locais.map((item, index) => (
                          <div key={item.local} className="flex items-center justify-between p-3 bg-white/5 rounded-lg hover:bg-white/10 transition-colors">
                            <div className="flex items-center gap-3">
                              <div 
                                className="w-4 h-4 rounded" 
                                style={{ backgroundColor: `#3B82F6` }}
                              />
                              <div>
                                <span className="text-white font-medium">{item.local}</span>
                                <div className="text-blue-200 text-xs">
                                  {item.quantidade} apontamento{item.quantidade !== 1 ? 's' : ''}
                                </div>
                              </div>
                            </div>
                            <div className="text-right">
                              <div className="text-white font-bold">{item.horas.toFixed(1)}h</div>
                              <div className="text-blue-200 text-sm">
                                {item.porcentagem}% do total
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Gráfico de Coluna por Tag Genérico */}
            <Card className="mb-8 bg-white/10 backdrop-blur-sm border-blue-200/30">
              <CardHeader>
                <CardTitle className="text-white">Horas por Tag Genérico</CardTitle>
                <CardDescription className="text-blue-200">
                  Tags genéricos com colunas de tamanho fixo (todos os dados incluídos)
                </CardDescription>
              </CardHeader>
              <CardContent>
                {dadosGeral.tags.length > 0 ? (
                  <div className="p-4">
                    {renderizarGraficoBarrasVertical(dadosGeral.tags, 'tag_generico', 'horas', 'Tag Genérico')}
                  </div>
                ) : (
                  <div className="flex justify-center items-center h-64">
                    <p className="text-blue-200">Nenhum dado de tag genérico disponível</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* GRÁFICO: Por Categoria */}
            <Card className="bg-white/10 backdrop-blur-sm border-blue-200/30">
              <CardHeader>
                <CardTitle className="text-white">Horas por Categoria</CardTitle>
                <CardDescription className="text-blue-200">
                  Distribuição de horas por tipo de equipamento/categoria com colunas fixas
                </CardDescription>
              </CardHeader>
              <CardContent>
                {dadosGeral.categorias.length > 0 ? (
                  <div className="p-4">
                    {renderizarGraficoBarrasVertical(dadosGeral.categorias, 'categoria_nome', 'horas', 'Categoria')}
                  </div>
                ) : (
                  <div className="flex justify-center items-center h-64">
                    <p className="text-blue-200">Nenhum dado de categoria disponível</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </>
        );

      case 'HYDRO':
        return (
          <>
            <Card className="mb-8 bg-white/10 backdrop-blur-sm border-blue-200/30">
              <CardHeader>
                <CardTitle className="text-white">HYDRO - Horas por Tag Genérico</CardTitle>
                <CardDescription className="text-blue-200">
                  Distribuição de horas trabalhadas no local HYDRO com colunas fixas
                </CardDescription>
              </CardHeader>
              <CardContent>
                {carregando ? (
                  <div className="flex justify-center items-center h-64">
                    <div className="text-center">
                      <div className="w-12 h-12 border-4 border-blue-200 border-t-white rounded-full animate-spin mx-auto mb-4"></div>
                      <p className="text-white">Carregando dados...</p>
                    </div>
                  </div>
                ) : dadosHydro.tags.length === 0 ? (
                  <div className="flex justify-center items-center h-64">
                    <p className="text-blue-200">Nenhum dado disponível para HYDRO</p>
                  </div>
                ) : (
                  <div className="p-4">
                    {renderizarGraficoBarrasVertical(dadosHydro.tags, 'tag_generico', 'horas', 'Tag Genérico')}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* GRÁFICO: HYDRO Por Categoria */}
            <Card className="bg-white/10 backdrop-blur-sm border-blue-200/30">
              <CardHeader>
                <CardTitle className="text-white">HYDRO - Horas por Categoria</CardTitle>
                <CardDescription className="text-blue-200">
                  Distribuição de horas por categoria no local HYDRO com colunas fixas
                </CardDescription>
              </CardHeader>
              <CardContent>
                {dadosHydro.categorias.length > 0 ? (
                  <div className="p-4">
                    {renderizarGraficoBarrasVertical(dadosHydro.categorias, 'categoria_nome', 'horas', 'Categoria')}
                  </div>
                ) : (
                  <div className="flex justify-center items-center h-64">
                    <p className="text-blue-200">Nenhum dado de categoria disponível para HYDRO</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </>
        );

      case 'NAVIO':
        return (
          <>
            {/* Métricas de Navio */}
            <Card className="mb-8 bg-white/10 backdrop-blur-sm border-blue-200/30">
              <CardHeader>
                <CardTitle className="text-white">Métricas de Navios</CardTitle>
                <CardDescription className="text-blue-200">
                  Soma de horas, quantidade de equipamentos e quantidade total por navio
                </CardDescription>
              </CardHeader>
              <CardContent>
                {carregando ? (
                  <div className="flex justify-center items-center h-96">
                    <div className="text-center">
                      <div className="w-12 h-12 border-4 border-blue-200 border-t-white rounded-full animate-spin mx-auto mb-4"></div>
                      <p className="text-white">Carregando dados de navios...</p>
                    </div>
                  </div>
                ) : dadosNavio.navios.length === 0 ? (
                  <div className="flex justify-center items-center h-64">
                    <p className="text-blue-200">Nenhum dado de navio disponível</p>
                  </div>
                ) : (
                  <div className="p-4">
                    {renderizarMetricasNavios(dadosNavio.navios, 'Resumo de Navios')}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* MODIFICAÇÃO: Gráficos detalhados por Navio+Carga - Tags (APENAS GRÁFICO DE COLUNAS) */}
            {Object.entries(dadosNavio.detalhesNavios).slice(0, 5).map(([navioCarga, tags]) => (
              <Card key={`${navioCarga}-tags`} className="mb-8 bg-white/10 backdrop-blur-sm border-blue-200/30">
                <CardHeader>
                  <CardTitle className="text-white">{navioCarga} - Tags</CardTitle>
                  <CardDescription className="text-blue-200">
                    Distribuição por Tag Genérico com colunas verticais fixas (todos os dados incluídos)
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {tags.length > 0 ? (
                    <div className="p-4">
                      {renderizarGraficoBarrasVertical(tags, 'tag_generico', 'horas', 'Tag Genérico')}
                    </div>
                  ) : (
                    <div className="flex justify-center items-center h-32">
                      <p className="text-blue-200">Nenhum dado disponível</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </>
        );

      case 'ALBRAS':
        return (
          <>
            <Card className="mb-8 bg-white/10 backdrop-blur-sm border-blue-200/30">
              <CardHeader>
                <CardTitle className="text-white">ALBRAS - Horas por Tag Genérico</CardTitle>
                <CardDescription className="text-blue-200">
                  Distribuição de horas trabalhadas no local ALBRAS com colunas fixas
                </CardDescription>
              </CardHeader>
              <CardContent>
                {carregando ? (
                  <div className="flex justify-center items-center h-64">
                    <div className="text-center">
                      <div className="w-12 h-12 border-4 border-blue-200 border-t-white rounded-full animate-spin mx-auto mb-4"></div>
                      <p className="text-white">Carregando dados...</p>
                    </div>
                  </div>
                ) : dadosAlbras.tags.length === 0 ? (
                  <div className="flex justify-center items-center h-64">
                    <p className="text-blue-200">Nenhum dado disponível para ALBRAS</p>
                  </div>
                ) : (
                  <div className="p-4">
                    {renderizarGraficoBarrasVertical(dadosAlbras.tags, 'tag_generico', 'horas', 'Tag Genérico')}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* GRÁFICO: ALBRAS Por Categoria */}
            <Card className="bg-white/10 backdrop-blur-sm border-blue-200/30">
              <CardHeader>
                <CardTitle className="text-white">ALBRAS - Horas por Categoria</CardTitle>
                <CardDescription className="text-blue-200">
                  Distribuição de horas por categoria no local ALBRAS com colunas fixas
                </CardDescription>
              </CardHeader>
              <CardContent>
                {dadosAlbras.categorias.length > 0 ? (
                  <div className="p-4">
                    {renderizarGraficoBarrasVertical(dadosAlbras.categorias, 'categoria_nome', 'horas', 'Categoria')}
                  </div>
                ) : (
                  <div className="flex justify-center items-center h-64">
                    <p className="text-blue-200">Nenhum dado de categoria disponível para ALBRAS</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </>
        );

      case 'SANTOS_BRASIL':
        return (
          <>
            <Card className="mb-8 bg-white/10 backdrop-blur-sm border-blue-200/30">
              <CardHeader>
                <CardTitle className="text-white">SANTOS BRASIL - Horas por Tag Genérico</CardTitle>
                <CardDescription className="text-blue-200">
                  Distribuição de horas trabalhadas no local SANTOS BRASIL com colunas fixas
                </CardDescription>
              </CardHeader>
              <CardContent>
                {carregando ? (
                  <div className="flex justify-center items-center h-64">
                    <div className="text-center">
                      <div className="w-12 h-12 border-4 border-blue-200 border-t-white rounded-full animate-spin mx-auto mb-4"></div>
                      <p className="text-white">Carregando dados...</p>
                    </div>
                  </div>
                ) : dadosSantosBrasil.tags.length === 0 ? (
                  <div className="flex justify-center items-center h-64">
                    <p className="text-blue-200">Nenhum dado disponível para SANTOS BRASIL</p>
                  </div>
                ) : (
                  <div className="p-4">
                    {renderizarGraficoBarrasVertical(dadosSantosBrasil.tags, 'tag_generico', 'horas', 'Tag Genérico')}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* GRÁFICO: SANTOS BRASIL Por Categoria */}
            <Card className="bg-white/10 backdrop-blur-sm border-blue-200/30">
              <CardHeader>
                <CardTitle className="text-white">SANTOS BRASIL - Horas por Categoria</CardTitle>
                <CardDescription className="text-blue-200">
                  Distribuição de horas por categoria no local SANTOS BRASIL com colunas fixas
                </CardDescription>
              </CardHeader>
              <CardContent>
                {dadosSantosBrasil.categorias.length > 0 ? (
                  <div className="p-4">
                    {renderizarGraficoBarrasVertical(dadosSantosBrasil.categorias, 'categoria_nome', 'horas', 'Categoria')}
                  </div>
                ) : (
                  <div className="flex justify-center items-center h-64">
                    <p className="text-blue-200">Nenhum dado de categoria disponível para SANTOS BRASIL</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </>
        );

      case 'RATEIO_RH':
        return renderizarVistaRateioRH();

      default:
        return null;
    }
  };

  if (inicializando) {
    return (
      <div className="min-h-screen bg-gray-900 p-6 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-200 border-t-white rounded-full animate-spin mx-auto mb-4"></div>
          <h2 className="text-2xl font-bold text-white mb-2">Carregando Dashboard</h2>
          <p className="text-blue-200">Inicializando dados do sistema...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      {/* Header Mobile */}
      <div className="lg:hidden bg-blue-900/80 backdrop-blur-md shadow-lg sticky top-0 z-10">
        <div className="flex justify-between items-center px-4 py-4">
          <div className="flex items-center space-x-4">
            <Button
              variant="ghost"
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="text-blue-300 hover:bg-blue-800/50"
              title="Abrir menu"
            >
              <Menu className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-xl font-bold text-white">Dashboard de Operações</h1>
              <p className="text-sm text-blue-300">{userProfile?.full_name || 'Usuário'}</p>
            </div>
          </div>
          <Button
            variant="ghost"
            onClick={() => navigate('/')}
            className="text-blue-300 hover:bg-blue-800/50"
            title="Menu Inicial"
          >
            <Home className="h-5 w-5" />
          </Button>
        </div>
      </div>

      {/* Sidebar Mobile */}
      {sidebarOpen && (
        <div className="lg:hidden fixed inset-0 z-50 bg-blue-900/95 backdrop-blur-sm">
          <div className="flex justify-between items-center p-4 border-b border-blue-600/30">
            <h2 className="text-xl font-bold text-white">Menu</h2>
            <Button
              variant="ghost"
              onClick={() => setSidebarOpen(false)}
              className="text-white hover:bg-white/20"
            >
              <X className="h-6 w-6" />
            </Button>
          </div>
          <div className="p-4 space-y-3 overflow-y-auto h-[calc(100%-80px)]">
            {/* Botões de Vista */}
            {botoesMenu.map((botao) => (
              <Button
                key={botao.id}
                onClick={() => {
                  setVistaAtiva(botao.id);
                  setSidebarOpen(false);
                }}
                className={`w-full h-16 ${vistaAtiva === botao.id ? 'ring-2 ring-white/30' : ''} ${
                  botao.color
                } text-white text-lg font-semibold rounded-xl transition-all duration-300 relative hover:shadow-lg hover:scale-[1.02]`}
              >
                <div className="flex items-center justify-start space-x-4 w-full">
                  <div className={`${botao.iconBg} p-3 rounded-lg`}>
                    <botao.icon className={`h-5 w-5 ${botao.iconColor}`} />
                  </div>
                  <span className="text-left">{botao.label}</span>
                </div>
              </Button>
            ))}
          </div>
        </div>
      )}

      {/* Desktop Layout */}
      <div className="hidden lg:flex min-h-screen">
        {/* Sidebar Desktop */}
        <div className="w-80 bg-blue-900/30 backdrop-blur-sm border-r border-blue-600/30 flex flex-col">
          {/* Sidebar Header */}
          <div className="p-6 border-b border-blue-600/30">
            <div className="flex items-center space-x-4">
              <div className="bg-blue-500/20 p-3 rounded-xl">
                <BarChart3 className="h-8 w-8 text-blue-300" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-white">Dashboard de Horas</h1>
                <p className="text-blue-300 text-sm">Análise de Operações</p>
              </div>
            </div>
          </div>

          {/* Botão Menu Inicial */}
          <div className="p-6 border-b border-blue-600/30">
            <Button
              onClick={() => navigate('/')}
              className="w-full text-white bg-blue-600 hover:bg-blue-700 rounded-xl transition-all duration-300 py-3 hover:shadow flex items-center justify-center"
            >
              <Home className="h-5 w-5 mr-2" />
              Menu Inicial
            </Button>
          </div>

          {/* Botão Atualizar CR */}
          <div className="p-6 border-b border-blue-600/30">
            <Button
              onClick={executarAtualizacaoCR}
              disabled={atualizandoCR}
              className={`w-full text-white ${atualizandoCR ? 'bg-gray-600' : 'bg-indigo-600 hover:bg-indigo-700'} rounded-xl transition-all duration-300 py-3 hover:shadow flex items-center justify-center`}
            >
              {atualizandoCR ? (
                <>
                  <RefreshCw className="h-5 w-5 mr-2 animate-spin" />
                  Atualizando...
                </>
              ) : (
                <>
                  <Database className="h-5 w-5 mr-2" />
                  Atualizar CR
                </>
              )}
            </Button>
            <p className="text-blue-200 text-xs mt-2 text-center">
              Preenche centros de resultado vazios
            </p>
          </div>

          {/* User Info */}
          <div className="p-6 border-b border-blue-600/30">
            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-blue-200/30">
              <p className="text-white font-semibold text-lg">{userProfile?.full_name || 'Usuário'}</p>
              <p className="text-blue-300 text-sm mt-1">Status: <span className="text-green-400 font-medium">Ativo</span></p>
              <p className="text-blue-300 text-sm mt-1">Último acesso: {new Date().toLocaleDateString('pt-BR')}</p>
            </div>
          </div>

          {/* Botões de Vista */}
          <div className="flex-1 p-6 space-y-3 overflow-y-auto">
            <h3 className="text-blue-200 font-semibold text-sm uppercase tracking-wider mb-4">Vistas</h3>
            {botoesMenu.map((botao) => (
              <Button
                key={botao.id}
                onClick={() => setVistaAtiva(botao.id)}
                className={`w-full h-16 ${vistaAtiva === botao.id ? 'ring-2 ring-white/30' : ''} ${
                  botao.color
                } text-white text-lg font-semibold rounded-xl transition-all duration-300 relative group hover:shadow-lg hover:scale-[1.02]`}
              >
                <div className="flex items-center justify-start space-x-4 w-full">
                  <div className={`${botao.iconBg} p-3 rounded-lg group-hover:bg-white/30 transition-colors`}>
                    <botao.icon className={`h-5 w-5 ${botao.iconColor}`} />
                  </div>
                  <span className="text-left">{botao.label}</span>
                </div>
              </Button>
            ))}
          </div>
        </div>

        {/* Main Content Desktop */}
        <div className="flex-1 flex flex-col overflow-y-auto">
          {/* Header com Filtros */}
          <div className="bg-blue-800/30 backdrop-blur-sm border-b border-blue-600/30 p-6">
            <div className="max-w-6xl">
              <h2 className="text-3xl font-bold text-white mb-4">
                {vistaAtiva === 'GERAL' ? 'Visão Geral' : 
                 vistaAtiva === 'HYDRO' ? 'Análise HYDRO' :
                 vistaAtiva === 'NAVIO' ? 'Análise de Navios' :
                 vistaAtiva === 'ALBRAS' ? 'Análise ALBRAS' : 
                 vistaAtiva === 'SANTOS_BRASIL' ? 'Análise SANTOS BRASIL' :
                 'RATEIO RH'}
              </h2>
              
              {/* Filtros */}
              <Card className="bg-white/10 backdrop-blur-sm border-blue-200/30">
                <CardContent className="p-4">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="periodo" className="text-white">Período (16 a 15)</Label>
                      <Select 
                        value={filtros.periodo} 
                        onValueChange={(value) => setFiltros({ ...filtros, periodo: value })}
                      >
                        <SelectTrigger className="bg-white/5 border-blue-300/30 text-white">
                          <SelectValue placeholder="Selecione o período" />
                        </SelectTrigger>
                        <SelectContent>
                          {periodos.map((periodo) => (
                            <SelectItem key={periodo.value} value={periodo.value}>
                              {periodo.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="local" className="text-white">Local</Label>
                      <Select 
                        value={filtros.local} 
                        onValueChange={(value) => setFiltros({ ...filtros, local: value })}
                      >
                        <SelectTrigger className="bg-white/5 border-blue-300/30 text-white">
                          <SelectValue placeholder="Selecione o local" />
                        </SelectTrigger>
                        <SelectContent>
                          {locais.map((local) => (
                            <SelectItem key={local.value} value={local.value}>
                              {local.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="flex items-end gap-2">
                      <Button 
                        onClick={aplicarFiltros}
                        className="bg-orange-500 hover:bg-orange-600 text-white flex-1"
                        disabled={carregando || !filtros.periodo}
                      >
                        <Filter className="h-4 w-4 mr-2" />
                        {carregando ? 'Aplicando...' : 'Aplicar Filtros'}
                      </Button>
                      <Button 
                        onClick={limparFiltros}
                        variant="outline"
                        className="border-blue-300/30 text-white hover:bg-white/10"
                        disabled={carregando}
                      >
                        Limpar
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Cards de Métricas */}
          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
              <Card className="bg-white/10 backdrop-blur-sm border-blue-200/30 text-white hover:shadow-lg transition-all hover:scale-[1.02]">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-blue-200 text-sm">Total Horas Trabalhadas</p>
                      <p className="text-3xl font-bold">{totais.horas.toFixed(1)}h</p>
                      <p className="text-blue-200 text-xs">Período selecionado</p>
                    </div>
                    <div className="bg-blue-500/20 p-3 rounded-xl">
                      <Clock className="h-6 w-6 text-blue-300" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-white/10 backdrop-blur-sm border-green-200/30 text-white hover:shadow-lg transition-all hover:scale-[1.02]">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-blue-200 text-sm">Total Equipamentos</p>
                      <p className="text-3xl font-bold">{totais.quantidade}</p>
                      <p className="text-blue-200 text-xs">Registros no período</p>
                    </div>
                    <div className="bg-green-500/20 p-3 rounded-xl">
                      <Package className="h-6 w-6 text-green-300" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Vista Ativa */}
            {renderizarVistaAtiva()}
          </div>
        </div>
      </div>

      {/* Mobile Content (quando sidebar fechada) */}
      {!sidebarOpen && (
        <div className="lg:hidden p-4">
          {/* Botões de Vista Mobile */}
          <div className="grid grid-cols-3 gap-4 mb-6">
            {botoesMenu.map((botao) => (
              <Button
                key={botao.id}
                onClick={() => setVistaAtiva(botao.id)}
                className={`h-20 ${vistaAtiva === botao.id ? 'ring-2 ring-white/30' : ''} ${
                  botao.color
                } text-white font-semibold rounded-lg`}
              >
                <div className="flex flex-col items-center">
                  <botao.icon className="h-5 w-5 mb-1" />
                  <span className="text-xs text-center">{botao.label}</span>
                </div>
              </Button>
            ))}
          </div>

          {/* Botão Atualizar CR Mobile */}
          <div className="mb-6">
            <Button
              onClick={executarAtualizacaoCR}
              disabled={atualizandoCR}
              className={`w-full text-white ${atualizandoCR ? 'bg-gray-600' : 'bg-indigo-600 hover:bg-indigo-700'} rounded-lg transition-all duration-300 py-4 flex items-center justify-center`}
            >
              {atualizandoCR ? (
                <>
                  <RefreshCw className="h-5 w-5 mr-2 animate-spin" />
                  Atualizando CR...
                </>
              ) : (
                <>
                  <Database className="h-5 w-5 mr-2" />
                  Atualizar CR
                </>
              )}
            </Button>
            <p className="text-blue-200 text-xs mt-2 text-center">
              Preenche centros de resultado vazios
            </p>
          </div>

          {/* Filtros Mobile */}
          <Card className="mb-8 bg-white/10 backdrop-blur-sm border-blue-200/30">
            <CardContent className="p-4 space-y-4">
              <div className="space-y-2">
                <Label htmlFor="periodo" className="text-white">Período (16 a 15)</Label>
                <Select 
                  value={filtros.periodo} 
                  onValueChange={(value) => setFiltros({ ...filtros, periodo: value })}
                >
                  <SelectTrigger className="bg-white/5 border-blue-300/30 text-white">
                    <SelectValue placeholder="Selecione o período" />
                  </SelectTrigger>
                  <SelectContent>
                    {periodos.map((periodo) => (
                      <SelectItem key={periodo.value} value={periodo.value}>
                        {periodo.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="local" className="text-white">Local</Label>
                <Select 
                  value={filtros.local} 
                  onValueChange={(value) => setFiltros({ ...filtros, local: value })}
                >
                  <SelectTrigger className="bg-white/5 border-blue-300/30 text-white">
                    <SelectValue placeholder="Selecione o local" />
                  </SelectTrigger>
                  <SelectContent>
                    {locais.map((local) => (
                      <SelectItem key={local.value} value={local.value}>
                        {local.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex gap-2 pt-2">
                <Button 
                  onClick={aplicarFiltros}
                  className="bg-orange-500 hover:bg-orange-600 text-white flex-1"
                  disabled={carregando || !filtros.periodo}
                >
                  <Filter className="h-4 w-4 mr-2" />
                  {carregando ? 'Aplicando...' : 'Aplicar'}
                </Button>
                <Button 
                  onClick={limparFiltros}
                  variant="outline"
                  className="border-blue-300/30 text-white hover:bg-white/10"
                  disabled={carregando}
                >
                  Limpar
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Cards de Métricas Mobile */}
          <div className="grid grid-cols-2 gap-4 mb-6">
            <Card className="bg-white/10 backdrop-blur-sm border-blue-200/30 text-white">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-blue-200 text-xs">Total Horas</p>
                    <p className="text-xl font-bold">{totais.horas.toFixed(1)}h</p>
                  </div>
                  <div className="bg-blue-500/20 p-2 rounded-lg">
                    <Clock className="h-4 w-4 text-blue-300" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-white/10 backdrop-blur-sm border-green-200/30 text-white">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-blue-200 text-xs">Total Equipamentos</p>
                    <p className="text-xl font-bold">{totais.quantidade}</p>
                  </div>
                  <div className="bg-green-500/20 p-2 rounded-lg">
                    <Package className="h-4 w-4 text-green-300" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Vista Ativa Mobile */}
          <div className="mt-4">
            {renderizarVistaAtiva()}
          </div>
        </div>
      )}
    </div>
  );
};

export default Visuais;