// src/hooks/useMasterDrive.ts

import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { 
  Treinamento, 
  Desvio, 
  FiltrosMasterDrive, 
  Indicadores,
  Colaborador,
  TipoTreinamento
} from '@/types/masterDrive';

export const useMasterDrive = () => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [colaboradores, setColaboradores] = useState<Colaborador[]>([]);
  const [tiposTreinamento, setTiposTreinamento] = useState<TipoTreinamento[]>([]);
  const [treinamentos, setTreinamentos] = useState<(Treinamento & { participantes?: Colaborador[] })[]>([]);
  const [desvios, setDesvios] = useState<Desvio[]>([]);
  const [indicadores, setIndicadores] = useState<Indicadores>({
    totalHorasTreinamento: 0,
    totalTreinamentos: 0,
    totalParticipantes: 0,
    totalDesvios: 0,
    desviosAbertos: 0,
    desviosTratados: 0,
    horasPorTipo: [],
    treinamentosPorTopico: [],
    evolucaoMensal: [],
    rankingColaboradores: []
  });
  const [filtros, setFiltros] = useState<FiltrosMasterDrive>({});

  // Carregar dados iniciais
  useEffect(() => {
    carregarDadosBase();
  }, []);

  useEffect(() => {
    carregarTreinamentos();
    carregarDesvios();
    calcularIndicadores();
  }, [filtros]);

  const carregarDadosBase = async () => {
    try {
      // Carregar colaboradores ativos
      const { data: colaboradoresData, error: colaboradoresError } = await supabase
        .from('colaboradores')
        .select('id, nome_completo, funcao_atual, cpf, matricula, ativo')
        .eq('ativo', true)
        .order('nome_completo');

      if (colaboradoresError) throw colaboradoresError;
      setColaboradores(colaboradoresData || []);

      // Carregar tipos de treinamento
      const { data: tiposData, error: tiposError } = await supabase
        .from('master_tipos_treinamento')
        .select('*')
        .eq('ativo', true);

      if (tiposError) throw tiposError;
      setTiposTreinamento(tiposData || []);

    } catch (error: any) {
      console.error("Erro ao carregar dados base:", error);
      toast({
        title: "Erro",
        description: error.message,
        variant: "destructive"
      });
    }
  };

  const carregarTreinamentos = async () => {
    setLoading(true);
    try {
      // Buscar todos os treinamentos
      let query = supabase
        .from('master_treinamentos')
        .select('*')
        .order('data_treinamento', { ascending: false });

      if (filtros.dataInicio) {
        query = query.gte('data_treinamento', filtros.dataInicio);
      }
      if (filtros.dataFim) {
        query = query.lte('data_treinamento', filtros.dataFim);
      }
      if (filtros.tipoTreinamentoId) {
        query = query.eq('tipo_treinamento_id', filtros.tipoTreinamentoId);
      }
      if (filtros.topico) {
        query = query.ilike('topico_treinamento', `%${filtros.topico}%`);
      }

      const { data: treinamentosData, error: treinamentosError } = await query;

      if (treinamentosError) throw treinamentosError;

      if (!treinamentosData || treinamentosData.length === 0) {
        setTreinamentos([]);
        return;
      }

      // Buscar os tipos de treinamento
      const tipoIds = [...new Set(treinamentosData.map(t => t.tipo_treinamento_id).filter(Boolean))];
      let tiposMap = new Map();
      
      if (tipoIds.length > 0) {
        const { data: tiposData, error: tiposError } = await supabase
          .from('master_tipos_treinamento')
          .select('id, nome, codigo')
          .in('id', tipoIds);

        if (!tiposError && tiposData) {
          tiposData.forEach(tipo => {
            tiposMap.set(tipo.id, tipo);
          });
        }
      }

      // Buscar os participantes
      const treinamentoIds = treinamentosData.map(t => t.id);
      let participantesPorTreinamento = new Map();
      let colaboradoresMap = new Map();

      if (treinamentoIds.length > 0) {
        const { data: participantesData, error: participantesError } = await supabase
          .from('master_participantes_treinamento')
          .select('treinamento_id, colaborador_id')
          .in('treinamento_id', treinamentoIds);

        if (!participantesError && participantesData) {
          // Coletar todos os IDs de colaboradores participantes
          const colaboradorIds = [...new Set(participantesData.map(p => p.colaborador_id))];
          
          if (colaboradorIds.length > 0) {
            const { data: colsData, error: colsError } = await supabase
              .from('colaboradores')
              .select('id, nome_completo, funcao_atual')
              .in('id', colaboradorIds);

            if (!colsError && colsData) {
              colsData.forEach(col => {
                colaboradoresMap.set(col.id, col);
              });
            }
          }

          // Agrupar participantes por treinamento
          participantesData.forEach(p => {
            if (!participantesPorTreinamento.has(p.treinamento_id)) {
              participantesPorTreinamento.set(p.treinamento_id, []);
            }
            const colaborador = colaboradoresMap.get(p.colaborador_id);
            if (colaborador) {
              participantesPorTreinamento.get(p.treinamento_id).push(colaborador);
            }
          });
        }
      }

      // Montar os treinamentos com os dados relacionados
      // IMPORTANTE: Manter a data como string original do banco
      const treinamentosCompletos = treinamentosData.map(t => ({
        ...t,
        data_treinamento: t.data_treinamento,
        tipo_treinamento: tiposMap.get(t.tipo_treinamento_id),
        participantes: participantesPorTreinamento.get(t.id) || []
      }));

      setTreinamentos(treinamentosCompletos);
    } catch (error: any) {
      console.error("Erro ao carregar treinamentos:", error);
      toast({
        title: "Erro",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const carregarDesvios = async () => {
    try {
      // Buscar todos os desvios
      let query = supabase
        .from('master_desvios')
        .select('*')
        .order('data_desvio', { ascending: false });

      if (filtros.dataInicio) {
        query = query.gte('data_desvio', filtros.dataInicio);
      }
      if (filtros.dataFim) {
        query = query.lte('data_desvio', filtros.dataFim);
      }
      if (filtros.colaboradorId) {
        query = query.eq('colaborador_id', filtros.colaboradorId);
      }
      if (filtros.situacaoDesvio) {
        query = query.eq('situacao', filtros.situacaoDesvio);
      }

      const { data: desviosData, error: desviosError } = await query;

      if (desviosError) throw desviosError;

      if (!desviosData || desviosData.length === 0) {
        setDesvios([]);
        return;
      }

      // Buscar os colaboradores dos desvios
      const colaboradorIds = [...new Set(desviosData.map(d => d.colaborador_id).filter(Boolean))];
      let colaboradoresMap = new Map();

      if (colaboradorIds.length > 0) {
        const { data: colsData, error: colsError } = await supabase
          .from('colaboradores')
          .select('id, nome_completo, funcao_atual')
          .in('id', colaboradorIds);

        if (!colsError && colsData) {
          colsData.forEach(col => {
            colaboradoresMap.set(col.id, col);
          });
        }
      }

      // Montar os desvios com os colaboradores
      const desviosCompletos = desviosData.map(d => ({
        ...d,
        colaborador: colaboradoresMap.get(d.colaborador_id)
      }));

      setDesvios(desviosCompletos);
    } catch (error: any) {
      console.error("Erro ao carregar desvios:", error);
      toast({
        title: "Erro",
        description: error.message,
        variant: "destructive"
      });
    }
  };

  const calcularIndicadores = async () => {
    try {
      // Buscar todos os treinamentos
      const { data: treinamentosData, error: treinamentosError } = await supabase
        .from('master_treinamentos')
        .select('*')
        .gte('data_treinamento', filtros.dataInicio || '2024-01-01')
        .lte('data_treinamento', filtros.dataFim || new Date().toISOString().split('T')[0]);

      if (treinamentosError) throw treinamentosError;

      const treinamentosList = treinamentosData || [];

      // Buscar tipos de treinamento
      const tipoIds = [...new Set(treinamentosList.map(t => t.tipo_treinamento_id).filter(Boolean))];
      let tiposMap = new Map();
      
      if (tipoIds.length > 0) {
        const { data: tiposData } = await supabase
          .from('master_tipos_treinamento')
          .select('id, nome')
          .in('id', tipoIds);
        
        if (tiposData) {
          tiposData.forEach(tipo => {
            tiposMap.set(tipo.id, tipo.nome);
          });
        }
      }

      // Buscar participantes
      const treinamentoIds = treinamentosList.map(t => t.id);
      let participantesPorTreinamento = new Map();

      if (treinamentoIds.length > 0) {
        const { data: participantesData } = await supabase
          .from('master_participantes_treinamento')
          .select('treinamento_id, colaborador_id')
          .in('treinamento_id', treinamentoIds);
        
        if (participantesData) {
          participantesData.forEach(p => {
            if (!participantesPorTreinamento.has(p.treinamento_id)) {
              participantesPorTreinamento.set(p.treinamento_id, []);
            }
            participantesPorTreinamento.get(p.treinamento_id).push(p.colaborador_id);
          });
        }
      }

      // Função para converter interval para horas decimais
      const intervalToHours = (interval: string): number => {
        if (!interval) return 0;
        const parts = interval.split(':');
        if (parts.length === 3) {
          return parseInt(parts[0]) + parseInt(parts[1]) / 60 + parseInt(parts[2]) / 3600;
        }
        return 0;
      };

      // Total de horas
      const totalHoras = treinamentosList.reduce((acc, t) => {
        return acc + intervalToHours(t.carga_horaria_total);
      }, 0);

      // Total de participantes únicos
      const participantesSet = new Set();
      participantesPorTreinamento.forEach(participantes => {
        participantes.forEach(p => participantesSet.add(p));
      });

      // Horas por tipo e treinamentos por tópico
      const horasPorTipoMap: Record<string, number> = {};
      const treinamentosPorTopicoMap: Record<string, number> = {};
      
      treinamentosList.forEach(t => {
        const tipoNome = tiposMap.get(t.tipo_treinamento_id) || 'Outros';
        horasPorTipoMap[tipoNome] = (horasPorTipoMap[tipoNome] || 0) + intervalToHours(t.carga_horaria_total);
        
        const topicoNome = t.topico_treinamento || 'Não informado';
        treinamentosPorTopicoMap[topicoNome] = (treinamentosPorTopicoMap[topicoNome] || 0) + 1;
      });

      // Ranking de colaboradores - buscar nomes
      const rankingMap: Record<string, { nome: string; horas: number }> = {};
      
      // Coletar todos os IDs de colaboradores que aparecem nos treinamentos
      const todosColaboradoresIds = new Set<string>();
      participantesPorTreinamento.forEach(participantes => {
        participantes.forEach(id => todosColaboradoresIds.add(id));
      });
      
      // Buscar nomes de todos os colaboradores necessários
      let colaboradoresNomeMap = new Map();
      if (todosColaboradoresIds.size > 0) {
        const { data: colsData } = await supabase
          .from('colaboradores')
          .select('id, nome_completo')
          .in('id', Array.from(todosColaboradoresIds));
        
        if (colsData) {
          colsData.forEach(col => {
            colaboradoresNomeMap.set(col.id, col.nome_completo);
          });
        }
      }
      
      // Calcular ranking
      for (const t of treinamentosList) {
        const horasPorParticipante = intervalToHours(t.carga_horaria_base);
        const participantes = participantesPorTreinamento.get(t.id) || [];
        
        for (const colaboradorId of participantes) {
          if (rankingMap[colaboradorId]) {
            rankingMap[colaboradorId].horas += horasPorParticipante;
          } else {
            rankingMap[colaboradorId] = {
              nome: colaboradoresNomeMap.get(colaboradorId) || colaboradorId,
              horas: horasPorParticipante
            };
          }
        }
      }

      setIndicadores({
        totalHorasTreinamento: totalHoras,
        totalTreinamentos: treinamentosList.length,
        totalParticipantes: participantesSet.size,
        totalDesvios: desvios.length,
        desviosAbertos: desvios.filter(d => d.situacao === 'EM_ABERTO').length,
        desviosTratados: desvios.filter(d => d.situacao === 'TRATADO').length,
        horasPorTipo: Object.entries(horasPorTipoMap).map(([tipo, horas]) => ({ tipo, horas })),
        treinamentosPorTopico: Object.entries(treinamentosPorTopicoMap)
          .map(([topico, quantidade]) => ({ topico, quantidade }))
          .sort((a, b) => b.quantidade - a.quantidade)
          .slice(0, 10),
        evolucaoMensal: [],
        rankingColaboradores: Object.values(rankingMap).sort((a, b) => b.horas - a.horas).slice(0, 10)
      });
    } catch (error) {
      console.error("Erro ao calcular indicadores:", error);
    }
  };

  const converterIntervaloParaHoras = (intervalo: string): number => {
    if (!intervalo) return 0;
    const parts = intervalo.split(':');
    if (parts.length === 3) {
      return parseInt(parts[0]) + parseInt(parts[1]) / 60 + parseInt(parts[2]) / 3600;
    }
    return 0;
  };

  const formatarIntervalo = (horas: number): string => {
    const horasInt = Math.floor(horas);
    const minutos = Math.round((horas % 1) * 60);
    return `${horasInt.toString().padStart(2, '0')}:${minutos.toString().padStart(2, '0')}:00`;
  };

  const adicionarTreinamento = async (
    treinamentoData: {
      tipo_treinamento_id: string;
      topico_treinamento: string;
      equipamento: string;
      data_treinamento: string;
      carga_horaria_base: string;
      instrutor?: string;
      local?: string;
      observacoes?: string;
    },
    participantesIds: string[]
  ) => {
    try {
      const qtdParticipantes = participantesIds.length;
      const horasBase = converterIntervaloParaHoras(treinamentoData.carga_horaria_base);
      const horasTotal = horasBase * qtdParticipantes;
      const cargaHorariaTotalFormat = formatarIntervalo(horasTotal);

      // Inserir treinamento
      const { data: treinamento, error: treinamentoError } = await supabase
        .from('master_treinamentos')
        .insert([{
          tipo_treinamento_id: treinamentoData.tipo_treinamento_id,
          topico_treinamento: treinamentoData.topico_treinamento,
          equipamento: treinamentoData.equipamento || null,
          data_treinamento: treinamentoData.data_treinamento,
          carga_horaria_base: treinamentoData.carga_horaria_base,
          carga_horaria_total: cargaHorariaTotalFormat,
          instrutor: treinamentoData.instrutor || null,
          local: treinamentoData.local || null,
          observacoes: treinamentoData.observacoes || null,
          qtd_participantes: qtdParticipantes,
          user_id: (await supabase.auth.getUser()).data.user?.id
        }])
        .select();

      if (treinamentoError) throw treinamentoError;

      const treinamentoId = treinamento?.[0]?.id;
      if (!treinamentoId) throw new Error('Erro ao criar treinamento');

      // Inserir participantes
      if (participantesIds.length > 0) {
        const participantesData = participantesIds.map(colaboradorId => ({
          treinamento_id: treinamentoId,
          colaborador_id: colaboradorId
        }));

        const { error: participantesError } = await supabase
          .from('master_participantes_treinamento')
          .insert(participantesData);

        if (participantesError) throw participantesError;
      }

      toast({
        title: "Sucesso",
        description: `Treinamento registrado com ${qtdParticipantes} participantes!`
      });

      await carregarTreinamentos();
      await calcularIndicadores();
      return treinamento?.[0];
    } catch (error: any) {
      toast({
        title: "Erro",
        description: error.message,
        variant: "destructive"
      });
      throw error;
    }
  };

  const atualizarTreinamento = async (
    id: string,
    treinamentoData: {
      tipo_treinamento_id: string;
      topico_treinamento: string;
      equipamento: string;
      data_treinamento: string;
      carga_horaria_base: string;
      instrutor?: string;
      local?: string;
      observacoes?: string;
    },
    participantesIds: string[]
  ) => {
    try {
      const qtdParticipantes = participantesIds.length;
      const horasBase = converterIntervaloParaHoras(treinamentoData.carga_horaria_base);
      const horasTotal = horasBase * qtdParticipantes;
      const cargaHorariaTotalFormat = formatarIntervalo(horasTotal);

      // Atualizar treinamento
      const { error: treinamentoError } = await supabase
        .from('master_treinamentos')
        .update({
          tipo_treinamento_id: treinamentoData.tipo_treinamento_id,
          topico_treinamento: treinamentoData.topico_treinamento,
          equipamento: treinamentoData.equipamento || null,
          data_treinamento: treinamentoData.data_treinamento,
          carga_horaria_base: treinamentoData.carga_horaria_base,
          carga_horaria_total: cargaHorariaTotalFormat,
          instrutor: treinamentoData.instrutor || null,
          local: treinamentoData.local || null,
          observacoes: treinamentoData.observacoes || null,
          qtd_participantes: qtdParticipantes,
          updated_at: new Date().toISOString()
        })
        .eq('id', id);

      if (treinamentoError) throw treinamentoError;

      // Remover participantes antigos
      const { error: deleteError } = await supabase
        .from('master_participantes_treinamento')
        .delete()
        .eq('treinamento_id', id);

      if (deleteError) throw deleteError;

      // Inserir novos participantes
      if (participantesIds.length > 0) {
        const participantesData = participantesIds.map(colaboradorId => ({
          treinamento_id: id,
          colaborador_id: colaboradorId
        }));

        const { error: participantesError } = await supabase
          .from('master_participantes_treinamento')
          .insert(participantesData);

        if (participantesError) throw participantesError;
      }

      toast({
        title: "Sucesso",
        description: "Treinamento atualizado com sucesso!"
      });

      await carregarTreinamentos();
      await calcularIndicadores();
    } catch (error: any) {
      toast({
        title: "Erro",
        description: error.message,
        variant: "destructive"
      });
      throw error;
    }
  };

  const excluirTreinamento = async (id: string) => {
    try {
      // Os participantes serão deletados automaticamente pelo ON DELETE CASCADE
      const { error } = await supabase
        .from('master_treinamentos')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast({
        title: "Sucesso",
        description: "Treinamento excluído com sucesso!"
      });

      await carregarTreinamentos();
      await calcularIndicadores();
    } catch (error: any) {
      toast({
        title: "Erro",
        description: error.message,
        variant: "destructive"
      });
      throw error;
    }
  };

  const adicionarDesvio = async (desvio: Omit<Desvio, 'id' | 'created_at' | 'updated_at'>) => {
    try {
      const { data, error } = await supabase
        .from('master_desvios')
        .insert([{
          ...desvio,
          user_id: (await supabase.auth.getUser()).data.user?.id
        }])
        .select();

      if (error) throw error;

      toast({
        title: "Sucesso",
        description: "Desvio registrado com sucesso!"
      });

      await carregarDesvios();
      await calcularIndicadores();
      return data?.[0];
    } catch (error: any) {
      toast({
        title: "Erro",
        description: error.message,
        variant: "destructive"
      });
      throw error;
    }
  };

  const tratarDesvio = async (id: string, dataTratamento: string, descricao: string) => {
    try {
      const { error } = await supabase
        .from('master_desvios')
        .update({
          situacao: 'TRATADO',
          data_tratamento: dataTratamento,
          tratamento_descricao: descricao,
          tratado_por: (await supabase.auth.getUser()).data.user?.id,
          updated_at: new Date().toISOString()
        })
        .eq('id', id);

      if (error) throw error;

      toast({
        title: "Sucesso",
        description: "Desvio marcado como tratado!"
      });

      await carregarDesvios();
      await calcularIndicadores();
    } catch (error: any) {
      toast({
        title: "Erro",
        description: error.message,
        variant: "destructive"
      });
    }
  };

  return {
    loading,
    colaboradores,
    tiposTreinamento,
    treinamentos,
    desvios,
    indicadores,
    filtros,
    setFiltros,
    adicionarTreinamento,
    atualizarTreinamento,
    excluirTreinamento,
    adicionarDesvio,
    tratarDesvio,
    carregarTreinamentos,
    carregarDesvios,
    carregarDadosBase
  };
};