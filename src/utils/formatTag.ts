// src/utils/formatTag.ts

export const formatTag = (value: string): string => {
  // Remove tudo que não for letra ou número
  const cleanValue = value.replace(/[^A-Za-z0-9]/g, '');

  // Separa letras iniciais e números
  const letters = cleanValue.match(/^[A-Za-z]+/)?.[0] || '';
  const numbers = cleanValue.slice(letters.length);

  // Limita letras a 5 caracteres (ex: ESTAB não é válido)
  const maxLetters = 5;
  const formattedLetters = letters.slice(0, maxLetters).toUpperCase();

  // Se tem letras e não tem hífen, adiciona
  if (formattedLetters && !numbers.includes('-')) {
    return `${formattedLetters}-${numbers}`;
  }

  // Se já tem hífen, mantém e limpa possíveis hífens extras
  if (formattedLetters && numbers.includes('-')) {
    const cleanNumbers = numbers.replace('-', '');
    return `${formattedLetters}-${cleanNumbers}`;
  }

  // Caso contrário, retorna apenas as letras com hífen se houver algo
  return formattedLetters ? `${formattedLetters}-` : '';
};