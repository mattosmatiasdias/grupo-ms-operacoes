import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft, Factory, Warehouse, Building, Ship } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface Navio {
  id: string;
  nome_navio: string;
  carga: string;
}

const NovoLancamento = () => {
  const navigate = useNavigate();
  const [navios, setNavios] = useState<Navio[]>([]);

  useEffect(() => {
    const fetchNavios = async () => {
      const { data, error } = await supabase
        .from('navios')
        .select('*')
        .eq('concluido', false);
      
      if (!error && data) {
        setNavios(data);
      }
    };

    fetchNavios();
  }, []);

  const handleSelectOperacao = (op: string) => {
    navigate('/formulario-operacao', { 
      state: { 
        tipo: 'OPERACAO', 
        operacao: op 
      } 
    });
  };

  const handleSelectNavio = (navio: Navio) => {
    navigate('/formulario-operacao', { 
      state: { 
        tipo: 'NAVIO', 
        navio: navio 
      } 
    });
  };

  const getOpIcon = (op: string) => {
    switch (op) {
      case 'HYDRO': return <Factory className="h-6 w-6" />;
      case 'ALBRAS': return <Warehouse className="h-6 w-6" />;
      case 'SANTOS BRASIL': return <Building className="h-6 w-6" />;
      default: return <Factory className="h-6 w-6" />;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-900 to-blue-700 relative">
      <div className="bg-blue-800 p-4 flex items-center">
        <Button
          variant="ghost"
          onClick={() => navigate('/relatorio-transporte')}
          className="text-white hover:bg-white/20 mr-4"
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <h1 className="text-xl font-bold text-white">Novo Lançamento</h1>
      </div>

      <div className="p-4 space-y-4">
        {/* Operações Fixas */}
        <Card>
          <CardHeader>
            <CardTitle>Operações</CardTitle>
          </CardHeader>
          <CardContent className="pt-4">
            <div className="space-y-3">
              {/* HYDRO */}
              <Button
                type="button"
                variant="outline"
                className="w-full h-16 flex items-center justify-start transition-all bg-white text-gray-700 border-gray-300 hover:shadow-md hover:bg-green-50 hover:border-green-300"
                onClick={() => handleSelectOperacao('HYDRO')}
              >
                <div className="flex items-center space-x-3">
                  {getOpIcon('HYDRO')}
                  <span className="font-bold text-lg">HYDRO</span>
                </div>
              </Button>

              {/* ALBRAS */}
              <Button
                type="button"
                variant="outline"
                className="w-full h-16 flex items-center justify-start transition-all bg-white text-gray-700 border-gray-300 hover:shadow-md hover:bg-purple-50 hover:border-purple-300"
                onClick={() => handleSelectOperacao('ALBRAS')}
              >
                <div className="flex items-center space-x-3">
                  {getOpIcon('ALBRAS')}
                  <span className="font-bold text-lg">ALBRAS</span>
                </div>
              </Button>

              {/* SANTOS BRASIL */}
              <Button
                type="button"
                variant="outline"
                className="w-full h-16 flex items-center justify-start transition-all bg-white text-gray-700 border-gray-300 hover:shadow-md hover:bg-orange-50 hover:border-orange-300"
                onClick={() => handleSelectOperacao('SANTOS BRASIL')}
              >
                <div className="flex items-center space-x-3">
                  {getOpIcon('SANTOS BRASIL')}
                  <span className="font-bold text-lg">SANTOS BRASIL</span>
                </div>
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Navios em Andamento */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Ship className="h-5 w-5" />
              Navios em Andamento
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-4">
            <div className="space-y-3">
              {navios.map((navio) => (
                <Button
                  key={navio.id}
                  type="button"
                  variant="outline"
                  className="w-full h-16 flex flex-col items-center justify-center transition-all bg-white text-blue-800 border-blue-300 hover:bg-blue-50 hover:shadow-md hover:border-blue-400"
                  onClick={() => handleSelectNavio(navio)}
                >
                  <span className="font-bold text-base">{navio.nome_navio}</span>
                  <span className="text-sm opacity-90">{navio.carga}</span>
                </Button>
              ))}
            </div>
            {navios.length === 0 && (
              <p className="text-center text-muted-foreground py-4">
                Nenhum navio em andamento encontrado.
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default NovoLancamento;