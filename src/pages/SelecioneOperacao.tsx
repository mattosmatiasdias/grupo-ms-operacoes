// src/pages/SelecioneOperacao.tsx
import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { ArrowLeft } from 'lucide-react';

const SelecioneOperacao = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const [loading, setLoading] = useState(false);

    // Receber o tipo de operação da tela anterior
    const tipoOperacao = location.state?.tipoOperacao;

    // Opções específicas baseadas no tipo selecionado
    const getOpcoesOperacao = () => {
        if (tipoOperacao === 'HYDRO, NAVIO') {
            return [
                { id: 'HYDRO', titulo: 'HYDRO (Refinaria)', descricao: 'Operações HYDRO' },
                { id: 'NAVIO', titulo: 'NAVIO', descricao: 'Operações com Navios' }
            ];
        } else if (tipoOperacao === 'ALBRAS, NAVIO') {
            return [
                { id: 'ALBRAS', titulo: 'ALBRAS', descricao: 'Operações ALBRAS' },
                { id: 'NAVIO', titulo: 'NAVIO', descricao: 'Operações com Navios' }
            ];
        }
        return [];
    };

    const opcoesOperacao = getOpcoesOperacao();

    const handleSelecaoOperacao = async (operacaoId: string) => {
        setLoading(true);
        
        try {
            await new Promise(resolve => setTimeout(resolve, 300));
            
            // Navegar para o registro com a operação específica
            navigate('/registro-transporte', { 
                state: { 
                    tipoOperacao: operacaoId
                } 
            });
        } catch (error) {
            console.error('Erro ao navegar:', error);
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-blue-900 to-blue-700 flex items-center justify-center">
                <div className="text-white text-xl">Carregando...</div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-blue-900 to-blue-700">
            {/* Header */}
            <div className="bg-blue-800 p-4 flex items-center">
                <Button 
                    variant="ghost" 
                    onClick={() => navigate('/novo-lancamento')} 
                    className="text-white hover:bg-white/20 mr-4"
                >
                    <ArrowLeft className="h-5 w-5" />
                </Button>
                <h1 className="text-xl font-bold text-white">
                    Selecionar Tipo de Operação
                </h1>
            </div>
            
            {/* Conteúdo */}
            <div className="p-4 space-y-4">
                <div className="text-center mb-6">
                    <h2 className="text-white text-lg font-semibold mb-2">
                        Selecione o tipo específico
                    </h2>
                    <p className="text-blue-100 text-sm">
                        Escolha entre as opções disponíveis
                    </p>
                </div>

                {/* Opções */}
                <div className="space-y-4">
                    {opcoesOperacao.map((opcao) => (
                        <Card 
                            key={opcao.id} 
                            className="cursor-pointer hover:shadow-lg transition-all duration-200 hover:scale-[1.02] active:scale-95 border-2 border-transparent hover:border-blue-300"
                            onClick={() => handleSelecaoOperacao(opcao.id)}
                        >
                            <CardContent className="p-6">
                                <div className="text-center">
                                    <h3 className="text-lg font-semibold text-blue-900 mb-2">
                                        {opcao.titulo}
                                    </h3>
                                    <p className="text-gray-600 text-sm">
                                        {opcao.descricao}
                                    </p>
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>

                {/* Informação adicional */}
                <div className="text-center mt-6">
                    <p className="text-blue-200 text-sm">
                        Você selecionou: <strong>{tipoOperacao}</strong>
                    </p>
                </div>

                {/* Botão para voltar */}
                <div className="mt-8 text-center">
                    <Button 
                        variant="outline" 
                        onClick={() => navigate('/novo-lancamento')}
                        className="text-white border-white hover:bg-white hover:text-blue-900"
                    >
                        Voltar e Escolher Outro Tipo
                    </Button>
                </div>
            </div>
        </div>
    );
};

export default SelecioneOperacao;