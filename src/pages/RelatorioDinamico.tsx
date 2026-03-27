import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ArrowLeft, Play, Download, Loader2, Save, Trash2, Table as TableIcon, Eye, Code, Database, ChevronDown, ChevronRight, FileCode, Pencil, X, Shield, AlertTriangle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import Editor from '@monaco-editor/react';

type QueryResult = any[];
type TableInfo = {
  table_name: string;
  schema: string;
};

type SavedQuery = {
  id: number;
  name: string;
  sql: string;
  created_at: string;
};

type TableColumn = {
  column_name: string;
  data_type: string;
  is_nullable: string;
};

// Função para validar se a query é apenas SELECT
const isReadOnlyQuery = (sql: string): { valid: boolean; message?: string } => {
  // Remove comentários (simplificado)
  const cleanSql = sql
    .replace(/--.*$/gm, '') // Remove comentários de linha
    .replace(/\/\*[\s\S]*?\*\//g, '') // Remove comentários de bloco
    .trim()
    .toUpperCase();

  // Verifica se a query está vazia
  if (!cleanSql) {
    return { valid: false, message: 'Consulta vazia' };
  }

  // Lista de comandos proibidos (que modificam dados)
  const forbiddenCommands = [
    'INSERT', 'UPDATE', 'DELETE', 'DROP', 'CREATE', 'ALTER', 
    'TRUNCATE', 'GRANT', 'REVOKE', 'MERGE', 'REPLACE',
    'WITH', // WITH pode ser usado em SELECT, mas também em modificações. Vamos analisar separadamente
  ];

  // Extrai o primeiro comando (palavra antes do primeiro espaço ou fim da string)
  const firstWord = cleanSql.split(/\s+/)[0];
  
  // Verifica se é WITH (CTE)
  if (firstWord === 'WITH') {
    // Verifica se o WITH contém algum comando de modificação
    const hasModification = forbiddenCommands.some(cmd => {
      // Verifica se após o WITH tem INSERT, UPDATE, DELETE, etc.
      const pattern = new RegExp(`\\b${cmd}\\b`, 'i');
      return pattern.test(cleanSql);
    });
    
    if (hasModification) {
      return { valid: false, message: 'Consultas com CTE não podem conter comandos de modificação (INSERT, UPDATE, DELETE, etc.)' };
    }
    return { valid: true };
  }

  // Verifica se o primeiro comando é SELECT
  if (firstWord !== 'SELECT') {
    return { 
      valid: false, 
      message: `Apenas consultas SELECT são permitidas. Comando detectado: ${firstWord}` 
    };
  }

  // Verificações adicionais para garantir que não há comandos proibidos em subqueries
  for (const cmd of forbiddenCommands) {
    if (cleanSql.includes(cmd)) {
      // Exceção: se o comando for WITH (CTE) já tratamos acima
      if (cmd !== 'WITH') {
        return { 
          valid: false, 
          message: `Comando não permitido detectado: ${cmd}. Apenas consultas SELECT são permitidas.` 
        };
      }
    }
  }

  return { valid: true };
};

const RelatorioDinamico = () => {
  const navigate = useNavigate();
  const { toast } = useToast();

  const [sqlQuery, setSqlQuery] = useState<string>('-- Digite sua consulta SQL aqui\n-- Exemplo: SELECT * FROM navios LIMIT 10');
  const [queryResult, setQueryResult] = useState<QueryResult>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [tables, setTables] = useState<TableInfo[]>([]);
  const [loadingTables, setLoadingTables] = useState<boolean>(true);
  const [selectedTable, setSelectedTable] = useState<string>('');
  const [tableColumns, setTableColumns] = useState<TableColumn[]>([]);
  const [loadingColumns, setLoadingColumns] = useState<boolean>(false);
  const [expandedTables, setExpandedTables] = useState<Set<string>>(new Set());
  const [savedQueries, setSavedQueries] = useState<SavedQuery[]>([]);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);
  
  const editorRef = useRef<any>(null);
  const monacoRef = useRef<any>(null);

  useEffect(() => {
    loadTables();
    loadSavedQueries();
  }, []);

  const handleEditorDidMount = (editor: any, monaco: any) => {
    editorRef.current = editor;
    monacoRef.current = monaco;

    monaco.languages.registerCompletionItemProvider('sql', {
      provideCompletionItems: (model: any, position: any) => {
        const word = model.getWordUntilPosition(position);
        const range = {
          startLineNumber: position.lineNumber,
          endLineNumber: position.lineNumber,
          startColumn: word.startColumn,
          endColumn: word.endColumn
        };

        const suggestions: any[] = [];

        const sqlKeywords = [
          'SELECT', 'FROM', 'WHERE', 'INSERT', 'UPDATE', 'DELETE', 'CREATE', 'ALTER', 
          'DROP', 'TABLE', 'INDEX', 'VIEW', 'JOIN', 'INNER', 'LEFT', 'RIGHT', 'OUTER',
          'ON', 'AND', 'OR', 'NOT', 'IN', 'LIKE', 'BETWEEN', 'IS', 'NULL', 'ORDER',
          'BY', 'GROUP', 'HAVING', 'LIMIT', 'OFFSET', 'UNION', 'DISTINCT', 'COUNT',
          'SUM', 'AVG', 'MAX', 'MIN', 'AS', 'WITH', 'CTE'
        ];

        sqlKeywords.forEach(keyword => {
          suggestions.push({
            label: keyword,
            kind: monaco.languages.CompletionItemKind.Keyword,
            insertText: keyword,
            range: range,
            detail: keyword === 'INSERT' || keyword === 'UPDATE' || keyword === 'DELETE' 
              ? '⚠️ Comando de modificação - NÃO PERMITIDO' 
              : 'Palavra-chave SQL',
            documentation: keyword === 'INSERT' || keyword === 'UPDATE' || keyword === 'DELETE'
              ? 'Este comando modifica dados e NÃO é permitido. Apenas consultas SELECT são aceitas.'
              : 'Palavra-chave SQL'
          });
        });

        tables.forEach(table => {
          suggestions.push({
            label: table.table_name,
            kind: monaco.languages.CompletionItemKind.Class,
            insertText: `public.${table.table_name}`,
            range: range,
            detail: 'Tabela',
            documentation: `Tabela: ${table.table_name}`
          });
        });

        if (selectedTable && tableColumns.length > 0) {
          tableColumns.forEach(column => {
            suggestions.push({
              label: column.column_name,
              kind: monaco.languages.CompletionItemKind.Field,
              insertText: column.column_name,
              range: range,
              detail: `${column.data_type}${column.is_nullable === 'YES' ? ' (nullable)' : ''}`,
              documentation: `Coluna da tabela ${selectedTable}`
            });
          });
        }

        return { suggestions };
      }
    });
  };

  const loadTables = async () => {
    setLoadingTables(true);
    try {
      const { data: rpcData, error: rpcError } = await supabase.rpc('list_public_tables');
      
      if (rpcError) {
        const { data: directData, error: directError } = await supabase
          .from('information_schema.tables')
          .select('table_name')
          .eq('table_schema', 'public')
          .eq('table_type', 'BASE TABLE')
          .not('table_name', 'ilike', '_prisma_migrations%')
          .not('table_name', 'ilike', '%_logs%')
          .not('table_name', 'ilike', 'backup_%')
          .order('table_name');
        
        if (directError) throw directError;
        
        if (directData && directData.length > 0) {
          setTables(directData.map((item: any) => ({ table_name: item.table_name, schema: 'public' })));
          toast({ title: "Banco de Dados", description: `${directData.length} tabelas carregadas.` });
        } else {
          setTables([]);
        }
      } else if (rpcData && Array.isArray(rpcData)) {
        setTables(rpcData.map((item: any) => ({ table_name: item.table_name, schema: 'public' })));
      }
    } catch (error: any) {
      console.error('Erro ao carregar tabelas:', error);
      setTables([]);
    } finally {
      setLoadingTables(false);
    }
  };

  const loadTableColumns = async (tableName: string) => {
    if (!tableName) return;
    setLoadingColumns(true);
    setTableColumns([]);
    
    try {
      const { data: rpcData, error: rpcError } = await supabase.rpc('get_table_columns', { table_name: tableName });
      
      if (rpcError) {
        const { data: directData, error: directError } = await supabase
          .from('information_schema.columns')
          .select('column_name, data_type, is_nullable')
          .eq('table_schema', 'public')
          .eq('table_name', tableName)
          .order('ordinal_position');
        
        if (directError) throw directError;
        if (directData) setTableColumns(directData as TableColumn[]);
      } else if (rpcData && Array.isArray(rpcData)) {
        setTableColumns(rpcData as TableColumn[]);
      }
    } catch (error) {
      console.error(error);
      setTableColumns([]);
    } finally {
      setLoadingColumns(false);
    }
  };

  const toggleTableExpand = (tableName: string) => {
    const newExpanded = new Set(expandedTables);
    if (newExpanded.has(tableName)) {
      newExpanded.delete(tableName);
      setSelectedTable('');
      setTableColumns([]);
    } else {
      newExpanded.add(tableName);
      setSelectedTable(tableName);
      loadTableColumns(tableName);
    }
    setExpandedTables(newExpanded);
  };

  const handleTableSelect = (tableName: string) => {
    setSqlQuery(`SELECT * FROM public.${tableName} LIMIT 100;`);
    setEditingId(null);
    setValidationError(null);
    toast({ title: "Template Gerado", description: `Consulta para a tabela ${tableName} criada.` });
  };

  const handleExecuteQuery = async () => {
    if (!sqlQuery.trim()) {
      toast({ title: "Atenção", description: "Digite uma consulta SQL.", variant: "destructive" });
      return;
    }

    // Validar se é apenas SELECT
    const validation = isReadOnlyQuery(sqlQuery);
    if (!validation.valid) {
      setValidationError(validation.message || 'Consulta inválida');
      toast({ 
        title: "Operação não permitida", 
        description: validation.message || 'Apenas consultas SELECT são permitidas.', 
        variant: "destructive" 
      });
      return;
    }

    setValidationError(null);
    setLoading(true);
    setQueryResult([]);
    
    try {
      const { data, error } = await supabase.rpc('execute_sql_query', { query_text: sqlQuery });
      if (error) throw error;
      
      if (data && Array.isArray(data) && data.length > 0) {
        setQueryResult(data);
        toast({ title: "Sucesso", description: `${data.length} registros encontrados.` });
      } else if (data && typeof data === 'object') {
         const resultArray = Array.isArray(data) ? data : [data];
         setQueryResult(resultArray);
         toast({ title: "Sucesso", description: `${resultArray.length} registros encontrados.` });
      } else {
        setQueryResult([]);
        toast({ title: "Sucesso", description: "Consulta executada, mas nenhum retorno encontrado." });
      }
    } catch (error: any) {
      console.error(error);
      toast({ title: "Erro na Query", description: error.message || "Falha na execução.", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadCSV = () => {
    if (queryResult.length === 0) return;
    const headers = Object.keys(queryResult[0]);
    const rows = queryResult.map(row => headers.map(header => {
      const value = row[header];
      if (value == null) return '';
      if (typeof value === 'object') return JSON.stringify(value);
      return String(value);
    }));

    const csvContent = [headers.join(','), ...rows.map(row => row.map(cell => `"${cell.replace(/"/g, '""')}"`).join(','))].join('\n');
    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `consulta_${new Date().toISOString().slice(0,19).replace(/:/g, '-')}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleSaveOrUpdateQuery = () => {
    // Validar antes de salvar
    const validation = isReadOnlyQuery(sqlQuery);
    if (!validation.valid) {
      toast({ 
        title: "Não é possível salvar", 
        description: "Apenas consultas SELECT podem ser salvas.", 
        variant: "destructive" 
      });
      return;
    }

    const isEditing = editingId !== null;
    const currentName = isEditing ? savedQueries.find(q => q.id === editingId)?.name : '';
    
    const name = prompt(isEditing ? 'Atualizar nome da consulta (ou deixe igual):' : 'Nome da consulta:', currentName || `SQL ${new Date().toLocaleDateString('pt-BR')}`);
    if (!name) return;

    if (isEditing) {
      const updated = savedQueries.map(q => q.id === editingId ? { ...q, name, sql: sqlQuery } : q);
      setSavedQueries(updated);
      setEditingId(null);
      toast({ title: "Atualizado", description: "Consulta atualizada com sucesso." });
    } else {
      const newQuery: SavedQuery = { id: Date.now(), name, sql: sqlQuery, created_at: new Date().toISOString() };
      const updated = [...savedQueries, newQuery];
      setSavedQueries(updated);
      toast({ title: "Salvo", description: "Nova consulta salva." });
    }
    localStorage.setItem('relatorio_saved_queries_sql', JSON.stringify(savedQueries));
  };

  const loadSavedQueries = () => {
    const stored = localStorage.getItem('relatorio_saved_queries_sql');
    if (stored) setSavedQueries(JSON.parse(stored));
  };

  const handleLoadQuery = (query: SavedQuery) => {
    setSqlQuery(query.sql);
    setEditingId(query.id);
    setValidationError(null);
    toast({ title: "Carregado", description: `Editando "${query.name}".` });
  };

  const handleRenameQuery = (id: number, currentName: string) => {
    const newName = prompt('Novo nome para a consulta:', currentName);
    if (!newName) return;

    const updated = savedQueries.map(q => q.id === id ? { ...q, name: newName } : q);
    setSavedQueries(updated);
    localStorage.setItem('relatorio_saved_queries_sql', JSON.stringify(updated));
    toast({ title: "Renomeado", description: "Nome da consulta atualizado." });
  };

  const handleDeleteQuery = (id: number) => {
    const updated = savedQueries.filter(q => q.id !== id);
    setSavedQueries(updated);
    localStorage.setItem('relatorio_saved_queries_sql', JSON.stringify(updated));
    if (editingId === id) setEditingId(null);
  };

  const handleClearEdit = () => {
    setEditingId(null);
    toast({ title: "Modo Criação", description: "Novo registro." });
  };

  const getColumnsFromResult = () => queryResult.length > 0 ? Object.keys(queryResult[0]) : [];

  useEffect(() => {
    if (monacoRef.current && editorRef.current) {
      editorRef.current.trigger('keyboard', 'editor.action.triggerSuggest', {});
    }
  }, [tables, tableColumns, selectedTable]);

  return (
    <div className="min-h-screen text-slate-200 font-sans">
      <style>{`body { background-color: #020617; color: #cbd5e1; }`}</style>

      <header className="sticky top-0 z-50 border-b border-slate-800 bg-slate-900/80 backdrop-blur-md">
        <div className="max-w-[1800px] mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => navigate('/dashboard')} className="text-slate-400 hover:text-white">
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div className="flex items-center gap-2 px-3 py-1 rounded bg-slate-800 border border-slate-700">
              <Database className="h-4 w-4 text-blue-400" />
              <span className="font-bold text-sm tracking-wide text-slate-100">RELATORIOS AVANÇADOS</span>
            </div>
            <Badge variant="outline" className="bg-green-500/10 text-green-400 border-green-500/20">
              <Shield className="h-3 w-3 mr-1" />
              READ ONLY
            </Badge>
          </div>
          <div className="flex items-center gap-4 text-xs font-mono text-slate-500">
            <span>Connection: <span className="text-green-400">Active</span></span>
            <span>Schema: <span className="text-blue-400">public</span></span>
          </div>
        </div>
      </header>

      <div className="max-w-[1800px] mx-auto p-4 grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Sidebar - Esquema */}
        <div className="lg:col-span-3 flex flex-col h-[calc(100vh-80px)]">
          <Card className="flex-1 bg-slate-900 border-slate-800 shadow-lg flex flex-col overflow-hidden">
            <CardHeader className="py-3 px-4 border-b border-slate-800 bg-slate-900/50">
              <CardTitle className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-2">
                <TableIcon className="h-3.5 w-3.5" />
                Esquema do Banco
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0 flex-1 overflow-hidden">
              <ScrollArea className="h-full px-2 py-2">
                {loadingTables ? (
                  <div className="flex flex-col items-center justify-center h-32 gap-2 text-slate-500">
                    <Loader2 className="h-5 w-5 animate-spin" />
                    <span className="text-xs">Carregando tabelas...</span>
                  </div>
                ) : tables.length === 0 ? (
                  <div className="text-center py-10 text-slate-600 text-xs">
                    Nenhuma tabela encontrada
                  </div>
                ) : (
                  <div className="space-y-1">
                    {tables.map((table) => (
                      <div key={table.table_name} className="group">
                        <div
                          className={`flex items-center justify-between px-2 py-1.5 rounded-sm cursor-pointer transition-all text-sm ${
                            selectedTable === table.table_name 
                              ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20' 
                              : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'
                          }`}
                          onClick={() => toggleTableExpand(table.table_name)}
                        >
                          <div className="flex items-center gap-2 overflow-hidden">
                            {expandedTables.has(table.table_name) ? (
                              <ChevronDown className="h-3.5 w-3.5 flex-shrink-0" />
                            ) : (
                              <ChevronRight className="h-3.5 w-3.5 flex-shrink-0" />
                            )}
                            <span className="font-mono truncate">{table.table_name}</span>
                          </div>
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-6 w-6 opacity-0 group-hover:opacity-100 text-slate-500 hover:text-blue-400"
                            onClick={(e) => { e.stopPropagation(); handleTableSelect(table.table_name); }}
                          >
                            <Code className="h-3 w-3" />
                          </Button>
                        </div>
                        
                        {expandedTables.has(table.table_name) && (
                          <div className="ml-6 mt-1 space-y-0.5 border-l border-slate-800 pl-2">
                            {loadingColumns && selectedTable === table.table_name ? (
                              <div className="py-2 text-center text-xs text-slate-500">
                                <Loader2 className="h-3 w-3 animate-spin inline-block mr-1" />
                                Loading...
                              </div>
                            ) : (
                              tableColumns.map((col) => (
                                <div key={col.column_name} className="flex items-center justify-between py-1 px-2 text-xs font-mono text-slate-500 hover:text-slate-300 hover:bg-slate-800/50 rounded">
                                  <span className="truncate w-2/3">{col.column_name}</span>
                                  <div className="flex items-center gap-1">
                                    <Badge variant="outline" className="text-[10px] h-4 px-1 border-slate-700 text-slate-400 font-normal">
                                      {col.data_type}
                                    </Badge>
                                    {col.is_nullable === 'YES' && (
                                      <span className="text-[9px] text-slate-600 italic">null</span>
                                    )}
                                  </div>
                                </div>
                              ))
                            )}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </CardContent>
          </Card>
        </div>

        {/* Área Principal */}
        <div className="lg:col-span-9 flex flex-col gap-6">
          
          {/* Aviso de Read-Only */}
          <Alert className="bg-blue-500/10 border-blue-500/20 text-blue-300">
            <Shield className="h-4 w-4" />
            <AlertTitle>Ambiente de Leitura Apenas</AlertTitle>
            <AlertDescription>
              Este ambiente permite apenas consultas SELECT. Comandos de modificação (INSERT, UPDATE, DELETE, CREATE, etc.) são bloqueados por segurança.
            </AlertDescription>
          </Alert>

          {/* Barra de Consultas Salvas */}
          {savedQueries.length > 0 && (
            <div className="bg-slate-900/50 border border-slate-800 rounded-lg p-3">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <Save className="h-3.5 w-3.5 text-slate-400" />
                  <span className="text-xs font-bold text-slate-400 uppercase">Consultas Salvas</span>
                </div>
                {editingId && (
                   <Button onClick={handleClearEdit} variant="ghost" size="sm" className="h-6 px-2 text-[10px] text-slate-400 hover:text-white">
                    <X className="h-3 w-3 mr-1" /> Cancelar Edição
                   </Button>
                )}
              </div>
              <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
                {savedQueries.map((q) => (
                  <button
                    key={q.id}
                    onClick={() => handleLoadQuery(q)}
                    className={`flex-shrink-0 group flex items-center gap-2 px-3 py-1.5 border rounded-md transition-all text-xs ${
                      editingId === q.id 
                        ? 'bg-blue-900/30 border-blue-500/50 text-blue-200' 
                        : 'bg-slate-800 hover:bg-slate-700 border-slate-700 hover:border-slate-600 text-slate-300'
                    }`}
                  >
                    <FileCode className="h-3 w-3" />
                    <span className="max-w-[150px] truncate">{q.name}</span>
                    
                    <Pencil 
                      className="h-3 w-3 text-slate-500 hover:text-yellow-400 ml-1"
                      onClick={(e) => { e.stopPropagation(); handleRenameQuery(q.id, q.name); }}
                      title="Renomear"
                    />
                    
                    <Trash2 
                      className="h-3 w-3 text-slate-500 hover:text-red-400 ml-1"
                      onClick={(e) => { e.stopPropagation(); handleDeleteQuery(q.id); }}
                      title="Excluir"
                    />
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Editor SQL com Monaco */}
          <div className="bg-slate-900 border border-slate-800 rounded-lg shadow-xl overflow-hidden">
            <CardHeader className="py-3 px-4 border-b border-slate-800 bg-slate-950 flex flex-row items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2">
                  <Code className="h-4 w-4 text-blue-400" />
                  <CardTitle className="text-sm font-semibold text-slate-200">Editor de Consulta</CardTitle>
                </div>
                {editingId && (
                   <Badge variant="secondary" className="h-5 px-2 text-[10px] bg-blue-500/10 text-blue-400 border-blue-500/20 animate-pulse">
                    Editando: {savedQueries.find(q => q.id === editingId)?.name}
                   </Badge>
                )}
              </div>
              
              <div className="flex items-center gap-2">
                <Button onClick={handleSaveOrUpdateQuery} variant="ghost" size="sm" className="h-8 px-3 text-slate-400 hover:text-white hover:bg-slate-800">
                  <Save className="h-3.5 w-3.5 mr-1.5" />
                  {editingId ? "Atualizar" : "Salvar"}
                </Button>
                <Separator orientation="vertical" className="h-5 bg-slate-700" />
                <Button 
                  onClick={handleExecuteQuery} 
                  disabled={loading} 
                  className="h-8 px-4 bg-blue-600 hover:bg-blue-500 text-white font-medium text-xs shadow-lg shadow-blue-900/20"
                >
                  {loading ? <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" /> : <Play className="mr-2 h-3.5 w-3.5 fill-current" />}
                  Executar Query
                </Button>
              </div>
            </CardHeader>
            
            {validationError && (
              <div className="mx-4 mt-2 p-2 bg-red-500/10 border border-red-500/20 rounded-md">
                <div className="flex items-center gap-2 text-red-400 text-xs">
                  <AlertTriangle className="h-3 w-3" />
                  <span className="font-mono">{validationError}</span>
                </div>
              </div>
            )}
            
            <Editor
              height="350px"
              language="sql"
              theme="vs-dark"
              value={sqlQuery}
              onChange={(value) => {
                setSqlQuery(value || '');
                // Limpa o erro de validação quando o usuário modifica a query
                if (validationError) setValidationError(null);
              }}
              onMount={handleEditorDidMount}
              options={{
                minimap: { enabled: false },
                fontSize: 13,
                fontFamily: 'monospace',
                lineNumbers: 'on',
                roundedSelection: false,
                scrollBeyondLastLine: false,
                automaticLayout: true,
                suggestOnTriggerCharacters: true,
                quickSuggestions: true,
                acceptSuggestionOnEnter: 'on',
                snippetSuggestions: 'top',
                wordBasedSuggestions: true,
                parameterHints: { enabled: true },
                formatOnPaste: true,
                formatOnType: true,
                renderWhitespace: 'selection',
                tabSize: 2,
                scrollbar: {
                  vertical: 'visible',
                  horizontal: 'visible',
                  useShadows: false,
                  verticalScrollbarSize: 10,
                  horizontalScrollbarSize: 10
                }
              }}
            />
          </div>

          {/* Resultados */}
          {queryResult.length > 0 && (
            <div className="flex-1 flex flex-col bg-slate-900 border border-slate-800 rounded-lg shadow-xl overflow-hidden min-h-[300px]">
              <div className="px-4 py-2 bg-slate-950 border-b border-slate-800 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Eye className="h-4 w-4 text-green-400" />
                  <span className="text-xs font-semibold text-slate-300">Resultado da Consulta</span>
                  <Badge variant="secondary" className="h-5 px-1.5 text-[10px] font-mono bg-slate-800 text-slate-400 border-slate-700">
                    {queryResult.length} rows
                  </Badge>
                  <Badge variant="secondary" className="h-5 px-1.5 text-[10px] font-mono bg-slate-800 text-slate-400 border-slate-700">
                    {getColumnsFromResult().length} cols
                  </Badge>
                </div>
                <Button onClick={handleDownloadCSV} variant="outline" size="sm" className="h-7 px-2 text-xs text-slate-300 border-slate-700 hover:bg-slate-800 hover:text-white">
                  <Download className="h-3.5 w-3.5 mr-1.5" />
                  Exportar CSV
                </Button>
              </div>
              
              <div className="flex-1 overflow-auto bg-slate-950 max-h-[600px]">
                <Table>
                  <TableHeader className="bg-slate-900 sticky top-0 shadow-sm z-10">
                    <TableRow>
                      {getColumnsFromResult().map((col) => (
                        <TableHead key={col} className="px-4 py-2 text-[11px] font-bold text-slate-400 uppercase tracking-wider font-mono border-b border-slate-800">
                          {col}
                        </TableHead>
                      ))}
                    </TableRow>
                  </TableHeader>
                  <TableBody className="font-mono text-xs text-slate-300">
                    {queryResult.map((row, idx) => (
                      <TableRow key={idx} className="hover:bg-slate-900/50 border-b border-slate-800/50 last:border-0">
                        {getColumnsFromResult().map((col) => (
                          <TableCell key={col} className="px-4 py-2 max-w-[200px] truncate">
                            {row[col] != null 
                              ? typeof row[col] === 'object' 
                                ? <span className="text-slate-500 italic">{JSON.stringify(row[col])}</span>
                                : String(row[col])
                              : <span className="text-slate-600 italic">null</span>}
                          </TableCell>
                        ))}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          )}

          {queryResult.length === 0 && !loading && (
             <div className="flex-1 flex items-center justify-center border-2 border-dashed border-slate-800 rounded-lg bg-slate-900/30 min-h-[300px]">
                <div className="text-center p-8">
                  <div className="w-16 h-16 bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Code className="h-8 w-8 text-slate-600" />
                  </div>
                  <h3 className="text-lg font-medium text-slate-300">Pronto para consultar</h3>
                  <p className="text-sm text-slate-500 mt-2 max-w-sm mx-auto">
                    Digite uma consulta SQL no editor acima ou selecione uma tabela na lateral para começar.
                    <br />
                    <span className="text-xs text-blue-400 mt-2 block">
                      💡 Dica: O editor sugere automaticamente palavras-chave, tabelas e colunas enquanto você digita!
                    </span>
                    <span className="text-xs text-yellow-500 mt-2 block">
                      ⚠️ Apenas consultas SELECT são permitidas por segurança.
                    </span>
                  </p>
                </div>
             </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default RelatorioDinamico;