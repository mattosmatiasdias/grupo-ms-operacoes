// src/pages/EscolherFrente.tsx
import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowLeft } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

const EscolherFrente = () => {
    const { tipo } = useParams<{ tipo: string }>();
    const navigate = useNavigate();
    const { toast } = useToast();

    const [selectedFrente, setSelectedFrente] = useState('');
    const [navios, setNavios] = useState<any[]>([]);
    const [selectedNavio, setSelectedNavio] = useState('');

    useEffect(() => {
        if (tipo === 'hidrato-carvao-bauxita' || tipo === 'coque-piche-fluoreto' || tipo === 'lingote') {
            fetchNavios();
        }
    }, [tipo]);

    const fetchNavios = async () => {
        try {
            const { data, error } = await supabase.from('navios').select('*').eq('concluido', false);
            if (error) throw error;
            setNavios(data || []);
        } catch (error) {
            console.error('Error fetching navios:', error);
            toast({ title: "Erro", description: "Não foi possível carregar os navios.", variant: "destructive" });
        }
    };

    const handleFrenteSelect = (frente: string) => {
        if (frente === 'NAVIO') {
            if (!selectedNavio) {
                toast({ title: "Atenção", description: "Selecione um navio antes de continuar.", variant: "destructive" });
                return;
            }
            navigate(`/operacao/${tipo}/NAVIO?navioId=${selectedNavio}`);
        } else {
            navigate(`/operacao/${tipo}/${frente}`);
        }
    };

    const getOpcoes = () => {
        switch (tipo) {
            case 'hidrato-carvao-bauxita':
                return ['HYDRO', 'NAVIO'];
            case 'coque-piche-fluoreto':
            case 'lingote':
                return ['ALBRAS', 'NAVIO'];
            case 'carga-geral-tarugo':
                return ['SANTOS BRASIL']; // Automático
            default:
                return [];
        }
    };

    const opcoes = getOpcoes();

    return (
        <div className="min-h-screen pb-10" style={{ background: 'var(--gradient-primary)' }}>
            {/* Header */}
            <div className="flex items-center p-4 text-white">
                <Button variant="ghost" onClick={() => navigate('/novo-lancamento')} className="text-white hover:bg-white/20 mr-4">
                    <ArrowLeft className="h-5 w-5" />
                </Button>
                <h1 className="text-xl font-bold">Escolha a Frente de Serviço</h1>
            </div>

            {/* Conteúdo */}
            <div className="px-4 space-y-6">
                <Card className="shadow-[var(--shadow-card)]">
                    <CardHeader><CardTitle>{tipo === 'hidrato-carvao-bauxita' ? 'HIDRATO, CARVÃO, BAUXITA' : tipo === 'coque-piche-fluoreto' ? 'COQUE, PICHE, FLUORETO' : tipo === 'lingote' ? 'LINGOTE' : 'CARGA GERAL, TARUGO'}</CardTitle></CardHeader>
                    <CardContent className="space-y-4">
                        {opcoes.length === 1 && opcoes[0] === 'SANTOS BRASIL' ? (
                            <div className="text-center py-8">
                                <p className="mb-4">A frente de serviço é automaticamente definida como <strong>SANTOS BRASIL</strong>.</p>
                                <Button onClick={() => navigate(`/operacao/${tipo}/SANTOS BRASIL`)} className="w-full h-12 bg-accent hover:bg-accent/90 text-white font-semibold">
                                    Prosseguir para Formulário
                                </Button>
                            </div>
                        ) : (
                            <>
                                {opcoes.map(frente => (
                                    <Card key={frente} className="shadow-[var(--shadow-card)]">
                                        <CardContent className="p-0">
                                            <Button
                                                onClick={() => frente === 'NAVIO' ? null : handleFrenteSelect(frente)}
                                                className={`w-full h-16 bg-secondary hover:bg-secondary/90 text-white text-lg font-semibold rounded-lg ${frente === 'NAVIO' ? 'justify-between' : ''}`}
                                                style={{ boxShadow: 'var(--shadow-button)' }}
                                            >
                                                {frente}
                                                {frente === 'NAVIO' && (
                                                    <Select value={selectedNavio} onValueChange={setSelectedNavio}>
                                                        <SelectTrigger className="w-1/2">
                                                            <SelectValue placeholder="Selecione um navio..." />
                                                        </SelectTrigger>
                                                        <SelectContent>
                                                            {navios.map((navio) => (
                                                                <SelectItem key={navio.id} value={navio.id}>{navio.nome_navio} - {navio.carga}</SelectItem>
                                                            ))}
                                                        </SelectContent>
                                                    </Select>
                                                )}
                                            </Button>
                                        </CardContent>
                                    </Card>
                                ))}
                                {opcoes.includes('NAVIO') && (
                                    <Button
                                        onClick={() => handleFrenteSelect('NAVIO')}
                                        disabled={!selectedNavio}
                                        className="w-full h-12 bg-accent hover:bg-accent/90 text-white font-semibold"
                                    >
                                        Prosseguir para Formulário
                                    </Button>
                                )}
                            </>
                        )}
                    </CardContent>
                </Card>
            </div>
        </div>
    );
};

export default EscolherFrente;