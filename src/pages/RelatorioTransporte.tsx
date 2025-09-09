import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ArrowLeft, Plus } from 'lucide-react';

const RelatorioTransporte = () => {
  const navigate = useNavigate();
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [selectedLocal, setSelectedLocal] = useState('Todos');

  // Mock data - replace with actual Supabase queries
  const mockOperacoes = [
    { op: 'MV SSI', data: '08/09/2025', inicio: '07:00', fim: '19:00', local: 'NAVIO', carga: 'HIDRATO', operador: 'CB-04', horas: 12 }
  ];

  return (
    <div className="min-h-screen" style={{ background: 'var(--gradient-primary)' }}>
      {/* Header */}
      <div className="flex items-center justify-between p-4 text-white">
        <div className="flex items-center">
          <Button
            variant="ghost"
            onClick={() => navigate('/')}
            className="text-white hover:bg-white/20 mr-4"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-xl font-bold">RELATÓRIO DE TRANSPORTE</h1>
        </div>
      </div>

      {/* Gestão de Operações Card */}
      <div className="px-4 mb-4">
        <Card className="shadow-[var(--shadow-card)]">
          <CardContent className="p-4 flex justify-between items-center">
            <span className="text-foreground font-medium">Gestão de Operações</span>
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => navigate('/')}
              className="text-primary border-primary hover:bg-primary hover:text-white"
            >
              Voltar ao Menu
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Novo Lançamento Button */}
      <div className="px-4 mb-4">
        <Button
          onClick={() => navigate('/novo-lancamento')}
          className="w-full h-12 bg-secondary hover:bg-secondary/90 text-white font-semibold"
          style={{ boxShadow: 'var(--shadow-button)' }}
        >
          <Plus className="h-5 w-5 mr-2" />
          Novo Lançamento
        </Button>
      </div>

      {/* Registros Salvos */}
      <div className="px-4 mb-4">
        <Card className="shadow-[var(--shadow-card)]">
          <CardHeader>
            <CardTitle>Registros Salvos</CardTitle>
            <div className="flex gap-4">
              <div className="flex-1">
                <label className="text-sm text-muted-foreground">Data:</label>
                <Input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="mt-1"
                />
              </div>
              <div className="flex-1">
                <label className="text-sm text-muted-foreground">Local:</label>
                <Select value={selectedLocal} onValueChange={setSelectedLocal}>
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Todos">Todos</SelectItem>
                    <SelectItem value="NAVIO">NAVIO</SelectItem>
                    <SelectItem value="HYDRO">HYDRO</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardHeader>
        </Card>
      </div>

      {/* Tabs for different data views */}
      <div className="px-4">
        <Card className="shadow-[var(--shadow-card)]">
          <CardContent className="p-0">
            <Tabs defaultValue="operacoes" className="w-full">
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="operacoes">Operações</TabsTrigger>
                <TabsTrigger value="ajudantes">Ajudantes</TabsTrigger>
                <TabsTrigger value="ausencias">Ausências</TabsTrigger>
                <TabsTrigger value="observacoes">Observações</TabsTrigger>
              </TabsList>
              
              <TabsContent value="operacoes" className="p-4">
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>OP</TableHead>
                        <TableHead>Data</TableHead>
                        <TableHead>Início</TableHead>
                        <TableHead>Fim</TableHead>
                        <TableHead>Local</TableHead>
                        <TableHead>Carga</TableHead>
                        <TableHead>Operador</TableHead>
                        <TableHead>Horas</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {mockOperacoes.map((op, index) => (
                        <TableRow key={index}>
                          <TableCell>{op.op}</TableCell>
                          <TableCell>{op.data}</TableCell>
                          <TableCell>{op.inicio}</TableCell>
                          <TableCell>{op.fim}</TableCell>
                          <TableCell>{op.local}</TableCell>
                          <TableCell>{op.carga}</TableCell>
                          <TableCell>{op.operador}</TableCell>
                          <TableCell>{op.horas}</TableCell>
                        </TableRow>
                      ))}
                      {mockOperacoes.length === 0 && (
                        <TableRow>
                          <TableCell colSpan={8} className="text-center text-muted-foreground">
                            Nenhum registro encontrado
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
              </TabsContent>
              
              <TabsContent value="ajudantes" className="p-4">
                <div className="text-center text-muted-foreground">
                  Nenhum ajudante registrado
                </div>
              </TabsContent>
              
              <TabsContent value="ausencias" className="p-4">
                <div className="text-center text-muted-foreground">
                  Nenhuma ausência registrada
                </div>
              </TabsContent>
              
              <TabsContent value="observacoes" className="p-4">
                <div className="text-center text-muted-foreground">
                  Nenhuma observação registrada
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default RelatorioTransporte;