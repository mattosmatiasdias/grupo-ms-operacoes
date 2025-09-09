import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { ArrowLeft } from 'lucide-react';

const NovoLancamento = () => {
  const navigate = useNavigate();

  const tiposCarga = [
    { id: 'hidrato-carvao-bauxita', label: 'Hidrato, Carvão, Bauxita' },
    { id: 'coque-piche-fluoreto', label: 'Coque, Piche, Fluoreto' },
    { id: 'lingote', label: 'Lingote' },
    { id: 'carga-geral-tarugo', label: 'Carga Geral, Tarugo' }
  ];

  const handleTipoSelect = (tipoId: string) => {
    navigate(`/operacao/${tipoId}`);
  };

  return (
    <div className="min-h-screen" style={{ background: 'var(--gradient-primary)' }}>
      {/* Header */}
      <div className="flex items-center p-4 text-white">
        <Button
          variant="ghost"
          onClick={() => navigate('/relatorio-transporte')}
          className="text-white hover:bg-white/20 mr-4"
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <h1 className="text-xl font-bold">Novo Lançamento</h1>
      </div>

      {/* Buttons for cargo types */}
      <div className="px-4 space-y-4">
        {tiposCarga.map((tipo) => (
          <Card key={tipo.id} className="w-full shadow-[var(--shadow-card)]">
            <CardContent className="p-0">
              <Button
                onClick={() => handleTipoSelect(tipo.id)}
                className="w-full h-16 bg-secondary hover:bg-secondary/90 text-white text-lg font-semibold rounded-lg"
                style={{ boxShadow: 'var(--shadow-button)' }}
              >
                {tipo.label}
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default NovoLancamento;