-- Create tables for operations management system

-- Table: RegistroOperações
CREATE TABLE public.registro_operacoes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  op TEXT NOT NULL,
  data DATE NOT NULL,
  hora_inicial TIME,
  hora_final TIME,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Table: Equipamentos
CREATE TABLE public.equipamentos (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  registro_operacoes_id UUID REFERENCES public.registro_operacoes(id) ON DELETE CASCADE NOT NULL,
  local TEXT NOT NULL,
  carga TEXT,
  tag TEXT NOT NULL,
  motorista_operador TEXT,
  horas_operando DECIMAL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Table: Ajudantes
CREATE TABLE public.ajudantes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  registro_operacoes_id UUID REFERENCES public.registro_operacoes(id) ON DELETE CASCADE NOT NULL,
  nome TEXT NOT NULL,
  data DATE NOT NULL,
  hora_inicial TIME,
  hora_final TIME,
  local TEXT,
  observacao TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Table: Ausencias
CREATE TABLE public.ausencias (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  registro_operacoes_id UUID REFERENCES public.registro_operacoes(id) ON DELETE CASCADE NOT NULL,
  nome TEXT NOT NULL,
  data DATE NOT NULL,
  hora_inicial TIME,
  hora_final TIME,
  local TEXT,
  justificado BOOLEAN DEFAULT false,
  obs TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Table: Navios
CREATE TABLE public.navios (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  nome_navio TEXT NOT NULL,
  carga TEXT NOT NULL,
  berco TEXT,
  quantidade DECIMAL,
  cbs INTEGER,
  inicio TIMESTAMP WITH TIME ZONE,
  final TIMESTAMP WITH TIME ZONE,
  media_cb DECIMAL,
  concluido BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create profiles table for user management
CREATE TABLE public.profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  full_name TEXT,
  active BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.registro_operacoes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.equipamentos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ajudantes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ausencias ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.navios ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- RLS Policies for registro_operacoes
CREATE POLICY "Users can view their own operations" 
ON public.registro_operacoes 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own operations" 
ON public.registro_operacoes 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own operations" 
ON public.registro_operacoes 
FOR UPDATE 
USING (auth.uid() = user_id);

-- RLS Policies for equipamentos
CREATE POLICY "Users can view equipamentos from their operations" 
ON public.equipamentos 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.registro_operacoes 
    WHERE id = equipamentos.registro_operacoes_id 
    AND user_id = auth.uid()
  )
);

CREATE POLICY "Users can create equipamentos for their operations" 
ON public.equipamentos 
FOR INSERT 
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.registro_operacoes 
    WHERE id = equipamentos.registro_operacoes_id 
    AND user_id = auth.uid()
  )
);

-- RLS Policies for ajudantes
CREATE POLICY "Users can view ajudantes from their operations" 
ON public.ajudantes 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.registro_operacoes 
    WHERE id = ajudantes.registro_operacoes_id 
    AND user_id = auth.uid()
  )
);

CREATE POLICY "Users can create ajudantes for their operations" 
ON public.ajudantes 
FOR INSERT 
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.registro_operacoes 
    WHERE id = ajudantes.registro_operacoes_id 
    AND user_id = auth.uid()
  )
);

-- RLS Policies for ausencias
CREATE POLICY "Users can view ausencias from their operations" 
ON public.ausencias 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.registro_operacoes 
    WHERE id = ausencias.registro_operacoes_id 
    AND user_id = auth.uid()
  )
);

CREATE POLICY "Users can create ausencias for their operations" 
ON public.ausencias 
FOR INSERT 
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.registro_operacoes 
    WHERE id = ausencias.registro_operacoes_id 
    AND user_id = auth.uid()
  )
);

-- RLS Policies for navios (public read access)
CREATE POLICY "Users can view all navios" 
ON public.navios 
FOR SELECT 
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Users can create navios" 
ON public.navios 
FOR INSERT 
WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Users can update navios" 
ON public.navios 
FOR UPDATE 
USING (auth.uid() IS NOT NULL);

-- RLS Policies for profiles
CREATE POLICY "Users can view all profiles" 
ON public.profiles 
FOR SELECT 
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Users can insert their own profile" 
ON public.profiles 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own profile" 
ON public.profiles 
FOR UPDATE 
USING (auth.uid() = user_id);

-- Function to handle new user signups
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, full_name, active)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data ->> 'full_name', NEW.email),
    false
  );
  RETURN NEW;
END;
$$;

-- Trigger to create profile on signup
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Add triggers for updated_at
CREATE TRIGGER update_registro_operacoes_updated_at
  BEFORE UPDATE ON public.registro_operacoes
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_equipamentos_updated_at
  BEFORE UPDATE ON public.equipamentos
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_ajudantes_updated_at
  BEFORE UPDATE ON public.ajudantes
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_ausencias_updated_at
  BEFORE UPDATE ON public.ausencias
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_navios_updated_at
  BEFORE UPDATE ON public.navios
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();