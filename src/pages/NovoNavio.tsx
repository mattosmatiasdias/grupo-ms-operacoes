// src/pages/NovoNavio.tsx
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { 
  Menu, 
  X, 
  LogOut, 
  ArrowLeft, 
  Ship, 
  Calendar, 
  Package, 
  Anchor, 
  BarChart3, 
  Plus,
  ChevronDown 
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface EquipamentoNavio {
  id: string;
  tag: string;
  motorista_operador: string;
  hora_inicial?: string;
  hora_final?: string;
}

const tiposCarga = [
  "HIDRATO",
  "CARVAO",
  "BAUXITA",
  "COQUE",
  "PICHE",
  "FLUORETO",
  "LINGOTE"
];

const NovoNavio = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { userProfile, signOut } = useAuth();
  
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [formData, setFormData] = useState({
    nome_navio: '',
    carga: '',
    berco: '',
    quantidade_prevista: '',
    cbs_total: '',
    inicio_operacao: '',
    final_operacao: '',
    media_cb: '',
  });

  const [equipamentosNavio, setEquipamentosNavio] = useState<EquipamentoNavio[]>([]);
  const [cargaDropdownOpen, setCargaDropdownOpen] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { id, value } = e.target;
    setFormData(prev => ({ ...prev, [id]: value }));
  };

  const handleCargaSelect = (carga: string) => {
    setFormData(prev => ({ ...prev, carga }));
    setCargaDropdownOpen(false);
  };

  const addEquipamentoNavio = (count = 1) => {
    const novosEquipamentos: EquipamentoNavio[] = [];
    for (let i = 0; i < count; i++) {
      novosEquipamentos.push({
        id: `${Date.now()}-${i}`,
        tag: '',
        motorista_operador: '',
        hora_inicial: '',
        hora_final: '',
      });
    }
    setEquipamentosNavio([...equipamentosNavio, ...novosEquipamentos]);
  };

  const updateEquipamentoNavio = (id: string, field: keyof EquipamentoNavio, value: string) => {
    setEquipamentosNavio(equipamentosNavio.map(eq => 
      eq.id === id ? { ...eq, [field]: value } : eq
    ));
  };

  const removeEquipamentoNavio = (id: string) => {
    setEquipamentosNavio(equipamentosNavio.filter(eq => eq.id !== id));
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.nome_navio || !userProfile?.id) {
      toast({ 
        title: "Erro", 
        description: "O nome do navio é obrigatório.", 
        variant: "destructive" 
      });
      return;
    }
    
    setIsSaving(true);
    
    try {
      // Inserir navio
      const { data: navioData, error: navioError } = await supabase
        .from('navios')
        .insert({
          nome_navio: formData.nome_navio,
          carga: formData.carga || null,
          berco: formData.berco || null,
          quantidade_prevista: formData.quantidade_prevista ? parseFloat(formData.quantidade_prevista) : null,
          cbs_total: formData.cbs_total ? parseInt(formData.cbs_total) : null,
          inicio_operacao: formData.inicio_operacao || null,
          final_operacao: formData.final_operacao || null,
          media_cb: formData.media_cb ? parseFloat(formData.media_cb) : null,
          user_id: userProfile.id,
          concluido: false,
        })
        .select()
        .single();

      if (navioError) throw navioError;

      // Salvar equipamentos associados
      if (equipamentosNavio.length > 0) {
        const equipamentosParaSalvar = equipamentosNavio
          .filter(eq => eq.tag.trim())
          .map(eq => ({
            navio_id: navioData.id,
            local: 'NAVIO',
            tag: eq.tag,
            motorista_operador: eq.motorista_operador,
            grupo_operacao: 'Operação Navio',
            hora_inicial: eq.hora_inicial || null,
            hora_final: eq.hora_final || null,
          }));

        if (equipamentosParaSalvar.length > 0) {
          const { error: equipamentosError } = await supabase
            .from('equipamentos')
            .insert(equipamentosParaSalvar);
          
          if (equipamentosError) throw equipamentosError;
        }
      }

      toast({ 
        title: "Sucesso!", 
        description: "Navio/Viagem registrada com sucesso." 
      });
      navigate('/navios');
      
    } catch (error) {
      console.error("Erro ao salvar navio:", error);
      toast({ 
        title: "Erro", 
        description: "Não foi possível salvar a viagem.", 
        variant: "destructive" 
      });
    } finally {
      setIsSaving(false);
    }
  };

  const menuItems = [
    {
      icon: Ship,
      label: 'NAVIOS',
      path: '/navios',
      color: 'bg-purple-600 hover:bg-purple-700',
      iconBg: 'bg-purple-500/20',
      iconColor: 'text-purple-300'
    }
  ];

  const handleSignOut = async () => {
    await signOut();
  };

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
              <h1 className="text-xl font-bold text-white">Novo Navio</h1>
              <p className="text-sm text-blue-300">Cadastrar nova viagem</p>
            </div>
          </div>
          <Button
            variant="ghost"
            onClick={handleSignOut}
            className="text-blue-300 hover:bg-blue-800/50"
            title="Sair do sistema"
          >
            <LogOut className="h-5 w-5" />
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
            <Button
              onClick={() => navigate('/navios')}
              className="w-full h-14 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl mb-4"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Voltar para Navios
            </Button>

            <div className="space-y-2">
              {menuItems.map((item) => (
                <Button
                  key={item.path}
                  onClick={() => {
                    navigate(item.path);
                    setSidebarOpen(false);
                  }}
                  className={`w-full h-16 ${item.color} text-white text-lg font-semibold rounded-xl transition-all duration-300 relative hover:shadow-lg hover:scale-[1.02]`}
                >
                  <div className="flex items-center justify-start space-x-4 w-full">
                    <div className={`${item.iconBg} p-3 rounded-lg`}>
                      <item.icon className={`h-5 w-5 ${item.iconColor}`} />
                    </div>
                    <span className="text-left">{item.label}</span>
                  </div>
                </Button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Desktop Layout */}
      <div className="hidden lg:flex min-h-screen">
        {/* Sidebar Desktop */}
        <div className="w-80 bg-blue-900/30 backdrop-blur-sm border-r border-blue-600/30 flex flex-col">
          <div className="p-6 border-b border-blue-600/30">
            <div className="flex items-center space-x-4">
              <div className="bg-purple-500/20 p-3 rounded-xl">
                <Ship className="h-8 w-8 text-purple-300" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-white">Novo Navio</h1>
                <p className="text-blue-300 text-sm">Cadastrar nova viagem</p>
              </div>
            </div>
          </div>

          <div className="p-6 border-b border-blue-600/30">
            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-blue-200/30">
              <p className="text-white font-semibold text-lg">{userProfile?.full_name || 'Usuário'}</p>
              <p className="text-blue-300 text-sm mt-1">Status: <span className="text-green-400 font-medium">Ativo</span></p>
              <p className="text-blue-300 text-sm mt-1">Último acesso: {new Date().toLocaleDateString('pt-BR')}</p>
            </div>
          </div>

          <div className="p-6 border-b border-blue-600/30">
            <Button
              onClick={() => navigate('/navios')}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl py-3"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Voltar para Navios
            </Button>
          </div>

          <div className="flex-1 p-6 space-y-3 overflow-y-auto">
            <h3 className="text-blue-200 font-semibold text-sm uppercase tracking-wider mb-4">Menu</h3>
            {menuItems.map((item) => (
              <Button
                key={item.path}
                onClick={() => navigate(item.path)}
                className={`w-full h-16 ${item.color} text-white text-lg font-semibold rounded-xl transition-all duration-300 relative group hover:shadow-lg hover:scale-[1.02]`}
              >
                <div className="flex items-center justify-start space-x-4 w-full">
                  <div className={`${item.iconBg} p-3 rounded-lg group-hover:bg-white/30 transition-colors`}>
                    <item.icon className={`h-5 w-5 ${item.iconColor}`} />
                  </div>
                  <span className="text-left">{item.label}</span>
                </div>
              </Button>
            ))}
          </div>

          <div className="p-6 border-t border-blue-600/30">
            <Button
              variant="outline"
              onClick={handleSignOut}
              className="w-full text-blue-300 hover:text-white hover:bg-blue-500/20 border-blue-300/30 rounded-xl transition-all duration-300 py-3 hover:shadow"
            >
              <LogOut className="h-5 w-5 mr-2" />
              Sair do Sistema
            </Button>
          </div>
        </div>

        {/* Main Content Desktop */}
        <div className="flex-1 flex flex-col">
          {/* Header */}
          <div className="bg-blue-800/30 backdrop-blur-sm border-b border-blue-600/30 p-6">
            <div className="flex justify-between items-center">
              <div>
                <h2 className="text-2xl font-bold text-white">Cadastrar Nova Viagem</h2>
                <p className="text-blue-200">Preencha os dados da nova viagem</p>
              </div>
              <div className="text-right">
                <div className="text-blue-200 text-sm">Equipamentos</div>
                <div className="text-white font-bold">
                  {equipamentosNavio.length} cadastrado(s)
                </div>
              </div>
            </div>
          </div>

          {/* Content */}
          <div className="p-6 flex-1 overflow-y-auto">
            <form onSubmit={handleSave}>
              {/* Card Dados da Viagem */}
              <Card className="bg-white/10 backdrop-blur-sm border-blue-200/30 mb-6">
                <CardHeader className="border-b border-blue-200/30">
                  <CardTitle className="text-white flex items-center space-x-2">
                    <Ship className="h-5 w-5" />
                    <span>Dados da Viagem</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="nome_navio" className="text-white text-sm flex items-center space-x-2">
                        <Ship className="h-4 w-4 text-blue-300" />
                        <span>Nome do Navio*</span>
                      </Label>
                      <Input 
                        id="nome_navio" 
                        value={formData.nome_navio} 
                        onChange={handleChange} 
                        required 
                        className="bg-white/5 border-blue-300/30 text-white placeholder:text-blue-300/50 focus:border-blue-300"
                        placeholder="Ex: Navio Cargueiro A"
                      />
                    </div>
                    <div className="space-y-2 relative">
                      <Label htmlFor="carga" className="text-white text-sm flex items-center space-x-2">
                        <Package className="h-4 w-4 text-blue-300" />
                        <span>Carga</span>
                      </Label>
                      <div className="relative">
                        <Button
                          type="button"
                          onClick={() => setCargaDropdownOpen(!cargaDropdownOpen)}
                          className="w-full bg-white/5 border border-blue-300/30 text-white hover:bg-white/10 hover:border-blue-300 justify-between px-3"
                        >
                          <span className={formData.carga ? "text-white" : "text-blue-300/50"}>
                            {formData.carga || "Selecione o tipo de carga"}
                          </span>
                          <ChevronDown className={`h-4 w-4 transition-transform ${cargaDropdownOpen ? 'rotate-180' : ''}`} />
                        </Button>
                        
                        {cargaDropdownOpen && (
                          <div className="absolute z-10 mt-1 w-full bg-gray-800 border border-blue-300/30 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                            <div className="py-1">
                              {tiposCarga.map((carga) => (
                                <button
                                  key={carga}
                                  type="button"
                                  onClick={() => handleCargaSelect(carga)}
                                  className={`w-full text-left px-4 py-2 hover:bg-blue-600/30 transition-colors ${
                                    formData.carga === carga 
                                      ? 'bg-blue-600 text-white' 
                                      : 'text-blue-200'
                                  }`}
                                >
                                  {carga}
                                </button>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                      {formData.carga && (
                        <div className="flex justify-between items-center mt-2">
                          <span className="text-blue-300 text-sm">Selecionado: <span className="text-white">{formData.carga}</span></span>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setFormData(prev => ({ ...prev, carga: '' }));
                              setCargaDropdownOpen(false);
                            }}
                            className="h-6 px-2 text-xs text-red-300 hover:text-red-200 hover:bg-red-500/20"
                          >
                            Limpar
                          </Button>
                        </div>
                      )}
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="berco" className="text-white text-sm flex items-center space-x-2">
                        <Anchor className="h-4 w-4 text-blue-300" />
                        <span>Berço</span>
                      </Label>
                      <Input 
                        id="berco" 
                        value={formData.berco} 
                        onChange={handleChange} 
                        className="bg-white/5 border-blue-300/30 text-white placeholder:text-blue-300/50 focus:border-blue-300"
                        placeholder="Número do berço"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="quantidade_prevista" className="text-white text-sm">
                        Quantidade Prevista
                      </Label>
                      <Input 
                        id="quantidade_prevista" 
                        type="number" 
                        step="0.01" 
                        value={formData.quantidade_prevista} 
                        onChange={handleChange} 
                        className="bg-white/5 border-blue-300/30 text-white placeholder:text-blue-300/50 focus:border-blue-300 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                        placeholder="0.00"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="cbs_total" className="text-white text-sm">
                        Total de CBs
                      </Label>
                      <Input 
                        id="cbs_total" 
                        type="number" 
                        value={formData.cbs_total} 
                        onChange={handleChange} 
                        className="bg-white/5 border-blue-300/30 text-white placeholder:text-blue-300/50 focus:border-blue-300 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                        placeholder="0"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="media_cb" className="text-white text-sm flex items-center space-x-2">
                        <BarChart3 className="h-4 w-4 text-blue-300" />
                        <span>Média por CB</span>
                      </Label>
                      <Input 
                        id="media_cb" 
                        type="number" 
                        step="0.0001" 
                        value={formData.media_cb} 
                        onChange={handleChange} 
                        className="bg-white/5 border-blue-300/30 text-white placeholder:text-blue-300/50 focus:border-blue-300 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                        placeholder="0.0000"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="inicio_operacao" className="text-white text-sm flex items-center space-x-2">
                        <Calendar className="h-4 w-4 text-blue-300" />
                        <span>Início da Operação</span>
                      </Label>
                      <Input 
                        id="inicio_operacao" 
                        type="datetime-local" 
                        value={formData.inicio_operacao} 
                        onChange={handleChange} 
                        className="bg-white/5 border-blue-300/30 text-white focus:border-blue-300"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="final_operacao" className="text-white text-sm flex items-center space-x-2">
                        <Calendar className="h-4 w-4 text-blue-300" />
                        <span>Final da Operação</span>
                      </Label>
                      <Input 
                        id="final_operacao" 
                        type="datetime-local" 
                        value={formData.final_operacao} 
                        onChange={handleChange} 
                        className="bg-white/5 border-blue-300/30 text-white focus:border-blue-300"
                      />
                    </div>
                  </div>

                  {/* Botão Salvar */}
                  <div className="pt-6">
                    <Button 
                      type="submit" 
                      className="w-full bg-orange-500 hover:bg-orange-600 text-white py-3 text-lg font-semibold rounded-lg h-12"
                      disabled={isSaving}
                    >
                      {isSaving ? (
                        <>
                          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                          Salvando...
                        </>
                      ) : (
                        'Salvar Viagem'
                      )}
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* Card Equipamentos Associados */}
              <Card className="bg-white/10 backdrop-blur-sm border-blue-200/30">
                <CardHeader className="border-b border-blue-200/30">
                  <CardTitle className="text-white flex items-center space-x-2">
                    <Package className="h-5 w-5" />
                    <span>Equipamentos Associados</span>
                    <span className="text-blue-300 text-sm font-normal">
                      ({equipamentosNavio.length} equipamentos)
                    </span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-6">
                  <div className="space-y-4 mb-6">
                    {equipamentosNavio.length === 0 ? (
                      <div className="text-center py-8 border-2 border-dashed border-blue-300/30 rounded-lg">
                        <Package className="h-12 w-12 text-blue-300/50 mx-auto mb-3" />
                        <p className="text-white mb-2">Nenhum equipamento adicionado</p>
                        <p className="text-blue-300 text-sm">Adicione equipamentos que atuarão nesta viagem</p>
                      </div>
                    ) : (
                      equipamentosNavio.map((eq, index) => (
                        <div key={eq.id} className="flex items-center gap-3 p-4 bg-white/5 rounded-lg border border-blue-200/20">
                          <div className="text-blue-300 text-sm font-medium w-8">
                            #{index + 1}
                          </div>
                          <Input 
                            placeholder="Tag (Ex: CB-123, EST-5)" 
                            value={eq.tag} 
                            onChange={(e) => updateEquipamentoNavio(eq.id, 'tag', e.target.value)} 
                            className="bg-white/5 border-blue-300/30 text-white placeholder:text-blue-300/50 focus:border-blue-300"
                          />
                          <Input 
                            placeholder="Operador/Motorista" 
                            value={eq.motorista_operador} 
                            onChange={(e) => updateEquipamentoNavio(eq.id, 'motorista_operador', e.target.value)} 
                            className="bg-white/5 border-blue-300/30 text-white placeholder:text-blue-300/50 focus:border-blue-300"
                          />
                          <div className="flex items-center gap-2">
                            <Input 
                              type="time" 
                              placeholder="Início" 
                              value={eq.hora_inicial || ''} 
                              onChange={(e) => updateEquipamentoNavio(eq.id, 'hora_inicial', e.target.value)} 
                              className="w-28 bg-white/5 border-blue-300/30 text-white focus:border-blue-300"
                            />
                            <span className="text-blue-300">-</span>
                            <Input 
                              type="time" 
                              placeholder="Fim" 
                              value={eq.hora_final || ''} 
                              onChange={(e) => updateEquipamentoNavio(eq.id, 'hora_final', e.target.value)} 
                              className="w-28 bg-white/5 border-blue-300/30 text-white focus:border-blue-300"
                            />
                          </div>
                          <Button 
                            type="button"
                            variant="ghost" 
                            size="icon" 
                            onClick={() => removeEquipamentoNavio(eq.id)}
                            className="text-red-400 hover:text-red-300 hover:bg-red-500/20"
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      ))
                    )}
                  </div>

                  <div className="flex gap-3 pt-6 border-t border-blue-200/30">
                    <Button 
                      type="button" 
                      onClick={() => addEquipamentoNavio(1)} 
                      className="flex-1 bg-white/10 border-blue-300 text-white hover:bg-white/20"
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      +1 Equipamento
                    </Button>
                    <Button 
                      type="button" 
                      onClick={() => addEquipamentoNavio(10)} 
                      variant="outline"
                      className="flex-1 border-blue-300 text-white hover:bg-white/20"
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      +10 Equipamentos
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </form>
          </div>
        </div>
      </div>

      {/* Mobile Content (quando sidebar fechada) */}
      {!sidebarOpen && (
        <div className="lg:hidden p-4">
          <Button
            onClick={() => navigate('/navios')}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl mb-4 py-3"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Voltar para Navios
          </Button>

          {/* Formulário mobile simplificado */}
          <form onSubmit={handleSave}>
            <Card className="bg-white/10 backdrop-blur-sm border-blue-200/30 mb-4">
              <CardHeader className="border-b border-blue-200/30">
                <CardTitle className="text-white">Dados da Viagem</CardTitle>
              </CardHeader>
              <CardContent className="p-4">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="nome_navio_mobile" className="text-white text-sm">Nome do Navio*</Label>
                    <Input 
                      id="nome_navio_mobile" 
                      value={formData.nome_navio} 
                      onChange={handleChange} 
                      required 
                      className="bg-white/5 border-blue-300/30 text-white"
                      placeholder="Ex: Navio Cargueiro A"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="carga_mobile" className="text-white text-sm">Carga</Label>
                    <div className="relative">
                      <Button
                        type="button"
                        onClick={() => setCargaDropdownOpen(!cargaDropdownOpen)}
                        className="w-full bg-white/5 border border-blue-300/30 text-white hover:bg-white/10 hover:border-blue-300 justify-between px-3 h-10"
                      >
                        <span className={formData.carga ? "text-white" : "text-blue-300/50"}>
                          {formData.carga || "Selecione o tipo de carga"}
                        </span>
                        <ChevronDown className={`h-4 w-4 transition-transform ${cargaDropdownOpen ? 'rotate-180' : ''}`} />
                      </Button>
                      
                      {cargaDropdownOpen && (
                        <div className="absolute z-10 mt-1 w-full bg-gray-800 border border-blue-300/30 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                          <div className="py-1">
                            {tiposCarga.map((carga) => (
                              <button
                                key={carga}
                                type="button"
                                onClick={() => handleCargaSelect(carga)}
                                className={`w-full text-left px-4 py-2 hover:bg-blue-600/30 transition-colors ${
                                  formData.carga === carga 
                                    ? 'bg-blue-600 text-white' 
                                    : 'text-blue-200'
                                }`}
                              >
                                {carga}
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <Label htmlFor="berco_mobile" className="text-white text-sm">Berço</Label>
                      <Input 
                        id="berco_mobile" 
                        value={formData.berco} 
                        onChange={handleChange} 
                        className="bg-white/5 border-blue-300/30 text-white"
                        placeholder="Número do berço"
                      />
                    </div>
                  </div>
                  
                  {/* Botão Salvar mobile */}
                  <Button 
                    type="submit" 
                    className="w-full bg-orange-500 hover:bg-orange-600 text-white font-semibold rounded-lg h-12 mt-4"
                    disabled={isSaving}
                  >
                    {isSaving ? 'Salvando...' : 'Salvar Viagem'}
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Card Equipamentos Mobile */}
            <Card className="bg-white/10 backdrop-blur-sm border-blue-200/30">
              <CardHeader className="border-b border-blue-200/30">
                <CardTitle className="text-white text-sm">Equipamentos ({equipamentosNavio.length})</CardTitle>
              </CardHeader>
              <CardContent className="p-4">
                <div className="space-y-4 mb-4">
                  {equipamentosNavio.map((eq, index) => (
                    <div key={eq.id} className="p-3 bg-white/5 rounded-lg border border-blue-200/20">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-blue-300 text-sm">Equipamento #{index + 1}</span>
                        <Button 
                          type="button"
                          variant="ghost" 
                          size="icon" 
                          onClick={() => removeEquipamentoNavio(eq.id)}
                          className="h-6 w-6 text-red-400 hover:text-red-300"
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                      <div className="space-y-3">
                        <Input 
                          placeholder="Tag" 
                          value={eq.tag} 
                          onChange={(e) => updateEquipamentoNavio(eq.id, 'tag', e.target.value)} 
                          className="bg-white/5 border-blue-300/30 text-white text-sm"
                        />
                        <Input 
                          placeholder="Operador" 
                          value={eq.motorista_operador} 
                          onChange={(e) => updateEquipamentoNavio(eq.id, 'motorista_operador', e.target.value)} 
                          className="bg-white/5 border-blue-300/30 text-white text-sm"
                        />
                      </div>
                    </div>
                  ))}
                </div>

                <div className="flex gap-2">
                  <Button 
                    type="button" 
                    onClick={() => addEquipamentoNavio(1)} 
                    className="flex-1 bg-white/10 border-blue-300 text-white text-sm"
                  >
                    <Plus className="h-3 w-3 mr-1" />
                    +1
                  </Button>
                  <Button 
                    type="button" 
                    onClick={() => addEquipamentoNavio(10)} 
                    variant="outline"
                    className="flex-1 border-blue-300 text-white text-sm"
                  >
                    <Plus className="h-3 w-3 mr-1" />
                    +10
                  </Button>
                </div>
              </CardContent>
            </Card>
          </form>
        </div>
      )}
    </div>
  );
};

export default NovoNavio;